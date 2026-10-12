import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { build } from 'esbuild';

async function moduleFrom(entry,plugins=[]){const result=await build({entryPoints:[entry],bundle:true,write:false,format:'esm',platform:'node',plugins});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));}
const mockedCloudflare={name:'cloudflare-test',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'workers',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const env={get DB(){return globalThis.testDatabase}};',loader:'js'}));}};
const core=await moduleFrom('db/workspace.ts',[mockedCloudflare]);
const extensions=await moduleFrom('db/workspace-extensions.ts');
const logic=await moduleFrom('lib/dj-logic.ts');
const transfer=await moduleFrom('lib/track-transfer.ts');
const validation=await moduleFrom('lib/workspace-validation.ts');
function database(){
  const sql=new DatabaseSync(':memory:');
  const db={prepare(query){return{query,args:[],bind(...args){return {...this,args};},async all(){return{results:sql.prepare(query).all(...this.args)};},async first(){return sql.prepare(query).get(...this.args)??null;},async run(){return{meta:{changes:Number(sql.prepare(query).run(...this.args).changes)}};}};},async batch(statements){sql.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sql.exec('COMMIT');return results;}catch(error){sql.exec('ROLLBACK');throw error;}}};
  for(const query of core.schemaStatements)sql.exec(query);
  globalThis.testDatabase=db;
  return{sql,db};
}
const input=(overrides={})=>validation.importedTrackSchema.parse({title:'Track',artist:'Artist',bpm:122,musicalKey:'8A',genre:'Afro House',energy:3,rating:4,tags:['warm-up'],...overrides});
const track=(id,overrides={})=>({...input(),id,sources:[],dateAdded:'2026-10-11',updatedAt:'2026-10-11',revision:1,...overrides});
const rules={genre:'afro',tag:'warm-up',bpmMin:120,bpmMax:124,energyMin:2,ratingMin:3,origin:'library'};

