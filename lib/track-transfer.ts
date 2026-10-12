import { importedTrackSchema } from "./workspace-validation";
import type { Track, TrackInput } from "./workspace-types";

export function parseDelimited(text:string):string[][] {
  const clean=text.replace(/^\uFEFF/,"");
  const first=clean.split(/\r?\n/)[0]??"";
  const delimiter=first.includes('\t')?'\t':first.split(';').length>first.split(',').length?';':',';
  const rows:string[][]=[];let row:string[]=[],field="",quoted=false;
  for(let i=0;i<clean.length;i++){
    const c=clean[i];
    if(c==='"'){
      if(quoted&&clean[i+1]==='"'){field+='"';i++;}else quoted=!quoted;
    }else if(!quoted&&c===delimiter){row.push(field);field="";}
    else if(!quoted&&(c==='\n'||c==='\r')){if(c==='\r'&&clean[i+1]==='\n')i++;row.push(field);if(row.some(v=>v.trim()))rows.push(row);row=[];field="";}
    else field+=c;
  }
  if(quoted)throw new Error("CSV’de kapanmamış tırnak var.");
  row.push(field);if(row.some(v=>v.trim()))rows.push(row);
  return rows;
}
const normalize=(s:string)=>s.trim().toLocaleLowerCase('en-US').replace(/[ _#.-]/g,'');
export function parseTrackFile(text:string):TrackInput[]{
  const [head,...rows]=parseDelimited(text);
  if(!head||!rows.length)throw new Error("Başlık satırı ve en az bir parça gerekir.");
  if(rows.length>200)throw new Error("Bir dosyada en fazla 200 parça aktarabilirsin.");
  const columns=head.map(normalize);
  const cell=(row:string[],names:string[])=>{const i=columns.findIndex(c=>names.includes(c));return i<0?'':(row[i]??'').trim();};
  if(!columns.some(c=>['title','tracktitle','name','song','parçaadı'].includes(c)))throw new Error("Title / Track Title sütunu bulunamadı. Örnek CSV’yi kullanabilirsin.");
  return rows.map((row,index)=>{
    const numeric=(names:string[])=>{const s=cell(row,names);return s?Number(s.replace(',','.')):null;};
    let duration=numeric(['durationseconds']);
    const time=cell(row,['time','duration']);
    if(duration===null&&time){const parts=time.split(':').map(Number);duration=parts.length===2?parts[0]*60+parts[1]:parts.length===3?parts[0]*3600+parts[1]*60+parts[2]:Number(time);}
    const result=importedTrackSchema.safeParse({title:cell(row,['title','tracktitle','name','song','parçaadı']),artist:cell(row,['artist','sanatçı']),version:cell(row,['version','remix']),bpm:numeric(['bpm','tempo']),musicalKey:cell(row,['key','musicalkey']),genre:cell(row,['genre','tür']),energy:numeric(['energy']),rating:numeric(['rating'])??0,tags:cell(row,['tags']).split('|').map(s=>s.trim()).filter(Boolean),notes:cell(row,['notes','comments','comment']),cueNotes:cell(row,['cuenotes']),durationSeconds:duration,sourceProvider:cell(row,['sourceprovider']),sourceUrl:cell(row,['sourceurl']),origin:'library'});
    if(!result.success)throw new Error(`Satır ${index+2}: ${result.error.issues[0].path.join('.')} alanını kontrol et.`);
    return result.data;
  });
}
function csvCell(value:unknown){let text=String(value??'');if(/^[=+@-]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}
export function tracksCsv(tracks:Track[]){
  const fields=['title','artist','version','bpm','key','genre','energy','rating','tags','notes','cueNotes','durationSeconds','sourceProvider','sourceUrl'];
  const rows=tracks.map(t=>[t.title,t.artist,t.version,t.bpm,t.musicalKey,t.genre,t.energy,t.rating,t.tags.join('|'),t.notes,t.cueNotes,t.durationSeconds,t.sources[0]?.provider??'',t.sources[0]?.externalUrl??'']);
  return '\uFEFF'+[fields,...rows].map(r=>r.map(csvCell).join(',')).join('\r\n');
}
export function downloadText(name:string,text:string,type:string){const url=URL.createObjectURL(new Blob([text],{type}));const anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();URL.revokeObjectURL(url);}
