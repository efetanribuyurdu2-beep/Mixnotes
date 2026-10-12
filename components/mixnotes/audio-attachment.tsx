"use client";
import {CloudAudio} from './cloud-audio';
import {AudioAnalysisPanel} from './audio-analysis-panel';
import {L,Localized} from "./localized";
import {useEffect,useState,useId,useRef} from 'react';
import {LoaderCircle,Upload,X} from 'lucide-react';
import {readLocalAudio,saveLocalAudio,removeLocalAudio,type LocalAudio} from '@/lib/local-audio';
import {secondsLabel} from '@/lib/transition-audio';

export function useAudioAsset(owner:string,trackId:string){
  const [asset,setAsset]=useState<LocalAudio|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
  useEffect(()=>{
    let current=true,sequence=0;
    async function load(){const generation=++sequence;setAsset(null);setError('');setLoading(false);if(!owner||!trackId)return;setLoading(true);try{const result=await readLocalAudio(owner,trackId);if(current&&generation===sequence)setAsset(result||null);}catch(error){if(current&&generation===sequence)setError(error instanceof Error?error.message:'Ses dosyası okunamadı.');}finally{if(current&&generation===sequence)setLoading(false);}}
    void load();window.addEventListener('mixnotes-audio-updated',load);
    return ()=>{current=false;window.removeEventListener('mixnotes-audio-updated',load);};
  },[owner,trackId]);
  return {asset,error,loading};
}
export function Waveform({asset,cue=0,overlap=0,playhead,zoom=1,onCue,deck='A'}:{asset:LocalAudio;cue?:number;overlap?:number;playhead?:number;zoom?:number;onCue?:(seconds:number)=>void;deck?:'A'|'B'}){
  const drag=useRef<{pointer:number;start:number;width:number}|null>(null);
  const [viewport,setViewport]=useState<{start:number;width:number}|null>(null);
  const gradient=useId().replace(/:/g,'');
  const width=viewport?.width??asset.duration/zoom,start=viewport?.start??Math.max(0,Math.min(asset.duration-width,cue-width*.35)),end=start+width;
  const from=Math.floor(start/asset.duration*asset.peaks.length),to=Math.ceil(end/asset.duration*asset.peaks.length);
  const peaks=asset.peaks.slice(from,to),n=peaks.length;
  const path=peaks.map((p,i)=>{const x=(i+.5)*1000/n;return `M${x.toFixed(2)},${60-p*53}V${60+p*53}`;}).join('');
  const percentage=(time:number)=>(time-start)/width*100;
  return <Localized><div className={`audio-waveform deck-${deck.toLowerCase()}`}>
    <div className={`waveform-window${onCue?' is-editable':''}`} onPointerDown={onCue?e=>{if(e.button!==0)return;const box=e.currentTarget.getBoundingClientRect();if(!box.width)return;drag.current={pointer:e.pointerId,start,width};setViewport({start,width});e.currentTarget.setPointerCapture(e.pointerId);onCue(Math.max(0,Math.min(asset.duration,start+(e.clientX-box.left)/box.width*width)));}:undefined} onPointerMove={onCue?e=>{const d=drag.current;if(!d||d.pointer!==e.pointerId)return;const box=e.currentTarget.getBoundingClientRect();onCue(Math.max(0,Math.min(asset.duration,d.start+(e.clientX-box.left)/box.width*d.width)));}:undefined} onPointerUp={e=>{if(drag.current?.pointer===e.pointerId){drag.current=null;setViewport(null);e.currentTarget.releasePointerCapture(e.pointerId);}}} onPointerCancel={()=>{drag.current=null;setViewport(null);}} onLostPointerCapture={()=>{drag.current=null;setViewport(null);}}>

      <svg viewBox="0 0 1000 120" preserveAspectRatio="none" role="img" aria-label={`${deck} parçasının gerçek ses örneklerinden oluşturulan waveform`}><defs><linearGradient id={gradient} x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stopColor="#ffae85"/><stop offset="35%" stopColor="#f4a9ce"/><stop offset="70%" stopColor="#b89cf5"/><stop offset="100%" stopColor="#8ed9c1"/></linearGradient></defs><path d={path} stroke={`url(#${gradient})`} strokeWidth={Math.max(.6,1000/n*.65)} fill="none"/><line x1="0" y1="60" x2="1000" y2="60" stroke="currentColor" opacity=".2"/></svg>
      {overlap>0 && <span className="wave-overlap" style={{left:`${Math.max(0,percentage(cue))}%`,width:`${Math.max(0,Math.min(100,percentage(cue+overlap))-Math.max(0,percentage(cue)))}%`}}/>}
      {cue>=start&&cue<=end&&<span className="wave-cue" style={{left:`${percentage(cue)}%`}}><b>CUE</b></span>}
      {playhead!==undefined&&playhead>=start&&playhead<=end&&<span className="wave-playhead" style={{left:`${percentage(playhead)}%`}}/>}
    </div>
    <div className="waveform-times"><span>{secondsLabel(start)}</span><span>{secondsLabel(end)}</span></div>
    {onCue&&<p className="audio-local-note"><L text="Cue çizgisini sürükle veya waveform’a dokun. Altındaki sürgüyle de ince ayar yapabilirsin."/></p>}
    {onCue&&<input type="range" min="0" max={asset.duration} step=".01" value={cue} onChange={e=>onCue(Number(e.target.value))} aria-label={`${deck} cue noktası`} aria-valuetext={secondsLabel(cue)}/>}
  </div></Localized>;
}
export function AudioAttachment({owner,trackId,compact=false,disabled=false}:{owner:string;trackId:string;compact?:boolean;disabled?:boolean}){
  const {asset,error:loadError}=useAudioAsset(owner,trackId);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  return <Localized><section className={`audio-attachment${compact?' compact':''}`}>
    <div className="section-title-row"><span className="overline"><L text={"Geçiş için ses dosyası"}/></span>{asset&&<button data-localize-attrs="aria-label" className="icon-control" disabled={busy||disabled} aria-label="Bu cihazdaki ses dosyasını kaldır" onClick={async()=>{setBusy(true);setError('');try{await removeLocalAudio(owner,trackId);}catch(error){setError(error instanceof Error?error.message:'Silinemedi.');}finally{setBusy(false);}}}><X size={14}/></button>}</div>
    {asset&&<><p className="audio-filename">{asset.name}<small>{secondsLabel(asset.duration)}<L text={" · Gerçek waveform"}/></small></p>{!compact&&<Waveform asset={asset}/>}<AudioAnalysisPanel trackId={trackId} asset={asset}/></>}
    <label className={`button secondary audio-upload${busy||disabled?' is-disabled':''}`}>{busy?<LoaderCircle className="spin" size={15}/>:<Upload size={15}/>} {busy?<L text={'Ses analiz ediliyor…'}/>:asset?<L text={'Ses dosyasını değiştir'}/>:<L text={'MP3 / WAV ekle'}/>}<input disabled={busy||disabled||!owner} type="file" accept=".mp3,.wav,.m4a,.aac,.ogg,.flac,audio/*" onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;setBusy(true);setError('');try{await saveLocalAudio(owner,trackId,file);}catch(error){setError(error instanceof Error?error.message:'Ses dosyası eklenemedi.');}finally{setBusy(false);}}}/></label>
    {(error||loadError)&&<p role="alert" className="inline-error"><L text={error||loadError}/></p>}
    {asset?.storage==='session'&&<p className="audio-session-warning" role="status"><L text="Ses dinlemeye hazır. Tarayıcı kalıcı kaydı reddettiği için bu dosya yalnızca açık oturumda kullanılabilir. Sayfayı kapatır veya yenilersen ses dosyasını tekrar seçmen gerekir; Library kaydın korunur."/></p>}
    <CloudAudio owner={owner} trackId={trackId} asset={asset} disabled={busy||disabled}/>
    <p className="audio-local-note"><L text={"Ses dosyası önce bu cihazda saklanır. Bulut kopyasını ayrıca kaydedebilirsin. Ses JSON yedeğine dahil değildir. Yerel dosya: en fazla 50 MB / 15 dakika."}/></p>
  </section></Localized>;
}