test('Smart Crates enforce all rules and exclude missing numeric metadata',()=>{
 assert.equal(logic.matchesRule(track('a'),rules),true);
 assert.equal(logic.matchesRule(track('a',{bpm:null}),rules),false);
 assert.equal(logic.matchesRule(track('a',{origin:'discovery'}),rules),false);
 assert.equal(logic.matchesRule(track('a',{tags:['peak']}),rules),false);
 assert.equal(validation.smartRuleSchema.safeParse({...rules,bpmMin:130,bpmMax:120}).success,false);
});
test('Next-track suggestions prefer prepared memory, exclude discovery, and handle the Camelot wrap',()=>{
 assert.equal(logic.camelotCompatible('12A','1A'),true);
 assert.equal(logic.camelotCompatible('8A','8B'),true);
 assert.equal(logic.camelotCompatible('8A','9B'),false);
 assert.equal(logic.camelotCompatible('A minor',''),null);
 const candidates=[track('near'),track('memory',{bpm:130}),track('candidate',{origin:'discovery'})];
 const result=logic.recommendNext(track('from'),candidates,[{fromTrackId:'from',toTrackId:'memory',practiceStatus:'ready'}]);
 assert.equal(result[0].track.id,'memory');assert.ok(result[0].reasons.includes('Provası hazır geçiş'));assert.ok(!result.some(r=>r.track.id==='candidate'));
});
test('CSV and Rekordbox TSV import handle quotes, BOM, decimal comma, and reject broken data',()=>{
 const result=transfer.parseTrackFile('\uFEFFTrack Title\tArtist\tBPM\tKey\tTime\n"Track, \"\"Remix\"\""\tArtist\t122,5\t8A\t04:32\n');
 assert.equal(result[0].title,'Track, "Remix"');assert.equal(result[0].bpm,122.5);assert.equal(result[0].durationSeconds,272);
 assert.throws(()=>transfer.parseTrackFile('title,bpm\nA,nope'),/Satır 2/);
 assert.throws(()=>transfer.parseTrackFile('title\n"unfinished'),/tırnak/);
 assert.ok(transfer.tracksCsv([track('a',{title:'=HYPERLINK("bad")'})]).includes("'=HYPERLINK"));
});
test('Imported tracks deduplicate within an owner, not across owners',async()=>{
 const {sql,db}=database();await extensions.importTracks(db,'alice',[input(),input()]);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM tracks').get().n,1);
 await extensions.importTracks(db,'bob',[input()]);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM tracks').get().n,2);
 await assert.rejects(()=>extensions.importTracks(db,'alice',[input()]),/zaten/);
});
test('Smart membership updates after a track change; stale edits cannot replace rules',async()=>{
 const {db}=database();await extensions.importTracks(db,'alice',[input()]);
 await core.createCrate('alice',{name:'Smart',description:'',rules});
 let w=await core.readWorkspace({id:'alice',displayName:'DJ',isAutomation:false});
 assert.equal(w.crates[0].trackIds.length,1);
 const crate=w.crates[0],t=w.tracks[0];
 await core.updateCrate('alice',crate.id,crate.revision,{name:'Updated',description:'',rules:{...rules,genre:'house'}});
 await assert.rejects(()=>core.updateCrate('alice',crate.id,crate.revision,{name:'Stale',description:'',rules:null}),/başka/);
 w=await core.readWorkspace({id:'alice',displayName:'DJ',isAutomation:false});assert.equal(w.crates[0].rules.genre,'house');
 await core.updateTrack('alice',t.id,t.revision,{...input(),bpm:140});
 w=await core.readWorkspace({id:'alice',displayName:'DJ',isAutomation:false});assert.equal(w.crates[0].trackIds.length,0);
 await assert.rejects(()=>core.addTrackToCrate('alice',crate.id,t.id),/kurallarla/);
});
test('Sessions persist, update performance state, and reject another owner’s set',async()=>{
 const {sql,db}=database();await core.createSet('alice',{title:'Set',genre:'Afro',eventDate:'',notes:'',status:'draft'});
 const set=sql.prepare('SELECT id FROM mix_sets').get();
 const session={kind:'performance',date:'2026-10-11',durationMinutes:30,setId:set.id,transitionId:null,rating:4,notes:'Bass swap'};
 await assert.rejects(()=>extensions.createSession(db,'bob',session),/bulunamadı/);
 await extensions.createSession(db,'alice',session);
 const w=await core.readWorkspace({id:'alice',displayName:'DJ',isAutomation:false});assert.equal(w.sessions[0].setTitle,'Set');assert.equal(w.sets[0].status,'performed');
 assert.equal(validation.sessionInputSchema.safeParse({...session,date:'2026-02-31'}).success,false);
});
test('Full backup import remaps relationships, preserves current data and is idempotent',async()=>{
 const {sql,db}=database();await extensions.importTracks(db,'alice',[input()]);
 const uuid=()=>crypto.randomUUID(),a=uuid(),b=uuid(),set=uuid(),crate=uuid(),transition=uuid();
 const backup=validation.backupSchema.parse({format:'mixnotes-workspace',version:4,tracks:[track(a),track(b,{title:'Track B'})],crates:[{id:crate,name:'Crate',description:'',trackIds:[a,b],rules:null}],sets:[{id:set,title:'Restored',genre:'',eventDate:'',notes:'',status:'ready',tracks:[{trackId:a,position:0,notes:''},{trackId:b,position:1,notes:''}]}],transitions:[{id:transition,fromTrackId:a,toTrackId:b,fromLabel:'A',toLabel:'B',transitionType:'EQ',mixOutPoint:'',mixInPoint:'',eqTechnique:'',fxNotes:'',timingNotes:'',notes:'',rating:4,difficulty:2,practiceStatus:'ready',lastPracticed:''}],sessions:[{id:uuid(),kind:'practice',date:'2026-10-11',durationMinutes:20,setId:set,transitionId:transition,rating:4,notes:'',setTitle:'Restored',transitionLabel:'A → B',createdAt:'2026-10-11T00:00:00.000Z'}]});
 await extensions.restoreBackup(db,'alice',backup);
 const w=await core.readWorkspace({id:'alice',displayName:'DJ',isAutomation:false});
 assert.equal(w.tracks.length,3);assert.notEqual(w.sets[0].id,set);assert.equal(w.sets[0].tracks[0].trackId,w.transitions[0].fromTrackId);assert.equal(w.sessions[0].setId,w.sets[0].id);
 await assert.rejects(()=>extensions.restoreBackup(db,'alice',backup),/daha önce/);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM tracks').get().n,3);
 const malformed=structuredClone(backup);malformed.sets[0].tracks[0].trackId=uuid();assert.equal(validation.backupSchema.safeParse(malformed).success,false);
});
test('Backup transaction rolls back if any child insert fails',async()=>{
 const {sql,db}=database();const a=crypto.randomUUID(),c=crypto.randomUUID();
 const backup=validation.backupSchema.parse({format:'mixnotes-workspace',version:4,tracks:[track(a)],crates:[{id:c,name:'C',description:'',trackIds:[a,a],rules:null}],sets:[],transitions:[],sessions:[]});
 await assert.rejects(()=>extensions.restoreBackup(db,'alice',backup));
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM tracks').get().n,0);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM workspace_imports').get().n,0);
});
test('Track sources remain private and reject duplicate URLs',async()=>{
 const {db}=database();await extensions.importTracks(db,'alice',[input()]);const w=await core.readWorkspace({id:'alice',displayName:'DJ',isAutomation:false});const id=w.tracks[0].id;
 const source={provider:'Beatport',url:'https://www.beatport.com/track/example/1',availability:'purchase'};
 await assert.rejects(()=>extensions.addSource(db,'bob',id,source),/bulunamadı/);
 await extensions.addSource(db,'alice',id,source);await assert.rejects(()=>extensions.addSource(db,'alice',id,source),/zaten/);
 const after=await core.readWorkspace({id:'alice',displayName:'DJ',isAutomation:false});assert.equal(after.tracks[0].sources[0].purchaseUrl,source.url);
});
const discoverMock={name:'identity-test',setup(b){b.onResolve({filter:/^@\/db\/workspace$/},()=>({path:'identity',namespace:'identity-test'}));b.onLoad({filter:/.*/,namespace:'identity-test'},()=>({contents:'export async function identityFromRequest(){return globalThis.testAuthenticated?{id:"test"}:null}',loader:'js'}));}};
const discover=await moduleFrom('app/api/discover/route.ts',[discoverMock]);
test('Catalog route protects access, maps actual provider metadata and exposes upstream failures',async()=>{
 const originalFetch=globalThis.fetch;
 try{
   globalThis.testAuthenticated=false;assert.equal((await discover.GET(new Request('https://mixnotes.test/api/discover?q=coffee'))).status,401);
   globalThis.testAuthenticated=true;assert.equal((await discover.GET(new Request('https://mixnotes.test/api/discover?q=x'))).status,400);
   globalThis.fetch=async(url)=>{assert.equal(url.hostname,'itunes.apple.com');assert.equal(url.searchParams.get('country'),'TR');return Response.json({results:[{trackId:7,trackName:'Track',artistName:'Artist',trackTimeMillis:300000,trackViewUrl:'https://music.apple.com/tr/album/example/7'}]});};
   const response=await discover.GET(new Request('https://mixnotes.test/api/discover?q=coffee'));assert.equal(response.status,200);const body=await response.json();assert.equal(body.results[0].durationSeconds,300);assert.equal(body.provider,'iTunes');
   globalThis.fetch=async()=>new Response('rate limited',{status:429});assert.equal((await discover.GET(new Request('https://mixnotes.test/api/discover?q=coffee'))).status,503);
 }finally{globalThis.fetch=originalFetch;}
});

