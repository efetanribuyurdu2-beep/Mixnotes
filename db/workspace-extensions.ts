import type { AuditionSettings } from "../lib/transition-audio";
import type { z } from "zod";
import type { LinkMetadata, SmartRule, Session, TrackInput } from "../lib/workspace-types";
import type { backupSchema, sessionInputSchema } from "../lib/workspace-validation";

export class ExtensionError extends Error { status: number; constructor(message: string,status=400){super(message);this.status=status;} }

export async function readExtensions(db:D1Database,ownerId:string) {
  const [rules,sessions,metadata,audioSettings,preferences]=await Promise.all([
    db.prepare("SELECT crate_id,payload FROM smart_crate_rules WHERE owner_id=?").bind(ownerId).all<{crate_id:string;payload:string}>(),
    db.prepare("SELECT payload FROM practice_sessions WHERE owner_id=? ORDER BY created_at DESC").bind(ownerId).all<{payload:string}>(),
    db.prepare("SELECT track_id,payload FROM track_link_metadata WHERE owner_id=?").bind(ownerId).all<{track_id:string;payload:string}>(),
    db.prepare("SELECT transition_id,payload FROM transition_audio_settings WHERE owner_id=?").bind(ownerId).all<{transition_id:string;payload:string}>(),
    db.prepare("SELECT avatar_id,language FROM user_preferences WHERE owner_id=?").bind(ownerId).first<{avatar_id:import("../lib/avatars").AvatarId|null;language:string}>()
  ]);
  return { preferences, audioSettings:new Map(audioSettings.results.map(r=>[r.transition_id,JSON.parse(r.payload) as AuditionSettings])), metadata:new Map(metadata.results.map(r=>[r.track_id,JSON.parse(r.payload) as LinkMetadata])), rules:new Map(rules.results.map(r=>[r.crate_id,JSON.parse(r.payload) as SmartRule])), sessions:sessions.results.map(r=>JSON.parse(r.payload) as Session) };
}

function insert(db:D1Database,table:string,record:Record<string,unknown>) {
  // All tables and column names are fixed by the callers below, never request input.
  return db.prepare(`INSERT INTO ${table} (${Object.keys(record).join(',')}) VALUES (${Object.keys(record).map(()=>'?').join(',')})`).bind(...Object.values(record));
}
export function trackStatement(db:D1Database,ownerId:string,id:string,input:TrackInput,now:string) {
  return insert(db,"tracks",{owner_id:ownerId,id,title:input.title,artist:input.artist,version:input.version,bpm:input.bpm,musical_key:input.musicalKey,genre:input.genre,subgenre:input.subgenre,energy:input.energy,rating:input.rating,tags:JSON.stringify(input.tags),origin:input.origin,notes:input.notes,cue_notes:input.cueNotes,intro_notes:input.introNotes,outro_notes:input.outroNotes,duration_seconds:input.durationSeconds,label:input.label,date_added:now,updated_at:now,revision:1});
}
export async function importTracks(db:D1Database,ownerId:string,inputs:TrackInput[],allowExisting=false) {
  const existing=await db.prepare("SELECT title,artist,version FROM tracks WHERE owner_id=?").bind(ownerId).all<{title:string;artist:string;version:string}>();
  const key=(t:{title:string;artist:string;version:string})=>JSON.stringify([t.title,t.artist,t.version].map(s=>s.trim().toLocaleLowerCase("tr-TR")));
  const seen=new Set(existing.results.map(key));
  const now=new Date().toISOString(), statements:D1PreparedStatement[]=[];
  for(const input of inputs){
    if(seen.has(key(input)))continue;
    seen.add(key(input));const id=crypto.randomUUID();
    statements.push(trackStatement(db,ownerId,id,input,now));
    if(input.linkMetadata)statements.push(insert(db,"track_link_metadata",{owner_id:ownerId,track_id:id,payload:JSON.stringify(input.linkMetadata)}));
    if(input.sourceUrl) statements.push(insert(db,"track_sources",{owner_id:ownerId,id:`${id}:primary`,track_id:id,provider:input.sourceProvider||"Web",external_id:"",external_url:input.sourceUrl,availability:"reference",purchase_url:"",created_at:now}));
  }
  if(!statements.length){if(allowExisting)return;throw new ExtensionError("Bu parçalar zaten Library’de kayıtlı.");}
  await db.batch(statements);
}

export async function createSession(db:D1Database,ownerId:string,input:z.infer<typeof sessionInputSchema>) {
  const set=input.setId ? await db.prepare("SELECT title FROM mix_sets WHERE owner_id=? AND id=?").bind(ownerId,input.setId).first<{title:string}>():null;
  const transition=input.transitionId ? await db.prepare("SELECT from_label,to_label FROM transitions WHERE owner_id=? AND id=?").bind(ownerId,input.transitionId).first<{from_label:string;to_label:string}>():null;
  if(input.setId&&!set || input.transitionId&&!transition)throw new ExtensionError("Set veya geçiş bulunamadı.",404);
  const now=new Date().toISOString();
  const session:Session={...input,id:crypto.randomUUID(),createdAt:now,setTitle:set?.title??"",transitionLabel:transition?`${transition.from_label} → ${transition.to_label}`:""};
  const statements=[insert(db,"practice_sessions",{owner_id:ownerId,id:session.id,payload:JSON.stringify(session),created_at:now})];
  if(input.transitionId) statements.push(db.prepare("UPDATE transitions SET last_practiced=CASE WHEN last_practiced<? THEN ? ELSE last_practiced END, updated_at=?,revision=revision+1 WHERE owner_id=? AND id=?").bind(input.date,input.date,now,ownerId,input.transitionId));
  if(input.kind==="performance"&&input.setId)statements.push(db.prepare("UPDATE mix_sets SET status='performed',updated_at=?,revision=revision+1 WHERE owner_id=? AND id=?").bind(now,ownerId,input.setId));
  await db.batch(statements);
}

