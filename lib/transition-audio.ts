export type FadeMode = 'blend' | 'bass-swap' | 'cut' | 'linear' | 'filter-rise' | 'filter-fall' | 'echo-out' | 'dip';
export type AuditionSettings = { outPoint:number; inPoint:number; duration:number; mode:FadeMode; sync:boolean; preRoll:number; postRoll:number };
export type AuditionPlan = { rateA:number; rateB:number; offsetA:number; offsetB:number; overlap:number; preRoll:number; postRoll:number; length:number };
export function secondsLabel(value:number) { const n=Math.max(0,Math.floor(value));return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`; }
export function parseCue(value:string) { const m=value.trim().match(/^(?:(\d+):)?(\d+(?:\.\d+)?)$/);return m?Number(m[1]||0)*60+Number(m[2]):null; }
export function waveformPeaks(channels:Float32Array[],bins=600) {
  const length=channels[0]?.length||0;
  if(!length)return Array(bins).fill(0) as number[];
  const peaks:number[]=[];
  for(let bin=0;bin<bins;bin++){
    let peak=0; const start=Math.floor(bin*length/bins),end=Math.max(start+1,Math.floor((bin+1)*length/bins));
    for(const channel of channels)for(let i=start;i<Math.min(end,channel.length);i++)peak=Math.max(peak,Math.abs(channel[i]));
    peaks.push(Math.min(1,peak));
  }
  return peaks;
}
export function fadeCurves(mode:FadeMode,steps=128) {
  const a=new Float32Array(steps),b=new Float32Array(steps);
  for(let i=0;i<steps;i++){const x=i/(steps-1);a[i]=mode==='cut'?(x<.5?1:0):mode==='linear'?1-x:mode==='dip'?Math.max(0,1-x*2):Math.cos(x*Math.PI/2);b[i]=mode==='cut'?(x<.5?0:1):mode==='linear'?x:mode==='dip'?Math.max(0,x*2-1):Math.sin(x*Math.PI/2);}
  return {a,b};
}
export function planAudition(settings:AuditionSettings,durationA:number,durationB:number,bpmA:number|null,bpmB:number|null):AuditionPlan {
  const {outPoint,inPoint,duration,preRoll,postRoll}=settings;
  if(![outPoint,inPoint,duration,preRoll,postRoll,durationA,durationB].every(Number.isFinite))throw new Error('Geçiş değerlerini kontrol et.');
  if(outPoint<0||inPoint<0||duration<.1||duration>60||preRoll<0||preRoll>10||postRoll<0||postRoll>10)throw new Error('Geçiş noktalarını ve süreyi kontrol et.');
  let rateB=1;
  if(settings.sync){
    if(!bpmA||!bpmB||bpmA<=0||bpmB<=0)throw new Error('Tempo eşleme için iki parçanın da BPM bilgisini gir.');
    rateB=bpmA/bpmB;
    if(rateB<.8||rateB>1.25)throw new Error('Tempo farkı çok büyük. Tempo eşlemeyi kapat veya daha yakın BPM’li parçalar seç.');
  }
  const lead=Math.min(preRoll,outPoint),tail=Math.min(postRoll,Math.max(0,(durationB-inPoint)/rateB-duration));
  if(outPoint+duration>durationA+.001||inPoint+(duration+tail)*rateB>durationB+.001)throw new Error('Geçiş parça sonunu aşıyor. Cue noktasını geri al veya süreyi kısalt.');
  return {rateA:1,rateB,offsetA:outPoint-lead,offsetB:inPoint,overlap:duration,preRoll:lead,postRoll:tail,length:lead+duration+tail};
}
export type PlayingAudition = { startedAt:number; plan:AuditionPlan; stop:()=>void };
export function startAudition(context:BaseAudioContext,audioA:AudioBuffer,audioB:AudioBuffer,settings:AuditionSettings,bpmA:number|null,bpmB:number|null):PlayingAudition {
  const plan=planAudition(settings,audioA.duration,audioB.duration,bpmA,bpmB);
  const startedAt=context.currentTime+.08,fadeStart=startedAt+plan.preRoll,fadeEnd=fadeStart+plan.overlap;
  const a=context.createBufferSource(),b=context.createBufferSource(),gainA=context.createGain(),gainB=context.createGain(),bassA=context.createBiquadFilter(),bassB=context.createBiquadFilter(),master=context.createGain(),limiter=context.createDynamicsCompressor();
  a.buffer=audioA;b.buffer=audioB;b.playbackRate.value=plan.rateB;
  bassA.type=bassB.type='lowshelf';bassA.frequency.value=bassB.frequency.value=220;
  a.connect(bassA).connect(gainA).connect(master);b.connect(bassB).connect(gainB).connect(master);master.connect(limiter).connect(context.destination);
  master.gain.value=.55;limiter.threshold.value=-6;limiter.knee.value=3;limiter.ratio.value=12;limiter.attack.value=.003;limiter.release.value=.12;
  gainA.gain.setValueAtTime(1,startedAt);gainB.gain.setValueAtTime(0,startedAt);
  const curves=fadeCurves(settings.mode);gainA.gain.setValueCurveAtTime(curves.a,fadeStart,plan.overlap);gainB.gain.setValueCurveAtTime(curves.b,fadeStart,plan.overlap);gainA.gain.setValueAtTime(0,fadeEnd);gainB.gain.setValueAtTime(1,fadeEnd);
  if(settings.mode==='bass-swap'){
    const halfway=fadeStart+plan.overlap/2;
    bassB.gain.setValueAtTime(-24,startedAt);bassB.gain.setValueAtTime(-24,halfway-.04);bassB.gain.linearRampToValueAtTime(0,halfway+.04);
    bassA.gain.setValueAtTime(0,startedAt);bassA.gain.setValueAtTime(0,halfway-.04);bassA.gain.linearRampToValueAtTime(-24,halfway+.04);
  }
  if(settings.mode==='filter-rise'||settings.mode==='filter-fall'){
    bassA.type=settings.mode==='filter-rise'?'highpass':'lowpass';
    bassA.frequency.value=settings.mode==='filter-rise'?30:16000;
    bassA.frequency.setValueAtTime(settings.mode==='filter-rise'?30:16000,fadeStart);
    bassA.frequency.exponentialRampToValueAtTime(settings.mode==='filter-rise'?8000:120,fadeEnd);
    bassB.type='lowpass';bassB.frequency.setValueAtTime(250,fadeStart);bassB.frequency.exponentialRampToValueAtTime(16000,fadeEnd);
  }
  const extra:AudioNode[]=[];
  if(settings.mode==='echo-out'){
    const delay=context.createDelay(2),feedback=context.createGain(),wet=context.createGain();
    delay.delayTime.value=Math.min(1.5,bpmA?60/bpmA:.4);feedback.gain.value=.32;
    wet.gain.setValueAtTime(0,startedAt);wet.gain.setValueAtTime(0,fadeStart);wet.gain.linearRampToValueAtTime(.35,fadeStart+plan.overlap*.65);wet.gain.linearRampToValueAtTime(0,fadeEnd+plan.postRoll);
    gainA.connect(delay);delay.connect(feedback).connect(delay);delay.connect(wet).connect(master);extra.push(delay,feedback,wet);
  }
  a.start(startedAt,plan.offsetA);b.start(fadeStart,plan.offsetB);a.stop(fadeEnd+.01);b.stop(startedAt+plan.length);
  let stopped=false;let cleanupTimer:ReturnType<typeof setTimeout>;
  const nodes=[a,b,bassA,bassB,gainA,gainB,master,limiter,...extra];
  function disconnect(){nodes.forEach(node=>{try{node.disconnect();}catch{}});}
  const stop=()=>{if(stopped)return;stopped=true;clearTimeout(cleanupTimer);const now=context.currentTime;master.gain.cancelScheduledValues(now);master.gain.setValueAtTime(master.gain.value,now);master.gain.linearRampToValueAtTime(0,now+.02);for(const source of [a,b])try{source.stop(now+.025);}catch{}setTimeout(disconnect,40);};
  cleanupTimer=setTimeout(()=>{if(!stopped){stopped=true;disconnect();}},(plan.length+.2)*1000);
  return {startedAt,plan,stop};
}

// Encode the actual rendered mix as a stereo 16-bit PCM WAV, without provider audio.
export function pcmWave(channels:Float32Array[],sampleRate:number,skip=0){
 if(!Number.isInteger(skip)||skip<0)throw new Error('WAV değerlerini kontrol et.');
 const count=channels.length;if(!count||count>2||!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000)throw new Error('WAV değerlerini kontrol et.');
 const length=Math.max(0,Math.min(...channels.map(c=>c.length))-Math.max(0,skip)),bytes=new ArrayBuffer(44+length*count*2),view=new DataView(bytes);
 const text=(at:number,value:string)=>{for(let i=0;i<value.length;i++)view.setUint8(at+i,value.charCodeAt(i));};
 text(0,'RIFF');view.setUint32(4,36+length*count*2,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,count,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*count*2,true);view.setUint16(32,count*2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,length*count*2,true);
 for(let i=0;i<length;i++)for(let c=0;c<count;c++){const raw=channels[c][i+skip],sample=Number.isFinite(raw)?Math.max(-1,Math.min(1,raw)):0;view.setInt16(44+(i*count+c)*2,sample<0?sample*32768:sample*32767,true);}return bytes;
}
export async function renderAuditionWav(a:AudioBuffer,b:AudioBuffer,settings:AuditionSettings,bpmA:number|null,bpmB:number|null){
 const plan=planAudition(settings,a.duration,b.duration,bpmA,bpmB),rate=22050;
 const context=new OfflineAudioContext(2,Math.ceil((plan.length+.08)*rate),rate),playing=startAudition(context,a,b,settings,bpmA,bpmB);
 try{const rendered=await context.startRendering();return new Blob([pcmWave([rendered.getChannelData(0),rendered.getChannelData(1)],rate,Math.round(.08*rate))],{type:'audio/wav'});}finally{playing.stop();}
}
