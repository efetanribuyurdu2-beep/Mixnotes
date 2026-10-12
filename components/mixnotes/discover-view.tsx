"use client";
import {L,Localized} from "./localized";
import { useState, type FormEvent } from "react";
import { Compass, ExternalLink, Plus, Search, Check } from "lucide-react";
import { useWorkspace } from "./workspace-context";
import {SourceDesk} from "./source-desk";
import { trackInputFrom } from "@/lib/dj-logic";

type Result={id:string;title:string;artist:string;genre:string;durationSeconds:number|null;url:string};
export function DiscoverView(){
  const {data,mutate,busy,openEditor,setView,setSelectedTrackId}=useWorkspace();
  const [query,setQuery]=useState(""),[results,setResults]=useState<Result[]|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState("");
  const queue=data.tracks.filter(t=>t.origin==="discovery");
  async function search(event:FormEvent){event.preventDefault();setLoading(true);setError("");setResults(null);try{const response=await fetch(`/api/discover?q=${encodeURIComponent(query)}`);const payload=await response.json() as {error?:string;results:Result[]};if(!response.ok)throw new Error(payload.error||"Katalog araması başarısız.");setResults(payload.results);}catch(e){setError((e as Error).message);}finally{setLoading(false);}}
  const saved=(r:Result)=>data.tracks.some(t=>t.sources.some(s=>s.externalUrl===r.url)||(t.title.toLocaleLowerCase()===r.title.toLocaleLowerCase()&&t.artist.toLocaleLowerCase()===r.artist.toLocaleLowerCase()));
  async function capture(r:Result){await mutate({type:"tracks.import",inputs:[{title:r.title,artist:r.artist,genre:r.genre,durationSeconds:r.durationSeconds,origin:"discovery",sourceProvider:"iTunes",sourceUrl:r.url}]},"Keşif kuyruğuna kaydedildi");}
  return <Localized><div className="view discover-view">
    <header className="view-header"><div><p className="overline">DISCOVER / 01</p><h1><L text={"Bir sonraki sesini bul."}/></h1><p className="view-intro"><L text={"Katalogda ara, kaynaklarını aç, aday parçaları hazırlık kuyruğuna al."}/></p></div><button className="button secondary" onClick={()=>openEditor({kind:"track",origin:"discovery"})}><Plus size={16}/><L text={" Bağlantı / fikir kaydet"}/></button></header>
    <section className="discovery-search-panel"><Compass size={25}/><div><h2><L text={"Katalog araması"}/></h2><p><L text={"iTunes kataloğundaki parça bilgileri. BPM ve key bilgilerini daha sonra ekleyebilirsin."}/></p></div><form className="catalog-search" onSubmit={search}><label className="search-field"><Search size={17}/><input data-localize-attrs="aria-label,placeholder" aria-label="Katalogda sanatçı veya parça ara" value={query} onChange={e=>setQuery(e.target.value)} minLength={2} maxLength={100} required placeholder="Sanatçı veya parça adı…"/></label><button className="button primary" disabled={loading}>{loading?<L text={"Aranıyor…"}/>:<L text={"Ara"}/>}</button></form></section>
    {error&&<div className="inline-error" role="alert"><L text={error}/></div>}
    {results&&<section className="home-section"><div className="section-title-row"><h2><L text={"Arama sonuçları"}/></h2><span>{results.length}<L text={" parça"}/></span></div>{!results.length&&<p className="muted-copy"><L text={"Sonuç yok. Sanatçı veya parça adıyla yeniden ara."}/></p>}<div className="catalog-results">{results.map(r=><article key={r.id} className="catalog-result"><div className="record-mark">♪</div><div><strong>{r.title}</strong><p>{r.artist}</p><small>{r.genre}</small></div><div className="catalog-actions"><a className="text-action" href={r.url} target="_top" rel="noreferrer"><L text={"iTunes’ta aç "}/><ExternalLink size={13}/></a><button className="button secondary" disabled={busy||saved(r)} onClick={()=>capture(r)}>{saved(r)?<Check size={14}/>:<Plus size={14}/>} {saved(r)?<L text={"Kayıtlı"}/>:<L text={"Kaydet"}/>}</button></div></article>)}</div></section>}
    <SourceDesk/>
    <section className="home-section"><div className="section-title-row"><div><p className="overline">CAPTURE QUEUE</p><h2><L text={"Dinle, değerlendir, Library’ye al"}/></h2></div><span>{queue.length} <L text="aday"/></span></div>{queue.length?<div className="catalog-results">{queue.map(t=><article className="catalog-result" key={t.id}><div className="record-mark">{t.musicalKey||"♪"}</div><button className="capture-title" onClick={()=>{setSelectedTrackId(t.id);setView("library");}}><strong>{t.title}</strong><p>{t.artist||<L text={"Sanatçı ekle"}/>}</p></button><button className="button primary" disabled={busy} onClick={()=>mutate({type:"track.update",id:t.id,expectedRevision:t.revision,input:{...trackInputFrom(t),origin:"library"}},"Library’ye alındı")}><Check size={14}/><L text={" Library’ye al"}/></button></article>)}</div>:<p className="muted-copy"><L text={"Henüz aday parça yok. Aramadan bir parçayı kaydet veya kendi bağlantını ekle."}/></p>}</section>
  </div></Localized>;
}