test('Link metadata survives save, edits, owner isolation, backup restore and deletion',async()=>{
 const {sql,db}=database();
 const metadata={provider:'Apple Music',url:'https://music.apple.com/us/song/song/456',title:'Song',artist:'Artist',artworkUrl:'https://cdn.example/cover.jpg',album:'Album',releaseDate:'2026-01-01',genre:'House',durationSeconds:252,previewUrl:'',creator:''};
 await core.createTrack('alice',input({title:'Song',linkMetadata:metadata,sourceProvider:'Apple Music',sourceUrl:metadata.url}));
 let w=await core.readWorkspace({id:'alice',displayName:'DJ',isAutomation:false});const t=w.tracks[0];assert.deepEqual(t.linkMetadata,metadata);
 assert.equal((await core.readWorkspace({id:'bob',displayName:'DJ',isAutomation:false})).tracks.length,0);
 await core.updateTrack('alice',t.id,t.revision,input({title:'Song updated'}));
 w=await core.readWorkspace({id:'alice',displayName:'DJ',isAutomation:false});assert.deepEqual(w.tracks[0].linkMetadata,metadata);
 const backup=validation.backupSchema.parse({format:'mixnotes-workspace',version:4,...w});await extensions.restoreBackup(db,'bob',backup);
 const restored=await core.readWorkspace({id:'bob',displayName:'DJ',isAutomation:false});assert.deepEqual(restored.tracks[0].linkMetadata,metadata);
 await core.deleteTrack('alice',w.tracks[0].id,w.tracks[0].revision);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM track_link_metadata WHERE owner_id=?').get('alice').n,0);
});
const linkRoute=await moduleFrom('app/api/track-link/route.ts',[discoverMock]);
test('Link lookup route authenticates first and returns actionable provider errors',async()=>{
 const originalFetch=globalThis.fetch;
 try{
  globalThis.testAuthenticated=false;assert.equal((await linkRoute.GET(new Request('https://mixnotes.test/api/track-link?url=https://example.com'))).status,401);
  globalThis.testAuthenticated=true;let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({results:[{kind:'song',trackId:456,trackName:'Song',artistName:'Artist'}]});};
  assert.equal((await linkRoute.GET(new Request('https://mixnotes.test/api/track-link?url='+encodeURIComponent('https://127.0.0.1/internal')))).status,422);assert.equal(calls,0);
  const r=await linkRoute.GET(new Request('https://mixnotes.test/api/track-link?url='+encodeURIComponent('https://music.apple.com/us/song/song/456')));assert.equal(r.status,200);assert.equal((await r.json()).metadata.artist,'Artist');
  globalThis.fetch=async()=>new Response('limited',{status:429});assert.equal((await linkRoute.GET(new Request('https://mixnotes.test/api/track-link?url='+encodeURIComponent('https://music.apple.com/us/song/song/456')))).status,422);
 }finally{globalThis.fetch=originalFetch;}
});

