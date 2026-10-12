import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

async function moduleFrom(entry){const result=await build({entryPoints:[entry],bundle:true,write:false,format:'esm',platform:'node'});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));}
const flow=await moduleFrom('lib/set-flow.ts');
const tempo=await moduleFrom('lib/tap-tempo.ts');
const track=(id,bpm,musicalKey,energy=3,overrides={})=>({id,title:id,artist:'A',version:'',bpm,musicalKey,genre:'House',subgenre:'',energy,rating:3,tags:[],origin:'library',notes:'',cueNotes:'',introNotes:'',outroNotes:'',durationSeconds:300,label:'',dateAdded:'',updatedAt:'',revision:1,sources:[],...overrides});

test('Camelot helpers classify matches and wrap around the wheel',()=>{
 assert.deepEqual(flow.compatibleKeys('12A'),['12A','12B','1A','11A','2A']);
 assert.deepEqual(flow.compatibleKeys('C major'),[]);
 assert.equal(flow.harmonicMatch('8A','8A'),'same');
 assert.equal(flow.harmonicMatch('8A','8B'),'compatible');
 assert.equal(flow.harmonicMatch('12A','1A'),'compatible');
 assert.equal(flow.harmonicMatch('11A','1A'),'energy-boost');
 assert.equal(flow.harmonicMatch('8A','3B'),'clash');
 assert.equal(flow.harmonicMatch('','8A'),'unknown');
});

test('Pair score rewards prepared transitions and penalises key clashes and tempo jumps',()=>{
 const a=track('a',124,'8A'),b=track('b',125,'9A'),c=track('c',140,'3B');
 assert.ok(flow.scorePair(a,b,[]).score>flow.scorePair(a,c,[]).score);
 const prepared=flow.scorePair(a,c,[{fromTrackId:'a',toTrackId:'c',practiceStatus:'ready'}]);
 assert.equal(prepared.prepared,true);
 assert.equal(flow.scorePair(a,c,[]).score+45,prepared.score);
 assert.equal(flow.scorePair(a,b,[]).bpmDelta,1);
});

test('Optimizer keeps the opener, never lowers the flow score and leaves short sets alone',()=>{
 const tracks=[track('open',122,'8A',2),track('peak',130,'10A',5),track('mid',124,'9A',3),track('build',127,'9A',4)];
 const order=flow.optimizeOrder(tracks,[]);
 assert.equal(order[0].id,'open');
 assert.equal(new Set(order.map(t=>t.id)).size,tracks.length);
 assert.ok(flow.flowScore(order,[])>=flow.flowScore(tracks,[]));
 assert.deepEqual(order.map(t=>t.id),['open','mid','build','peak']);
 assert.deepEqual(flow.optimizeOrder(tracks.slice(0,2),[]).map(t=>t.id),['open','peak']);
 assert.equal(flow.flowScore([tracks[0]],[]),0);
});

test('Tap tempo averages steady taps, ignores outliers and gives FX delay times',()=>{
 assert.equal(tempo.tapTempo([0]),null);
 const taps=[0,500,1000,1500,2000];
 assert.equal(tempo.tapTempo(taps),120);
 assert.equal(tempo.tapTempo([0,500,1000,1900,2400]),120);
 const timings=Object.fromEntries(tempo.beatTimings(120).map(t=>[t.label,t.ms]));
 assert.equal(timings['1'],500);assert.equal(timings['1/4'],125);assert.equal(timings['1 BAR'],2000);
});
