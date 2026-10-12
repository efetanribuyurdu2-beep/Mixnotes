"use client";
import {ProviderPlayer} from './provider-player';
import {L,Localized} from "./localized";
import { useEffect, useState } from 'react';
import { ExternalLink, LoaderCircle, Music2 } from 'lucide-react';
import type { LinkMetadata } from '@/lib/workspace-types';
import { lookupLinkMetadata } from '@/lib/client-track-link';

export function TrackLinkPreview({metadata, player = false}:{metadata: LinkMetadata; player?: boolean}) {
  const [imageFailed,setImageFailed] = useState(false);
  useEffect(()=>setImageFailed(false),[metadata.artworkUrl]);
  return <Localized><div className="link-preview">
    <div className="link-preview-main">
      {metadata.artworkUrl && !imageFailed ? <img className="link-artwork" src={metadata.artworkUrl} alt={`${metadata.title} kapak görseli`} onError={()=>setImageFailed(true)} referrerPolicy="no-referrer" /> : <span className="link-artwork placeholder"><Music2 size={28}/></span>}
      <div><small>{metadata.provider}</small><strong>{metadata.title}</strong><p>{metadata.artist || (metadata.creator ? `Kanal: ${metadata.creator}` : 'Sanatçı bilgisi kaynakta yok')}</p>{metadata.album && <p>{metadata.album}</p>}<div className="link-meta-chips">{metadata.genre && <span>{metadata.genre}</span>}{metadata.durationSeconds && <span>{Math.floor(metadata.durationSeconds/60)}:{String(metadata.durationSeconds%60).padStart(2,'0')}</span>}{metadata.releaseDate && <span>{metadata.releaseDate}</span>}</div><a className="text-action" href={metadata.url} target="_top" rel="noreferrer">{metadata.provider}<L text={"’ta aç "}/><ExternalLink size={13}/></a></div>
    </div>
    {player&&<ProviderPlayer url={metadata.url} title={metadata.title}/>}
  </div></Localized>;
}

export function TrackLinkInput({initialUrl='',initialMetadata,onMetadata,onLoading,inputName='sourceUrl'}:{inputName?:string;initialUrl?:string;initialMetadata?:LinkMetadata|null;onMetadata:(value:LinkMetadata|null)=>void;onLoading:(loading:boolean)=>void}) {
  const [url,setUrl]=useState(initialUrl),[metadata,setMetadata]=useState(initialMetadata||null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{
    if (url === initialUrl && !retry) return;
    setMetadata(null); onMetadata(null); setError('');
    if (!url.trim()) { setLoading(false); onLoading(false); return; }
    const controller=new AbortController(); let current=true;
    setLoading(true); onLoading(true);
    const timer=setTimeout(async()=>{
      try {
        const metadata=await lookupLinkMetadata(url.trim(),controller.signal);
        if(current){setMetadata(metadata);onMetadata(metadata);}
      }catch(error){if(current && !controller.signal.aborted)setError(error instanceof Error ? error.message : 'Parça bilgileri alınamadı.');}
      finally{if(current){setLoading(false);onLoading(false);}}
    },600);
    return ()=>{current=false;clearTimeout(timer);controller.abort();};
  },[url,retry,initialUrl,onMetadata,onLoading]);
  return <Localized><section data-localize-attrs="aria-label" className="link-import-panel" aria-label="Bağlantıdan parça ekle">
    <label className="form-field"><span><L text={"Parça bağlantısını yapıştır"}/></span><input name={inputName} type="url" value={url} onChange={e=>setUrl(e.target.value)} maxLength={2000} data-localize-attrs="placeholder" placeholder="Apple Music, Spotify, YouTube, SoundCloud veya Beatport" autoFocus={!initialUrl} /><small><L text={"Bağlantıdan erişilebilen bilgiler otomatik doldurulur. Dilersen elle düzenleyebilirsin."}/></small></label>
    {url && !metadata && !loading && !error && <button type="button" className="text-action" onClick={()=>setRetry(v=>v+1)}><L text={"Bağlantıdan bilgileri getir"}/></button>}
    <div aria-live="polite">{loading && <p className="link-loading"><LoaderCircle className="spin" size={16}/><L text={" Parça bilgileri getiriliyor…"}/></p>}{error && <div className="link-error"><p><L text={error}/></p><button type="button" className="text-action" onClick={()=>setRetry(v=>v+1)}><L text={"Tekrar dene"}/></button><span><L text={" veya aşağıdaki alanları elle doldur."}/></span></div>}</div>
    {metadata && <><TrackLinkPreview metadata={metadata} player/><p className="link-import-note"><L text={"BPM ve Key kaynakta yoksa boş kalır. YouTube kanal adı, sanatçı adı olarak doldurulmaz."}/></p></>}
  </section></Localized>;
}
