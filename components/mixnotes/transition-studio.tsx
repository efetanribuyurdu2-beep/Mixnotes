"use client";
import {BrowserHandoff} from "./browser-handoff";
import { Pane } from "./sub-tabs";
import {mixStems,stemNames,type StemLevels} from '@/lib/stem-audio';
import {useNotebook} from './studio-notebook';
import {ControllerPanel} from './controller-panel';
import {StemMixer} from './stem-mixer';
import {L,Localized} from "./localized";
import {useEffect,useRef,useState} from 'react';
import {Headphones,LoaderCircle,Play,Save,Square} from 'lucide-react';
import {useWorkspace} from './workspace-context';
import {AudioAttachment,useAudioAsset,Waveform} from './audio-attachment';
import {parseCue,planAudition,secondsLabel,startAudition,renderAuditionWav,type AuditionSettings,type FadeMode,type PlayingAudition} from '@/lib/transition-audio';

const modeLabels:Record<FadeMode,string>={blend:'Yumuşak blend','bass-swap':'Bass swap',cut:'Cut',linear:'Linear crossfade','filter-rise':'High-pass yükseliş','filter-fall':'Low-pass düşüş','echo-out':'Echo çıkış',dip:'Dip / fade-through'};
export function TransitionStudio({transitionId=''}:{transitionId?:string}){
  const {data,mutate,busy}=useWorkspace();
  const transition=data.transitions.find(t=>t.id===transitionId);
  const [fromId,setFromId]=useState(transition?.fromTrackId||data.tracks[0]?.id||''),[toId,setToId]=useState(transition?.toTrackId||data.tracks[1]?.id||'');
  const from=data.tracks.find(t=>t.id===fromId),to=data.tracks.find(t=>t.id===toId);
  const owner=data.profile.storageKey||'';
  const book=useNotebook(owner);
  const [recipeName,setRecipeName]=useState(''),[recipeNote,setRecipeNote]=useState(''),[recipeRating,setRecipeRating]=useState(0);
  const full=!!data.profile.membership?.fullAccess;
  const [stemDeck,setStemDeck]=useState<'A'|'B'>('A');
  const [stemUse,setStemUse]=useState({A:false,B:false});
  const [stemLevels,setStemLevels]=useState<Record<'A'|'B',StemLevels>>({A:{vocals:1,drums:1,bass:1,other:1},B:{vocals:1,drums:1,bass:1,other:1}});
  const {asset:a,error:errorA}=useAudioAsset(owner,fromId),{asset:b,error:errorB}=useAudioAsset(owner,toId);
  const [settings,setSettings]=useState<AuditionSettings>(transition?.audioSettings||{outPoint:parseCue(transition?.mixOutPoint||'')||0,inPoint:parseCue(transition?.mixInPoint||'')||0,duration:16,mode:'blend',sync:false,preRoll:4,postRoll:4});
  const [zoom,setZoom]=useState(1),[snap,setSnap]=useState(false),[playing,setPlaying]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[elapsed,setElapsed]=useState(0);
  const [loop,setLoop]=useState(false),[rendering,setRendering]=useState(false),[recording,setRecording]=useState('');
  const [compare,setCompare]=useState<{A:AuditionSettings|null;B:AuditionSettings|null}>({A:null,B:null});
  const recordingPlayer=useRef<HTMLAudioElement|null>(null);
  const loopRef=useRef(false),generation=useRef(0);
  const context=useRef<AudioContext|null>(null),playback=useRef<PlayingAudition|null>(null),mounted=useRef(true);
  const buffers=useRef(new Map<string,AudioBuffer>());
  useEffect(()=>{setCompare({A:null,B:null});},[fromId,toId]);
  useEffect(()=>{loopRef.current=loop;},[loop]);
  useEffect(()=>{return()=>{if(recording)URL.revokeObjectURL(recording);};},[recording]);
  useEffect(()=>{setRecording('');},[fromId,toId,settings,stemUse,stemLevels,a?.addedAt,b?.addedAt]);
  useEffect(()=>{buffers.current.clear();},[a?.addedAt,b?.addedAt]);
  useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;generation.current++;playback.current?.stop();buffers.current.clear();void context.current?.close();};},[]);
  useEffect(()=>{
    if(a&&!transition?.audioSettings&&!transition?.mixOutPoint)setSettings(s=>({...s,outPoint:Math.max(0,a.duration-s.duration-4)}));
  },[a?.key,a?.duration,transition?.audioSettings,transition?.mixOutPoint]);
  useEffect(()=>{
    if(!playing)return;
    let frame=0;
    function tick(){const p=playback.current,c=context.current;if(!p||!c)return;const passed=Math.max(0,c.currentTime-p.startedAt);setElapsed(passed);if(passed>=p.plan.length){p.stop();playback.current=null;if(loopRef.current){void play().then(()=>{if(mounted.current&&playback.current)frame=requestAnimationFrame(tick);else if(mounted.current)setPlaying(false);});}else setPlaying(false);return;}frame=requestAnimationFrame(tick);}
    frame=requestAnimationFrame(tick);
    const visibility=()=>{if(document.hidden)stop();};
    document.addEventListener('visibilitychange',visibility);return ()=>{cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',visibility);};
  },[playing]);
  function stop(){generation.current++;playback.current?.stop();playback.current=null;setPlaying(false);setLoading(false);setElapsed(0);}
  function patch(value:Partial<AuditionSettings>){setSettings(s=>({...s,...value}));setError('');}
  function cue(deck:'A'|'B',value:number){const bpm=deck==='A'?from?.bpm:to?.bpm;const duration=deck==='A'?a?.duration:b?.duration;const next=snap&&bpm?Math.round(value/(60/bpm))*(60/bpm):value;patch(deck==='A'?{outPoint:Math.min(duration||900,next)}:{inPoint:Math.min(duration||900,next)});}
  let plan:ReturnType<typeof planAudition>|null=null,planError='';
  if(a&&b){try{plan=planAudition(settings,a.duration,b.duration,from?.bpm||null,to?.bpm||null);}catch(error){planError=error instanceof Error?error.message:'Geçiş ayarlarını kontrol et.';}}
  async function play(chosen=settings){
    setError('');
    if(!a||!b||!from||!to||fromId===toId)return;
    window.dispatchEvent(new Event('mixnotes-provider-stop'));recordingPlayer.current?.pause();
    const ticket=++generation.current;setLoading(true);
    try{
      const c=context.current||new AudioContext({sampleRate:22050});context.current=c;
      await c.resume();
      const decode=async(asset:typeof a)=>{const key=asset.key+asset.addedAt;let buffer=buffers.current.get(key);if(!buffer){buffer=await c.decodeAudioData(await asset.file.arrayBuffer());buffers.current.set(key,buffer);}return buffer;};
      const bufferA=stemUse.A?await mixStems(c,owner,fromId,stemLevels.A):await decode(a);
      const bufferB=stemUse.B?await mixStems(c,owner,toId,stemLevels.B):await decode(b);
      if(!mounted.current||ticket!==generation.current)return;
      playback.current?.stop();playback.current=startAudition(c,bufferA,bufferB,chosen,from.bpm,to.bpm);setElapsed(0);setPlaying(true);
    }catch(error){if(mounted.current)setError(error instanceof Error?error.message:'Ses başlatılamadı. MP3/WAV dosyalarını kontrol et.');}
    finally{if(mounted.current&&ticket===generation.current)setLoading(false);}
  }
  async function save(){
    if(!from||!to||fromId===toId)return;
    const existing=data.transitions.find(t=>t.fromTrackId===fromId&&t.toTrackId===toId);
    const samePair=!!existing;
    const input={fromTrackId:fromId,toTrackId:toId,transitionType:modeLabels[settings.mode],mixOutPoint:secondsLabel(settings.outPoint),mixInPoint:secondsLabel(settings.inPoint),eqTechnique:settings.mode==='bass-swap'?'Geçiş ortasında düşük frekansları A’dan B’ye devret':samePair?existing!.eqTechnique:'',fxNotes:samePair?existing!.fxNotes:'',timingNotes:`${settings.duration.toFixed(1)} saniye · ${settings.sync?'B temposu A’ya eşlendi':'Orijinal tempo'}`,notes:samePair?existing!.notes:'',rating:samePair?existing!.rating:0,difficulty:samePair?existing!.difficulty:0,practiceStatus:samePair?existing!.practiceStatus:'practice',lastPracticed:samePair?existing!.lastPracticed:'',audioSettings:settings};
    await mutate(samePair?{type:'transition.update',id:existing!.id,expectedRevision:existing!.revision,input}:{type:'transition.create',input},'Geçiş ayarları hafızaya kaydedildi');
  }
  async function record(){
    if(!a||!b||!from||!to||!plan)return;setRendering(true);setError('');
    try{const c=context.current||new AudioContext({sampleRate:22050});context.current=c;
      const decode=async(asset:typeof a)=>{const key=asset.key+asset.addedAt;let buffer=buffers.current.get(key);if(!buffer){buffer=await c.decodeAudioData(await asset.file.arrayBuffer());buffers.current.set(key,buffer);}return buffer;};
      const bufferA=stemUse.A?await mixStems(c,owner,fromId,stemLevels.A):await decode(a),bufferB=stemUse.B?await mixStems(c,owner,toId,stemLevels.B):await decode(b);
      const wav=await renderAuditionWav(bufferA,bufferB,settings,from.bpm,to.bpm);if(mounted.current)setRecording(URL.createObjectURL(wav));
    }catch(e){if(mounted.current)setError(e instanceof Error?e.message:'Prova kaydı hazırlanamadı.');}finally{if(mounted.current)setRendering(false);}
  }
  const disabled=playing||loading||rendering;
  const current=playback.current;
  const headA=playing&&current?current.plan.offsetA+elapsed:undefined;
  const headB=playing&&current&&elapsed>=current.plan.preRoll?settings.inPoint+(elapsed-current.plan.preRoll)*current.plan.rateB:undefined;
  return <Localized><section data-localize-attrs="aria-label" className="transition-studio" aria-label="Geçiş dinleme stüdyosu">
    <Pane id="studio">
    <header className="studio-title"><div><p className="overline">Transition Lab</p><h2><L text={"Geçişini gör. Ayarla. Dinle."}/></h2><p><L text={"A’dan B’ye gerçek sesle prova yap."}/></p></div><Headphones size={27}/></header>
    <p className="studio-explanation"><L text={"Apple Music / Spotify oynatıcıları ses analizine açık değildir. Gerçek waveform ve miks için aşağıdaki parçalara kendi ses dosyalarını ekle."}/></p>
    <div className="audio-decks">
      {([{deck:'A' as const,id:fromId,setId:setFromId,track:from,asset:a,point:settings.outPoint,head:headA},{deck:'B' as const,id:toId,setId:setToId,track:to,asset:b,point:settings.inPoint,head:headB}]).map(({deck,id,setId,track,asset,point,head})=><section key={deck} className={`audio-deck audio-deck-${deck.toLowerCase()}`}>
        <div className="deck-title"><b>{deck}</b><label><span>{deck==='A'?<L text={'Çıkış parçası'}/>:<L text={'Giriş parçası'}/>}</span><select value={id} disabled={disabled} onChange={e=>{buffers.current.clear();setId(e.target.value);patch(deck==='A'?{outPoint:0}:{inPoint:0});setStemUse(s=>({...s,[deck]:false}));}}><option value=""><L text={"Parça seç"}/></option>{data.tracks.map(t=><option key={t.id} value={t.id}>{t.title} — {t.artist}</option>)}</select></label></div>
        {asset?<Waveform asset={asset} deck={deck} cue={point} overlap={settings.duration*(deck==='B'?(plan?.rateB||1):1)} playhead={head} zoom={zoom} onCue={disabled?undefined:value=>cue(deck,value)}/>:<div className="waveform-awaiting"><Headphones size={25}/><span><L text={"Ses dosyası eklendiğinde gerçek waveform burada görünür."}/></span></div>}
        <div className="deck-cue"><label>{deck==='A'?<L text={'Mix-out başlangıcı'}/>:<L text={'Mix-in başlangıcı'}/>}<input disabled={disabled||!asset} type="number" min="0" max={asset?.duration||900} step=".01" value={Number(point.toFixed(2))} onChange={e=>cue(deck,Number(e.target.value))}/></label><span>{secondsLabel(point)}{track?.bpm?` · ${track.bpm} BPM`:''}</span></div>
        {track&&<AudioAttachment key={id} compact disabled={disabled} owner={owner} trackId={id}/>}
      </section>)}
    </div>
    <fieldset className="mix-controls" disabled={disabled}><legend className="sr-only"><L text={"Geçiş ayarları"}/></legend>
      <label><L text={"Geçiş biçimi"}/><select value={settings.mode} onChange={e=>patch({mode:e.target.value as FadeMode})}>{Object.entries(modeLabels).map(([id,label])=><option key={id} value={id}><L text={label}/></option>)}</select></label>
      <label><L text={"Örtüşme süresi "}/><b>{settings.duration.toFixed(1)}<L text=" sn"/></b><input type="range" min=".1" max="60" step=".1" value={settings.duration} onChange={e=>patch({duration:Number(e.target.value)})}/></label>
      <label><L text={"Waveform yakınlığı"}/><select value={zoom} onChange={e=>setZoom(Number(e.target.value))}>{[1,4,8,16].map(n=><option key={n} value={n}>{n}×</option>)}</select></label>
      <label className="mix-checkbox"><input type="checkbox" checked={settings.sync} onChange={e=>patch({sync:e.target.checked})}/><L text={"B temposunu A’ya eşle"}/></label>
      <label className="mix-checkbox"><input type="checkbox" checked={snap} onChange={e=>setSnap(e.target.checked)}/><L text={"BPM aralığına yuvarla"}/></label>
      <div className="phrase-buttons"><span><L text={"BPM’den süre"}/></span>{[4,8,16].map(bars=><button type="button" key={bars} className="button secondary" disabled={!from?.bpm} onClick={()=>patch({duration:Math.min(60,bars*4*60/from!.bpm!)})}>{bars} bar</button>)}</div>
    </fieldset>
    <p className="audio-local-note"><L text={"Tempo eşleme B’nin çalma hızını ve tonunu değiştirir. BPM aralığına yuvarlama gerçek beatgrid / downbeat tespiti değildir; cue noktalarını dinleyerek hizala. Prova, geçişin 4 saniye öncesini ve sonrasını da çalar."}/></p>
    <div className="mix-timeline"><span>A</span><div><i style={{width:`${playing&&current?Math.min(100,elapsed/current.plan.length*100):0}%`}}/></div><span>B</span><time>{secondsLabel(elapsed)} / {secondsLabel(plan?.length||0)}</time></div>
    {(error||planError||errorA||errorB)&&<p role="alert" className="inline-error"><L text={error||planError||errorA||errorB}/></p>}
    {fromId===toId&&fromId&&<p className="inline-error"><L text={"İki farklı parça seç."}/></p>}
    <footer className="studio-transport"><button className="button primary" disabled={loading||rendering||!a||!b||!plan||fromId===toId} onClick={playing?stop:()=>void play()}>{loading?<LoaderCircle className="spin" size={16}/>:playing?<Square size={16}/>:<Play size={16}/>} {loading?<L text={'Ses hazırlanıyor…'}/>:playing?<L text={'Durdur'}/>:<L text={'Geçişi dinle'}/>}</button><button className="button secondary" disabled={busy||disabled||!from||!to||fromId===toId||!!planError} onClick={()=>void save()}><Save size={15}/><L text={"Geçişi kaydet"}/></button><span>{a&&b?<L text={'İki ses dosyası hazır'}/>:<L text={'Dinlemek için iki parçaya da ses dosyası ekle'}/>}</span></footer>
    </Pane><Pane id="compare">
    <section className="tool-card rehearsal-tools"><h3><L text="Tekrar et. Dinle. Karşılaştır."/></h3><div className="quick-compare">{(['A','B'] as const).map(slot=><div key={slot}><button className="button secondary" disabled={disabled||!plan} onClick={()=>setCompare(c=>({...c,[slot]:{...settings}}))}>{slot} · <L text="Bu ayarı sakla"/></button><button className="button secondary" disabled={disabled||!compare[slot]||!a||!b||fromId===toId} onClick={()=>{patch(compare[slot]!);void play(compare[slot]!);}}>{slot} · <L text="Dinle"/></button>{compare[slot]&&<small>{modeLabels[compare[slot]!.mode]} · {compare[slot]!.duration.toFixed(1)} s</small>}</div>)}</div><p className="audio-local-note"><L text="İlk ayarı A’ya, alternatifini B’ye sakla. İkisini sırayla dinle; değiştirmek için önce durdur. Bu hızlı karşılaştırma oturum boyunca saklanır."/></p><label className="mix-checkbox"><input type="checkbox" checked={loop} onChange={e=>setLoop(e.target.checked)}/><L text="Geçişi tekrarla"/></label><p className="audio-local-note"><L text="Prova bitince aynı geçiş yeniden başlar. Cue veya efekti değiştirmek için önce durdur."/></p><button className="button secondary" disabled={disabled||!a||!b||!plan||fromId===toId} onClick={()=>void record()}><L text={rendering?'Prova kaydı hazırlanıyor…':'Miks provasını WAV olarak hazırla'}/></button>{recording&&<div className="rehearsal-recording"><audio ref={recordingPlayer} controls preload="metadata" src={recording} onPlay={()=>{window.dispatchEvent(new Event('mixnotes-provider-stop'));stop();}}/><a className="button secondary" href={recording} download="mixnotes-transition.wav"><L text="WAV kaydını indir"/></a></div>}<p className="audio-local-note"><L text="Bu kayıt seçtiğin dosyalar, cue noktaları ve efektlerden bu cihazda oluşturulur. Mikrofon veya Spotify sesi kaydedilmez. Ayar değişince önceki prova temizlenir; saklamak için indir."/></p><BrowserHandoff view="practice"/></section>
    <section className="tool-card"><p className="overline">A/B · Transition versions</p><h3><L text="Alternatifini sakla. Karşılaştır."/></h3><input value={recipeName} maxLength={100} onChange={e=>setRecipeName(e.target.value)} data-localize-attrs="placeholder" placeholder="Versiyon adı"/><textarea value={recipeNote} maxLength={1000} onChange={e=>setRecipeNote(e.target.value)} data-localize-attrs="placeholder" placeholder="Notlar"/><label><L text="Puan"/><select value={recipeRating} onChange={e=>setRecipeRating(Number(e.target.value))}>{[0,1,2,3,4,5].map(n=><option key={n} value={n}>{n}/5</option>)}</select></label><button className="button secondary" disabled={!full||!book.notebook||book.busy||!recipeName.trim()||!from||!to||fromId===toId||disabled||!!planError} onClick={async()=>{if(book.notebook&&await book.save({...book.notebook,recipes:[...book.notebook.recipes,{id:crypto.randomUUID(),name:recipeName.trim(),from:fromId,to:toId,settings:{...settings},rating:recipeRating,note:recipeNote,date:new Date().toISOString()}]})){setRecipeName('');setRecipeNote('');}}}><L text="Yeni versiyon kaydet"/></button><div className="recipe-list">{book.notebook?.recipes.filter(r=>r.from===fromId&&r.to===toId).map(r=><div key={r.id}><button className="button secondary" disabled={disabled} onClick={()=>patch(r.settings)}>{r.name} · {r.rating}/5 · {modeLabels[r.settings.mode]}</button><p>{r.note}</p><button disabled={book.busy} onClick={()=>book.notebook&&void book.save({...book.notebook,recipes:book.notebook.recipes.filter(x=>x.id!==r.id)})}><L text="Sil"/></button></div>)}</div><p className="audio-local-note"><L text="Versiyonu seçip Geçişi dinle’ye bas. Her versiyon cue, efekt, süre ve tempo ayarlarını ayrı saklar."/></p>{book.error&&<p className="inline-error"><L text={book.error}/></p>}</section>
    {full&&<section className="tool-card"><h3><L text="Stem’lerle geçiş yap"/></h3><p><L text="Ana dosyanın yerine ayrı stem’leri miksle. Waveform ana dosyayı gösterir. Stem’ler aynı başlangıç ve süreyle dışa aktarılmalı; bu katman ayarları geçiş versiyonuna dahil değildir."/></p>{(['A','B'] as const).map(deck=><div key={deck}><label className="mix-checkbox"><input disabled={disabled} type="checkbox" checked={stemUse[deck]} onChange={e=>setStemUse(s=>({...s,[deck]:e.target.checked}))}/>{deck} · <L text="Stem kaynağını kullan"/></label>{stemUse[deck]&&stemNames.map(stem=><label key={stem}>{stem}<input disabled={disabled} type="range" min="0" max="1" step=".01" value={stemLevels[deck][stem]} onChange={e=>setStemLevels(s=>({...s,[deck]:{...s[deck],[stem]:Number(e.target.value)}}))}/></label>)}</div>)}<label><L text="Stem dosyalarını düzenle"/><select disabled={disabled} value={stemDeck} onChange={e=>setStemDeck(e.target.value as 'A'|'B')}><option>A</option><option>B</option></select></label>{(stemDeck==='A'?fromId:toId)&&<StemMixer owner={owner} trackId={stemDeck==='A'?fromId:toId}/>}</section>}
    </Pane><Pane id="gear">
    <ControllerPanel owner={owner} onCommand={command=>{if(command==='stop')stop();else if(command==='play'&&!disabled&&a&&b&&plan&&fromId!==toId)void play();else if(command==='save'&&!disabled&&!busy)void save();else if(command==='next-mode'&&!disabled){const modes=Object.keys(modeLabels) as FadeMode[];patch({mode:modes[(modes.indexOf(settings.mode)+1)%modes.length]});}}}/>
    </Pane>
  </section></Localized>;
}
