import { env } from 'cloudflare:workers';
import { database } from './raw';
import { activeSubscription } from './billing';
export async function membershipFor(owner:string){
  const email=(env as unknown as Record<string,string>).MIXNOTES_FOUNDER_EMAIL?.trim().toLowerCase();
  if(email){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(email));const founder=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');if(owner===founder)return {plan:'founder' as const,fullAccess:true};}
  if((await activeSubscription(owner))?.active)return {plan:'pro' as const,fullAccess:true};
  return {plan:'free' as const,fullAccess:false};
}
export class PlanError extends Error {}
export async function enforcePlan(owner:string,action:{type:string;inputs?:unknown[];id?:string;input?:Record<string,unknown>;backup?:{tracks:unknown[];sets:{status:string}[]}}){
  if((await membershipFor(owner)).fullAccess)return;
  if(['track.create','tracks.import','tracks.audio.import','backup.import','set.create','set.update'].includes(action.type)){
    const counts=await database().prepare('SELECT (SELECT COUNT(*) FROM tracks WHERE owner_id=?) AS tracks,(SELECT COUNT(*) FROM mix_sets WHERE owner_id=? AND status!=\'performed\') AS sets').bind(owner,owner).first<{tracks:number;sets:number}>();
    let added=action.inputs?.length||0;
    if(['tracks.import','tracks.audio.import'].includes(action.type)){
      const rows=await database().prepare('SELECT title,artist,version FROM tracks WHERE owner_id=?').bind(owner).all<{title:string;artist:string;version:string}>();
      const key=(t:Record<string,unknown>)=>JSON.stringify(['title','artist','version'].map(k=>String(t[k]||'').trim().toLocaleLowerCase('tr-TR')));
      const seen=new Set(rows.results.map(key));added=0;for(const item of action.inputs||[]){const signature=key(item as Record<string,unknown>);if(!seen.has(signature)){seen.add(signature);added++;}}
    }
    if((action.type==='track.create' &&(counts?.tracks||0)>=200)||(['tracks.import','tracks.audio.import'].includes(action.type)&&(counts?.tracks||0)+added>200)||(action.type==='backup.import'&&((counts?.tracks||0)+(action.backup?.tracks.length||0)>200||(counts?.sets||0)+(action.backup?.sets.filter(s=>s.status!=='performed').length||0)>3)))throw new PlanError('Free plan sınırına ulaştın. Mevcut kayıtların korunur.');
    if((action.type==='set.create'&&action.input?.status!=='performed'||action.type==='set.update'&&action.input?.status!=='performed'&&(await database().prepare('SELECT status FROM mix_sets WHERE owner_id=? AND id=?').bind(owner,action.id||'').first<{status:string}>())?.status==='performed')&&(counts?.sets||0)>=3)throw new PlanError('Free planda 3 aktif set kullanılabilir.');
  }
}
