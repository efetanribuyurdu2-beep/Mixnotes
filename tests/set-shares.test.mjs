import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { build } from 'esbuild';

async function moduleFrom(entry,plugins=[]){const result=await build({entryPoints:[entry],bundle:true,write:false,format:'esm',platform:'node',plugins});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));}
const mockedCloudflare={name:'cloudflare-test',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'workers',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const env={get DB(){return globalThis.testDatabase}};',loader:'js'}));}};
const core=await moduleFrom('db/workspace.ts',[mockedCloudflare]);
const shares=await moduleFrom('db/set-shares.ts',[mockedCloudflare]);
const extensions=await moduleFrom('db/workspace-extensions.ts');
const validation=await moduleFrom('lib/workspace-validation.ts');
function database(){
 const sql=new DatabaseSync(':memory:');
 const db={prepare(query){return{query,args:[],bind(...args){return {...this,args};},async all(){return{results:sql.prepare(query).all(...this.args)};},async first(){return sql.prepare(query).get(...this.args)??null;},async run(){return{meta:{changes:Number(sql.prepare(query).run(...this.args).changes)}};}};},async batch(statements){sql.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sql.exec('COMMIT');return results;}catch(error){sql.exec('ROLLBACK');throw error;}}};
 for(const query of core.schemaStatements)sql.exec(query);
 globalThis.testDatabase=db;return{sql,db};
}
const me={id:'alice',displayName:'DJ',isAutomation:false};

test('Share links expose only the public tracklist and die with the set',async()=>{
 const {sql,db}=database();
 await extensions.importTracks(db,'alice',[validation.importedTrackSchema.parse({title:'Secret Edit',artist:'A',bpm:124,musicalKey:'8A',notes:'private note',cueNotes:'drop 1:04',rating:5})]);
 const trackId=sql.prepare('SELECT id FROM tracks').get().id;
 await core.createSet('alice',{title:'Friday',genre:'House',eventDate:'2026-10-17',notes:'set secret',status:'draft'},[trackId]);
 let w=await core.readWorkspace(me);const set=w.sets[0];
 assert.equal(set.shareToken,null);
 await assert.rejects(()=>shares.shareSet('bob',set.id),/bulunamadı/);
 await shares.shareSet('alice',set.id);await shares.shareSet('alice',set.id);
 w=await core.readWorkspace(me);const token=w.sets[0].shareToken;
 assert.match(token,/^[A-Za-z0-9_-]{22}$/);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM set_shares').get().n,1);
 const shared=await shares.readSharedSet(token);
 assert.equal(shared.title,'Friday');assert.equal(shared.tracks[0].title,'Secret Edit');assert.equal(shared.tracks[0].bpm,124);
 const text=JSON.stringify(shared);
 for(const secret of ['private note','drop 1:04','set secret','alice'])assert.ok(!text.includes(secret),secret);
 assert.equal(await shares.readSharedSet('../../etc'),null);
 assert.equal(await shares.readSharedSet('A'.repeat(22)),null);
 await shares.unshareSet('alice',set.id);
 assert.equal(await shares.readSharedSet(token),null);
 await shares.shareSet('alice',set.id);
 w=await core.readWorkspace(me);const second=w.sets[0].shareToken;
 assert.notEqual(second,token);
 await core.deleteSet('alice',set.id,w.sets[0].revision);
 assert.equal(await shares.readSharedSet(second),null);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM set_shares').get().n,0);
});