test('Audition settings persist per owner, reject stale edits and survive backup restore',async()=>{
 const {db,sql}=database();await extensions.importTracks(db,'alice',[input({title:'A'}),input({title:'B'})]);
 let w=await core.readWorkspace({id:'alice',displayName:'DJ',isAutomation:false});
 const settings={outPoint:40,inPoint:10,duration:16,mode:'bass-swap',sync:true,preRoll:4,postRoll:4};
 const t={fromTrackId:w.tracks[0].id,toTrackId:w.tracks[1].id,transitionType:'Bass swap',mixOutPoint:'0:40',mixInPoint:'0:10',eqTechnique:'Low swap',fxNotes:'',timingNotes:'',notes:'',rating:0,difficulty:0,practiceStatus:'practice',lastPracticed:'',audioSettings:settings};
 await core.createTransition('alice',t);w=await core.readWorkspace({id:'alice',displayName:'DJ',isAutomation:false});const saved=w.transitions[0];assert.deepEqual(saved.audioSettings,settings);
 await assert.rejects(()=>core.updateTransition('bob',saved.id,saved.revision,t),/bulunamadı/);
 await core.updateTransition('alice',saved.id,saved.revision,{...t,audioSettings:{...settings,duration:8}});
 await assert.rejects(()=>core.updateTransition('alice',saved.id,saved.revision,t),/başka/);
 w=await core.readWorkspace({id:'alice',displayName:'DJ',isAutomation:false});assert.equal(w.transitions[0].audioSettings.duration,8);
 const backup=validation.backupSchema.parse({format:'mixnotes-workspace',version:4,...w});await extensions.restoreBackup(db,'bob',backup);
 const restored=await core.readWorkspace({id:'bob',displayName:'DJ',isAutomation:false});assert.equal(restored.transitions[0].audioSettings.duration,8);
 await core.deleteTrack('alice',w.tracks[0].id,w.tracks[0].revision);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM transition_audio_settings WHERE owner_id=?').get('alice').n,0);
 assert.equal(validation.audioSettingsSchema.safeParse({...settings,duration:100}).success,false);
});