export async function restoreBackup(db:D1Database,ownerId:string,backup:z.infer<typeof backupSchema>) {
  const digestBytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(backup)));
  const digest=Array.from(new Uint8Array(digestBytes),b=>b.toString(16).padStart(2,'0')).join('');
  if(await db.prepare("SELECT digest FROM workspace_imports WHERE owner_id=? AND digest=?").bind(ownerId,digest).first())throw new ExtensionError("Bu yedek daha önce içe aktarıldı.",409);
  const mapping=new Map<string,string>();for(const group of [backup.tracks,backup.crates,backup.sets,backup.transitions,backup.sessions])for(const row of group)mapping.set(row.id,crypto.randomUUID());
  const mapped=(id:string|null)=>id?mapping.get(id)??null:null;
  const now=new Date().toISOString();
  const statements:D1PreparedStatement[]=[insert(db,"workspace_imports",{owner_id:ownerId,digest})];
  for(const t of backup.tracks){
    const id=mapped(t.id)!;statements.push(trackStatement(db,ownerId,id,{...t,sourceProvider:"",sourceUrl:""},now));
    if(t.linkMetadata)statements.push(insert(db,"track_link_metadata",{owner_id:ownerId,track_id:id,payload:JSON.stringify(t.linkMetadata)}));
    for(const s of t.sources)statements.push(insert(db,"track_sources",{owner_id:ownerId,id:crypto.randomUUID(),track_id:id,provider:s.provider,external_id:s.externalId,external_url:s.externalUrl,availability:s.availability,purchase_url:s.purchaseUrl,created_at:now}));
  }
  for(const c of backup.crates){const id=mapped(c.id)!;statements.push(insert(db,"crates",{owner_id:ownerId,id,name:c.name,description:c.description,created_at:now,updated_at:now,revision:1}));if(c.rules)statements.push(insert(db,"smart_crate_rules",{owner_id:ownerId,crate_id:id,payload:JSON.stringify(c.rules)}));else for(const [position,trackId]of c.trackIds.entries())statements.push(insert(db,"crate_tracks",{owner_id:ownerId,crate_id:id,track_id:mapped(trackId),position,added_at:now}));}
  for(const s of backup.sets){const id=mapped(s.id)!;statements.push(insert(db,"mix_sets",{owner_id:ownerId,id,title:s.title,genre:s.genre,event_date:s.eventDate,notes:s.notes,status:s.status,created_at:now,updated_at:now,revision:1}));for(const [position,t]of s.tracks.entries())statements.push(insert(db,"set_tracks",{owner_id:ownerId,set_id:id,track_id:mapped(t.trackId),position,notes:t.notes,added_at:now}));}
  for(const t of backup.transitions)statements.push(insert(db,"transitions",{owner_id:ownerId,id:mapped(t.id),from_track_id:mapped(t.fromTrackId),to_track_id:mapped(t.toTrackId),from_label:t.fromLabel,to_label:t.toLabel,transition_type:t.transitionType,mix_out_point:t.mixOutPoint,mix_in_point:t.mixInPoint,eq_technique:t.eqTechnique,fx_notes:t.fxNotes,timing_notes:t.timingNotes,notes:t.notes,rating:t.rating,difficulty:t.difficulty,practice_status:t.practiceStatus,last_practiced:t.lastPracticed,created_at:now,updated_at:now,revision:1}));
  for(const t of backup.transitions) if(t.audioSettings) statements.push(insert(db,"transition_audio_settings",{owner_id:ownerId,transition_id:mapped(t.id),payload:JSON.stringify(t.audioSettings)}));
  const setIds=new Set(backup.sets.map(s=>s.id)), transitionIds=new Set(backup.transitions.map(t=>t.id));
  for(const s of backup.sessions){const payload={...s,id:mapped(s.id)!,setId:s.setId&&setIds.has(s.setId)?mapped(s.setId):null,transitionId:s.transitionId&&transitionIds.has(s.transitionId)?mapped(s.transitionId):null};statements.push(insert(db,"practice_sessions",{owner_id:ownerId,id:payload.id,payload:JSON.stringify(payload),created_at:s.createdAt}));}
  if(statements.length>2000)throw new ExtensionError("Yedek tek işlem için fazla büyük (2000 kayıt bağlantısı sınırı).");
  // D1 batch is transactional: the receipt and the complete import either both commit or both roll back.
  await db.batch(statements);
}

export async function addSource(db:D1Database,ownerId:string,trackId:string,input:{provider:string;url:string;availability:string}) {
  const exists=await db.prepare("SELECT id FROM tracks WHERE owner_id=? AND id=?").bind(ownerId,trackId).first();
  if(!exists)throw new ExtensionError("Parça bulunamadı.",404);
  const sources=await db.prepare("SELECT id FROM track_sources WHERE owner_id=? AND track_id=?").bind(ownerId,trackId).all();
  if(sources.results.length>=10)throw new ExtensionError("Bir parçaya en fazla 10 kaynak eklenebilir.");
  const duplicate=await db.prepare("SELECT id FROM track_sources WHERE owner_id=? AND track_id=? AND external_url=?").bind(ownerId,trackId,input.url).first();
  if(duplicate)throw new ExtensionError("Bu kaynak zaten kayıtlı.");
  await insert(db,"track_sources",{owner_id:ownerId,id:crypto.randomUUID(),track_id:trackId,provider:input.provider,external_id:"",external_url:input.url,availability:input.availability,purchase_url:input.availability==="purchase"?input.url:"",created_at:new Date().toISOString()}).run();
}
