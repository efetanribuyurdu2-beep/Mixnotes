import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

async function moduleFrom(entry){const result=await build({entryPoints:[entry],bundle:true,write:false,format:'esm',platform:'node'});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));}
const stats=await moduleFrom('lib/stats.ts');
const track=(id,bpm,musicalKey='8A')=>({id,title:id,artist:'A',bpm,musicalKey,tracks:[]});
const session=(date,minutes=30,o={})=>({id:date+minutes,kind:'practice',date,durationMinutes:minutes,setId:null,transitionId:null,rating:3,notes:'',setTitle:'',transitionLabel:'',createdAt:'',...o});
const today=new Date('2026-10-12T15:00:00Z');

test('BPM histogram buckets known tempos and leaves gaps visible',()=>{
 const h=stats.bpmHistogram([track('a',121),track('b',123.5),track('c',130),track('d',null)]);
 assert.deepEqual(h.map(b=>[b.from,b.count]),[[120,2],[124,0],[128,1]]);
 assert.deepEqual(stats.bpmHistogram([track('x',null)]),[]);
});

test('Top keys normalise case and ignore non-Camelot keys',()=>{
 assert.deepEqual(stats.topKeys([track('a',1,'8a'),track('b',1,'8A'),track('c',1,'10A'),track('d',1,'C major')]),[{key:'8A',count:2},{key:'10A',count:1}]);
});

test('Most played counts each logged performance of a set',()=>{
 const tracks=[track('a',1),track('b',1),track('c',1)];
 const sets=[{id:'s1',status:'performed',tracks:[{trackId:'a'},{trackId:'b'}]},{id:'s2',status:'performed',tracks:[{trackId:'a'}]},{id:'s3',status:'draft',tracks:[{trackId:'c'}]}];
 const sessions=[session('2026-10-01',60,{kind:'performance',setId:'s1'}),session('2026-10-05',60,{kind:'performance',setId:'s1'})];
 assert.deepEqual(stats.mostPlayed(tracks,sets,sessions).map(r=>[r.track.id,r.plays]),[['a',3],['b',2]]);
});

test('Streak tolerates no session yet today but breaks on a gap',()=>{
 assert.equal(stats.practiceStreak([session('2026-10-11'),session('2026-10-10'),session('2026-10-08')],today),2);
 assert.equal(stats.practiceStreak([session('2026-10-12'),session('2026-10-11')],today),2);
 assert.equal(stats.practiceStreak([session('2026-10-09')],today),0);
});

test('Activity grid ends on the current week and sums minutes per day',()=>{
 const grid=stats.activityGrid([session('2026-10-12',20),session('2026-10-12',25),session('2026-08-01')],12,today);
 assert.equal(grid.length,12);assert.equal(grid[11][0].date,'2026-10-12');assert.equal(grid[11][0].minutes,45);
 assert.equal(grid[11][1].future,true);assert.equal(grid[0][0].date,'2026-07-27');
 assert.equal(stats.minutesSince([session('2026-10-12',20),session('2026-09-13',40),session('2026-09-12',99)],30,today),60);
 assert.deepEqual([0,10,45,90,200].map(stats.activityLevel),[0,1,2,3,4]);
});
