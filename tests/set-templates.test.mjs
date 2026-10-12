import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { build } from 'esbuild';

async function moduleFrom(entry,plugins=[]){const result=await build({entryPoints:[entry],bundle:true,write:false,format:'esm',platform:'node',plugins});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));}
const mockedCloudflare={name:'cloudflare-test',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'workers',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const env={get DB(){return globalThis.testDatabase}};',loader:'js'}));}};
const core=await moduleFrom('db/workspace.ts',[mockedCloudflare]);
const extensions=await moduleFrom('db/workspace-extensions.ts');
const templates=await moduleFrom('lib/set-templates.ts');
const validation=await moduleFrom('lib/workspace-validation.ts');
function database(){
 const sql=new DatabaseSync(':memory:');
 const db={prepare(query){return{query,args:[],bind(...args){return {...this,args};},async all(){return{results:sql.prepare(query).all(...this.args)};},async first(){return sql.prepare(query).get(...this.args)??null;},async run(){return{meta:{changes:Number(sql.prepare(query).run(...this.args).changes)}};}};},async batch(statements){sql.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sql.exec('COMMIT');return results;}catch(error){sql.exec('ROLLBACK');throw error;}}};
 for(const query of core.schemaStatements)sql.exec(query);
 globalThis.testDatabase=db;return{sql,db};
}
const track=(id,bpm,energy,overrides={})=>({id,title:id,artist:'A',version:'',bpm,musicalKey:'8A',genre:'House',subgenre:'',energy,rating:3,tags:[],origin:'library',notes:'',cueNotes:'',introNotes:'',outroNotes:'',durationSeconds:300,label:'',dateAdded:'',updatedAt:'',revision:1,sources:[],...overrides});

test('Curves interpolate between samples and clamp at the ends',()=>{
 assert.equal(templates.sampleCurve([2,4],0.5),3);
 assert.equal(templates.sampleCurve([2,4],2),4);
 assert.equal(templates.sampleCurve([5],0.3),5);
});

test('Warm-up template rises in energy, fits the length and skips discovery tracks',()=>{
 const library=[1,2,3,4,5].flatMap(e=>[0,1,2].map(i=>track(`e${e}-${i}`,118+e*2+i,e)));
 library.push(track('disc',120,2,{origin:'discovery'}));
 const warmup=templates.setTemplates.find(t=>t.id==='warmup');
 const set=templates.generateFromTemplate(library,warmup,[],{minutes:30});
 assert.equal(set.length,6);
 assert.ok(!set.some(t=>t.id==='disc'));
 assert.ok(set[0].energy<=2);assert.ok(set.at(-1).energy>=3);
 const closing=templates.generateFromTemplate(library,templates.setTemplates.find(t=>t.id==='closing'),[],{minutes:30});
 assert.ok(closing[0].energy>closing.at(-1).energy);
 assert.deepEqual(templates.generateFromTemplate(library,warmup,[],{genre:'Techno'}),[]);
});

test('Creating a set with tracks is atomic and rejects tracks from another owner',async()=>{
 const {sql,db}=database();
 const input=o=>validation.importedTrackSchema.parse({title:o,artist:'A'});
 await extensions.importTracks(db,'alice',[input('one'),input('two')]);
 await extensions.importTracks(db,'bob',[input('other')]);
 const ids=sql.prepare("SELECT id,owner_id FROM tracks ORDER BY title").all();
 const alice=ids.filter(r=>r.owner_id==='alice').map(r=>r.id),bob=ids.find(r=>r.owner_id==='bob').id;
 const setInput={title:'Gen',genre:'',eventDate:'',notes:'',status:'draft'};
 await core.createSet('alice',setInput,[alice[1],alice[0],alice[1]]);
 const w=await core.readWorkspace({id:'alice',displayName:'DJ',isAutomation:false});
 assert.deepEqual(w.sets[0].tracks.map(t=>t.trackId),[alice[1],alice[0]]);
 await assert.rejects(()=>core.createSet('alice',{...setInput,title:'Bad'},[alice[0],bob]),/bulunamadı/);
 assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM mix_sets").get().n,1);
});
