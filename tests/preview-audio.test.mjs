import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const identity={name:'identity',setup(b){b.onResolve({filter:/^@\/db\/workspace$/},()=>({path:'id',namespace:'id'}));b.onLoad({filter:/.*/,namespace:'id'},()=>({contents:'export async function identityFromRequest(){return globalThis.previewUser?{id:"u"}:null}',loader:'js'}));}};
const r=await build({entryPoints:['app/api/preview-audio/route.ts'],bundle:true,write:false,platform:'node',format:'esm',plugins:[identity]});
const route=await import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));
const auto=await import('data:text/javascript;base64,'+Buffer.from((await build({entryPoints:['lib/auto-analysis.ts'],bundle:true,write:false,platform:'node',format:'esm'})).outputFiles[0].text).toString('base64'));
const get=q=>route.GET(new Request('https://mixnotes.test/api/preview-audio?'+new URLSearchParams(q)));
function mockFetch(results,audio={}){const calls=[];globalThis.fetch=async(url)=>{const u=String(url);calls.push(u);if(u.startsWith('https://itunes.apple.com/search'))return Response.json({results});const res=new Response(audio.body??new Uint8Array([1,2,3]),{headers:{'content-type':'audio/x-m4a'}});Object.defineProperty(res,'url',{value:audio.finalUrl??u});return res;};return calls;}
const original=globalThis.fetch;

test('Preview relay needs a session and a confident title/artist match',async()=>{
 try{
  globalThis.previewUser=false;assert.equal((await get({title:'Strobe',artist:'deadmau5'})).status,401);
  globalThis.previewUser=true;
  let calls=mockFetch([{trackName:'Strobe (Radio Edit)',artistName:'Other Artist',previewUrl:'https://audio-ssl.itunes.apple.com/a.m4a'},{trackName:'Strobe (Radio Edit)',artistName:'deadmau5',previewUrl:'https://audio-ssl.itunes.apple.com/b.m4a'}]);
  let res=await get({title:'Strobe',artist:'deadmau5'});assert.equal(res.status,200);assert.deepEqual([...new Uint8Array(await res.arrayBuffer())],[1,2,3]);
  assert.equal(calls[1],'https://audio-ssl.itunes.apple.com/b.m4a');
  mockFetch([{trackName:'Strobelight',artistName:'deadmau5',previewUrl:'https://audio-ssl.itunes.apple.com/c.m4a'}]);
  assert.equal((await get({title:'Strobe',artist:'deadmau5'})).status,404);
  mockFetch([{trackName:'Cola',artistName:'CamelPhat & Elderbrook',previewUrl:'https://audio-ssl.itunes.apple.com/d.m4a'}]);
  assert.equal((await get({title:'Cola',artist:'CamelPhat, Elderbrook'})).status,200);
  assert.equal((await get({title:'x'})).status,400);
 }finally{globalThis.fetch=original;}
});

test('Preview relay only fetches Apple preview hosts, even after redirects',async()=>{
 globalThis.previewUser=true;
 try{
  let calls=mockFetch([{trackName:'Opus',artistName:'Eric Prydz',previewUrl:'https://evil.example/opus.m4a'}]);
  assert.equal((await get({title:'Opus',artist:'Eric Prydz'})).status,404);assert.equal(calls.length,1);
  mockFetch([{trackName:'Opus',artistName:'Eric Prydz',previewUrl:'http://audio-ssl.itunes.apple.com/opus.m4a'}]);
  assert.equal((await get({title:'Opus',artist:'Eric Prydz'})).status,404);
  mockFetch([{trackName:'Opus',artistName:'Eric Prydz',previewUrl:'https://audio-ssl.itunes.apple.com/opus.m4a'}],{finalUrl:'https://169.254.169.254/latest'});
  assert.equal((await get({title:'Opus',artist:'Eric Prydz'})).status,502);
 }finally{globalThis.fetch=original;}
});

test('Auto-fill never overwrites values and skips weak estimates',()=>{
 const t={bpm:null,musicalKey:''};
 assert.deepEqual(auto.missingFields(t,{tempo:{bpm:126,confidence:.7},key:{camelot:'8A',confidence:.4}}),{bpm:126,musicalKey:'8A'});
 assert.deepEqual(auto.missingFields({bpm:124,musicalKey:'5A'},{tempo:{bpm:126,confidence:.9},key:{camelot:'8A',confidence:.9}}),{});
 assert.deepEqual(auto.missingFields(t,{tempo:{bpm:126,confidence:.05},key:{camelot:'8A',confidence:.05}}),{});
 assert.equal(auto.needsAnalysis({bpm:120,musicalKey:' '}),true);assert.equal(auto.needsAnalysis({bpm:120,musicalKey:'8A'}),false);
});
