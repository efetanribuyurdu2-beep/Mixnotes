import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

async function moduleFrom(entry){const result=await build({entryPoints:[entry],bundle:true,write:false,format:'esm',platform:'node'});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));}
const analysis=await moduleFrom('lib/audio-analysis.ts');
const sr=22050;
// Four-on-the-floor kick with off-beat hats plus a sustained chord, like a simple house loop.
function loop(bpm,seconds,chords){
 if(typeof chords[0]==='number')chords=[chords];
 const out=new Float32Array(sr*seconds),beat=60/bpm;let seed=7;const random=()=>(seed=(seed*16807)%2147483647)/2147483647;
 for(let i=0;i<out.length;i+=1){
  const notes=chords[Math.floor(i/sr/(beat*4))%chords.length];
  const t=i/sr,phase=t%beat,off=(t+beat/2)%beat;
  let v=Math.sin(2*Math.PI*(50+60*Math.exp(-phase*30))*phase)*Math.exp(-phase*9)*0.8;
  v+=(random()*2-1)*Math.exp(-off*60)*0.15;
  for(const f of notes)for(const h of [1,2,3])v+=Math.sin(2*Math.PI*f*h*t)*0.06/h;
  out[i]=v;
 }
 return out;
}
const aMinor=[220,261.63,329.63];
// i–iv–v–i in A minor and I–IV–V–I in G major.
const aMinorProgression=[aMinor,[146.83,174.61,220],[164.81,196,246.94],aMinor];
const gMajorProgression=[[196,246.94,293.66],[130.81,164.81,196],[146.83,185,220],[196,246.94,293.66]];

test('Camelot mapping covers major and minor keys',()=>{
 assert.equal(analysis.camelotFor(0,'major'),'8B');
 assert.equal(analysis.camelotFor(9,'minor'),'8A');
 assert.equal(analysis.camelotFor(7,'major'),'9B');
 assert.equal(analysis.camelotFor(11,'major'),'1B');
 assert.equal(analysis.camelotFor(5,'minor'),'4A');
});

for(const bpm of [100,124,128,140]){
 test(`Tempo detection finds ${bpm} BPM within half a beat`,()=>{
  const result=analysis.detectTempo(loop(bpm,30,aMinor),sr);
  assert.ok(result,'no tempo');
  assert.ok(Math.abs(result.bpm-bpm)<=0.5,`got ${result.bpm}`);
  assert.ok(result.confidence>0);
 });
}

test('Key detection recognises A minor and G major progressions',()=>{
 assert.equal(analysis.detectKey(loop(124,24,aMinorProgression),sr).camelot,'8A');
 assert.equal(analysis.detectKey(loop(124,24,gMajorProgression),sr).camelot,'9B');
});

test('Silence yields no estimate instead of a fabricated value',()=>{
 const silence=new Float32Array(sr*20);
 assert.equal(analysis.detectTempo(silence,sr),null);
 assert.equal(analysis.detectKey(silence,sr),null);
});
