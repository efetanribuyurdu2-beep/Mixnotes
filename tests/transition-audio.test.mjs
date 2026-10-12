import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({entryPoints:['lib/transition-audio.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {waveformPeaks,fadeCurves,planAudition,startAudition,parseCue}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const settings={outPoint:40,inPoint:10,duration:16,mode:'blend',sync:false,preRoll:4,postRoll:4};
test('waveform comes from real peaks in both channels, including silence and transients',()=>{
 assert.deepEqual(waveformPeaks([new Float32Array([0,.25,-.75,0])],2),[.25,.75]);
 assert.deepEqual(waveformPeaks([new Float32Array([0,0,0,0]),new Float32Array([0,-1,0,.5])],2),[1,.5]);
 assert.ok(waveformPeaks([new Float32Array(100)],10).every(x=>x===0));
});
test('equal-power fades preserve gain energy and have correct endpoints; cut changes halfway',()=>{
 const {a,b}=fadeCurves('blend');assert.equal(a[0],1);assert.equal(b[0],0);assert.ok(a.at(-1)<1e-6);assert.equal(b.at(-1),1);
 for(let i=0;i<a.length;i++)assert.ok(Math.abs(a[i]**2+b[i]**2-1)<1e-6);
 const cut=fadeCurves('cut');assert.equal(cut.a[0],1);assert.equal(cut.b[0],0);assert.equal(cut.a.at(-1),0);assert.equal(cut.b.at(-1),1);
});
test('audition handles preroll, tail, tempo rate, and invalid cues without playing past track ends',()=>{
 const p=planAudition(settings,100,100,120,125);assert.equal(p.offsetA,36);assert.equal(p.offsetB,10);assert.equal(p.length,24);assert.equal(p.rateB,1);
 const sync=planAudition({...settings,sync:true},100,100,120,125);assert.equal(sync.rateB,.96);
 assert.equal(planAudition({...settings,outPoint:2},100,100,null,null).preRoll,2);
 assert.equal(planAudition({...settings,inPoint:82},100,100,null,null).postRoll,2);
 for(const bad of [{outPoint:90},{inPoint:90},{duration:NaN},{duration:0},{preRoll:-1}])assert.throws(()=>planAudition({...settings,...bad},100,100,120,125));
 assert.throws(()=>planAudition({...settings,sync:true},100,100,null,125),/BPM/);
 assert.throws(()=>planAudition({...settings,sync:true},100,100,120,60),/farkı/);
 assert.equal(parseCue('1:32.5'),92.5);assert.equal(parseCue('92'),92);assert.equal(parseCue('drop'),null);
});
function param(){return {value:0,calls:[],setValueAtTime(...args){this.calls.push(['set',...args]);},setValueCurveAtTime(...args){this.calls.push(['curve',...args]);},exponentialRampToValueAtTime(...args){this.calls.push(['exponential',...args]);},linearRampToValueAtTime(...args){this.calls.push(['ramp',...args]);},cancelScheduledValues(...args){this.calls.push(['cancel',...args]);}};}
function context(){const nodes=[];const node=kind=>{const n={kind,gain:param(),frequency:param(),playbackRate:param(),delayTime:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),connect(next){this.to=next;return next;},disconnect(){this.disconnected=true;},start(...args){this.startArgs=args;},stop(...args){this.stopArgs=args;}};nodes.push(n);return n;};return {nodes,currentTime:10,destination:{},createDelay:()=>node('delay'),createBufferSource:()=>node('source'),createGain:()=>node('gain'),createBiquadFilter:()=>node('filter'),createDynamicsCompressor:()=>node('compressor')};}
test('WebAudio schedules both decks, crossfades, bass automation and tempo on one clock',()=>{
 const c=context(),playing=startAudition(c,{duration:100},{duration:100},{...settings,mode:'bass-swap',sync:true},120,125);
 const sources=c.nodes.filter(n=>n.kind==='source'),filters=c.nodes.filter(n=>n.kind==='filter'),gains=c.nodes.filter(n=>n.kind==='gain');
 assert.equal(sources[0].startArgs[0],10.08);assert.equal(sources[0].startArgs[1],36);
 assert.equal(sources[1].startArgs[0],14.08);assert.equal(sources[1].startArgs[1],10);assert.equal(sources[1].playbackRate.value,.96);
 assert.ok(gains[0].gain.calls.some(call=>call[0]==='curve'&&call[2]===14.08));
 assert.ok(filters.every(f=>f.type==='lowshelf'&&f.frequency.value===220));assert.ok(filters[1].gain.calls.some(call=>call[0]==='ramp'&&call[1]===0));
 assert.ok(c.nodes.some(n=>n.kind==='compressor'));playing.stop();playing.stop();assert.ok(sources.every(s=>s.stopArgs[0]===10.025));
});

test('all eight modes have finite bounded gain curves, filters sweep and echo uses bounded feedback',()=>{
 for(const mode of ['blend','bass-swap','cut','linear','filter-rise','filter-fall','echo-out','dip']){
  const curves=fadeCurves(mode);for(const value of [...curves.a,...curves.b])assert.ok(Number.isFinite(value)&&value>=0&&value<=1);
  const c=context(),p=startAudition(c,{duration:100},{duration:100},{...settings,mode},120,122);
  if(mode.startsWith('filter-'))assert.ok(c.nodes.filter(n=>n.kind==='filter').every(n=>n.frequency.calls.some(call=>call[0]==='exponential')));
  if(mode==='echo-out'){assert.ok(c.nodes.some(n=>n.kind==='delay'));assert.ok(c.nodes.some(n=>n.kind==='gain'&&n.gain.value===.32));}
  p.stop();
 }
 const dip=fadeCurves('dip',129);assert.equal(dip.a[64],0);assert.equal(dip.b[64],0);const linear=fadeCurves('linear');for(let i=0;i<linear.a.length;i++)assert.ok(Math.abs(linear.a[i]+linear.b[i]-1)<1e-6);
});

test('rendered rehearsal WAV preserves stereo samples, trims scheduling lead and clamps PCM safely',async()=>{
 const {pcmWave}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
 const bytes=pcmWave([new Float32Array([.1,-1,.5,2]),new Float32Array([.2,1,-.5,NaN])],22050,1),view=new DataView(bytes);
 assert.equal(new TextDecoder().decode(bytes.slice(0,4)),'RIFF');assert.equal(view.getUint16(22,true),2);assert.equal(view.getUint32(24,true),22050);assert.equal(view.getUint32(40,true),12);assert.equal(view.getInt16(44,true),-32768);assert.equal(view.getInt16(46,true),32767);assert.equal(view.getInt16(52,true),32767);assert.equal(view.getInt16(54,true),0);assert.throws(()=>pcmWave([],22050));assert.throws(()=>pcmWave([new Float32Array(2)],22050,NaN));
});