test('audio import reuses existing records without changing their metadata or crossing owners',async()=>{
 const {db,sql}=database();
 await extensions.importTracks(db,'alice',[input({title:'Audio',notes:'Keep me'})]);
 await extensions.importTracks(db,'alice',[input({title:'Audio',notes:'Overwrite?'})],true);
 assert.equal(sql.prepare("SELECT count(*) n FROM tracks WHERE owner_id='alice'").get().n,1);
 assert.equal(sql.prepare("SELECT notes FROM tracks WHERE owner_id='alice'").get().notes,'Keep me');
 await extensions.importTracks(db,'bob',[input({title:'Audio'})],true);
 assert.equal(sql.prepare("SELECT count(*) n FROM tracks WHERE owner_id='bob'").get().n,1);
 await assert.rejects(()=>extensions.importTracks(db,'alice',[input({title:'Audio'})]),/zaten/);
 sql.close();
});


test('avatar and language preferences survive workspace reads and stay isolated by account',async()=>{
 const {db,sql}=database();
 await db.prepare("INSERT INTO user_preferences(owner_id,avatar_id,language) VALUES (?,?,?)").bind('alice','cat','en').run();
 const alice=await core.readWorkspace({id:'alice',displayName:'DJ',isAutomation:false});
 assert.equal(alice.profile.avatarId,'cat');assert.equal(alice.profile.language,'en');
 const bob=await core.readWorkspace({id:'bob',displayName:'DJ',isAutomation:false});
 assert.equal(bob.profile.avatarId,null);assert.equal(bob.profile.language,'tr');
 sql.close();
});

test('bulk Spotify imports retain artwork and album details in Library and survive backup reads',async()=>{
 const {db}=database();const metadata={provider:'Spotify',url:'https://open.spotify.com/track/0Lr4kGOYn9l83EjuK6cZFQ',title:'Track',artist:'Artist',album:'Album',releaseDate:'2026-01-01',artworkUrl:'https://i.scdn.co/image/cover',durationSeconds:240,previewUrl:'',genre:'',creator:''};await extensions.importTracks(db,'alice',[input({sourceProvider:'Spotify',sourceUrl:metadata.url,linkMetadata:metadata})]);const workspace=await core.readWorkspace({id:'alice',displayName:'Alice'});assert.deepEqual(workspace.tracks[0].linkMetadata,metadata);assert.equal(workspace.tracks[0].sources[0].provider,'Spotify');assert.equal((await core.readWorkspace({id:'bob',displayName:'Bob'})).tracks.length,0);await extensions.importTracks(db,'alice',[input({sourceProvider:'Spotify',sourceUrl:metadata.url,linkMetadata:metadata})],true);assert.equal((await core.readWorkspace({id:'alice',displayName:'Alice'})).tracks.length,1);
});
