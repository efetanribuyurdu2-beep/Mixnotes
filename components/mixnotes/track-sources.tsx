"use client";
import {SourcePlayerButton} from './provider-player';
import {L,Localized} from "./localized";
import { useCallback,useRef,useState,type FormEvent } from "react";
import { ExternalLink, Plus, X } from "lucide-react";
import { useWorkspace } from "./workspace-context";
import type { Track } from "@/lib/workspace-types";
import { TrackLinkInput } from "./track-link-preview";
import type { LinkMetadata } from "@/lib/workspace-types";
const labels:Record<string,string>={reference:"Referans",owned:"Elimde var",purchase:"Satın alma",pool:"DJ pool"};
export function TrackSources({track}:{track:Track}){
  const {busy,mutate}=useWorkspace();
  const formRef=useRef<HTMLFormElement>(null);
  const [linkLoading,setLinkLoading]=useState(false);
  const applyMetadata=useCallback((metadata:LinkMetadata|null)=>{const field=formRef.current?.elements.namedItem('provider') as HTMLInputElement|null;if(field&&metadata)field.value=metadata.provider;},[]);
  const [open,setOpen]=useState(false),[remove,setRemove]=useState("");
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);if(await mutate({type:"source.add",trackId:track.id,input:{provider:f.get('provider'),url:f.get('url'),availability:f.get('availability')}},"Kaynak eklendi"))setOpen(false);}
  return <Localized><section className="track-sources"><div className="section-title-row"><span className="overline"><L text={"KAYNAKLAR / "}/>{track.sources.length}</span><button className="icon-control" aria-label="Kaynak ekle" onClick={()=>setOpen(v=>!v)}><Plus size={15}/></button></div>{track.sources.map(source=><div className="track-source-row" key={source.id}><div><SourcePlayerButton url={source.externalUrl} label={source.provider}/><small>{labels[source.availability]||source.availability}</small></div>{remove===source.id?<div><button className="text-action" disabled={busy} onClick={async()=>{if(await mutate({type:"source.delete",id:source.id,trackId:track.id},"Kaynak silindi"))setRemove("");}}><L text={"Sil"}/></button><button className="text-action" onClick={()=>setRemove("")}><L text={"Vazgeç"}/></button></div>:<button className="icon-control" aria-label={`${source.provider} kaynağını kaldır`} onClick={()=>setRemove(source.id)}><X size={13}/></button>}</div>)}{open&&<form ref={formRef} className="source-form" onSubmit={submit}><TrackLinkInput inputName="url" onMetadata={applyMetadata} onLoading={setLinkLoading}/><label className="form-field"><span><L text={"Kaynak adı"}/></span><input name="provider" required maxLength={200} placeholder="Beatport / BPM Supreme"/></label><label className="form-field"><span><L text={"Erişim durumu"}/></span><select name="availability"><option value="reference"><L text={"Referans"}/></option><option value="owned"><L text={"Elimde var"}/></option><option value="purchase"><L text={"Satın alma"}/></option><option value="pool">DJ pool</option></select></label><button className="button secondary" disabled={busy||linkLoading}><L text={"Kaynağı kaydet"}/></button></form>}</section></Localized>;
}
