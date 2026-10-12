"use client";
import {L,Localized} from "./localized";
import {useState} from 'react';
import {avatars, type AvatarId} from '@/lib/avatars';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {useWorkspace} from './workspace-context';

export function AvatarArt({id}:{id:AvatarId}){
 const avatar=avatars.find(a=>a.id===id)??avatars[0];
 return <Localized><svg viewBox="0 0 80 80" aria-hidden="true" focusable="false"><rect width="80" height="80" rx="24" fill={avatar.color}/><circle cx="65" cy="14" r="20" fill="#fff" opacity=".18"/>
 <g stroke={avatar.ink} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
 {id==='headphones'&&<><path d="M16 42V36a24 24 0 0 1 48 0v6" fill="none"/><path d="M25 34q15-18 30 0v20q-15 20-30 0Z" fill="#fff" fillOpacity=".65"/><rect x="12" y="36" width="12" height="22" rx="6" fill={avatar.ink}/><rect x="56" y="36" width="12" height="22" rx="6" fill={avatar.ink}/></>}
 {id==='cat'&&<><path d="M20 41 19 19l18 14h6l18-14-1 22q8 23-20 25Q12 64 20 41Z" fill="#fff" fillOpacity=".55"/><path d="m15 48 11 3m-12 7 12-2m39-8-11 3m12 7-12-2" fill="none"/></>}
 {id==='robot'&&<><path d="M40 23V15"/><circle cx="40" cy="12" r="4" fill={avatar.ink}/><rect x="19" y="26" width="42" height="38" rx="12" fill="#fff" fillOpacity=".6"/><path d="M13 39v12m54-12v12"/><path d="M31 55h18"/></>}
 {id==='alien'&&<><path d="M17 35q0-20 23-20t23 20q0 19-23 32Q17 54 17 35Z" fill="#fff" fillOpacity=".5"/><path d="M24 33q12 0 11 13-12-2-11-13Zm32 0q-12 0-11 13 12-2 11-13Z" fill={avatar.ink}/></>}
 {id==='vinyl'&&<><circle cx="40" cy="40" r="26" fill={avatar.ink}/><circle cx="40" cy="40" r="19" stroke={avatar.color} strokeOpacity=".4" fill="none"/><circle cx="40" cy="40" r="13" fill={avatar.color} stroke="none"/><path d="m57 17 9 7-8 15" fill="none"/><circle cx="58" cy="40" r="4" fill="#fff" stroke="none"/></>}
 {id!=='alien'&&id!=='vinyl'&&<><path d="M31 42v3m18-3v3"/><path d="M34 53q6 5 12 0" fill="none"/></>}
 {id==='alien'&&<path d="M35 55q5 4 10 0" fill="none"/>}
 </g></svg></Localized>;
}
export function ProfileAvatar(){
 const {data,busy,mutate}=useWorkspace();
 const current=avatars.find(a=>a.id===data.profile.avatarId)?.id??'headphones';
 const [open,setOpen]=useState(!data.profile.avatarId&&data.tracks.length===0);
 const [selected,setSelected]=useState<AvatarId>(current);
 const [saving,setSaving]=useState(false);
 function show(){setSelected(current);setOpen(true);}
 async function save(){if(saving||busy)return;setSaving(true);try{if(await mutate({type:'profile.avatar',avatarId:selected},'Avatarın güncellendi'))setOpen(false);}finally{setSaving(false);}}
 return <Localized><><button data-localize-attrs="aria-label" className="profile-chip avatar-chip" aria-label="Hesabım · avatar değiştir" title={`${data.profile.displayName} · ${data.profile.language === "en" ? "Change avatar" : "Avatar değiştir"}`} onClick={show}><AvatarArt id={current}/></button>
 <Dialog open={open} onOpenChange={value=>{if(!saving)setOpen(value);}}><DialogContent className="workspace-editor avatar-dialog"><DialogTitle><L text={"Ritmini seç."}/></DialogTitle><DialogDescription><L text={"MixNotes’ta seni hangi avatar temsil etsin?"}/></DialogDescription><label className="profile-language"><L text="Dil"/><select aria-label="Language" value={data.profile.language??"tr"} disabled={busy||saving} onChange={e=>void mutate({type:"profile.language",language:e.target.value},"Dil tercihin kaydedildi")}><option value="tr">Türkçe</option><option value="en">English</option></select></label><div data-localize-attrs="aria-label" className="avatar-options" role="group" aria-label="Avatar seçimi">{avatars.map(avatar=><button key={avatar.id} className={selected===avatar.id?'selected':''} aria-pressed={selected===avatar.id} disabled={busy||saving} onClick={()=>setSelected(avatar.id)}><AvatarArt id={avatar.id}/><span><L text={avatar.name}/></span></button>)}</div><div className="editor-footer"><button className="button secondary" disabled={saving} onClick={()=>setOpen(false)}><L text={"Daha sonra"}/></button><button className="button primary" disabled={busy||saving} onClick={save}>{saving?<L text={'Kaydediliyor…'}/>:<L text={'Avatarı kaydet'}/>}</button></div></DialogContent></Dialog></></Localized>;
}
