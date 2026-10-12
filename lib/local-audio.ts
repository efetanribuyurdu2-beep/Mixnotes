import {waveformPeaks} from './transition-audio';
export type LocalAudio = {key:string;name:string;file:Blob;duration:number;peaks:number[];addedAt:string;storage?:'persistent'|'session'};
export type AnalyzedAudio = Omit<LocalAudio,'key'>;
type StoredAudio = Omit<LocalAudio,'file'|'storage'> & {file?:Blob;bytes?:ArrayBuffer;mime?:string};
// Some iOS webviews refuse IndexedDB Blob/File writes. Store ordinary bytes and
// rebuild a Blob when reading. Keep a session copy if persistence is unavailable.
const sessionAssets=new Map<string,LocalAudio>();
function key(owner:string,trackId:string){if(!owner)throw new Error('Ses dosyası eklemek için çalışma alanını yenile.');return `${owner}:${trackId}`;}
function storageError(error:DOMException|null|undefined){
 if(error?.name==='QuotaExceededError')return new Error('Tarayıcının siteye ayırdığı ses alanı dolu. Bu, cihazının boş alanından farklıdır.');
 return new Error('Bu tarayıcı ses dosyasını kalıcı kaydetmeye izin vermedi.');
}
function openStore():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{
 let request:IDBOpenDBRequest,finished=false;
 const fail=(error:Error)=>{finished=true;clearTimeout(timer);reject(error);};
 const timer=setTimeout(()=>fail(storageError(undefined)),8000);
 try{request=indexedDB.open('mixnotes-audio',1);}catch(error){fail(storageError(error as DOMException));return;}
 request.onupgradeneeded=()=>request.result.createObjectStore('tracks',{keyPath:'key'});
 request.onsuccess=()=>{clearTimeout(timer);if(finished){request.result.close();return;}finished=true;resolve(request.result);};
 request.onerror=()=>fail(storageError(request.error));
 request.onblocked=()=>fail(new Error('Ses arşivi başka bir sekmede açık. Diğer MixNotes sekmesini kapatıp tekrar dene.'));
});}
async function operation<T>(mode:IDBTransactionMode,run:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T>{
 const db=await openStore();return new Promise((resolve,reject)=>{
  let tx:IDBTransaction;
  try{tx=db.transaction('tracks',mode);}catch(error){db.close();reject(storageError(error as DOMException));return;}
  const timer=setTimeout(()=>{try{tx.abort();}catch{}db.close();reject(storageError(undefined));},8000);
  let result:T;
  tx.oncomplete=()=>{clearTimeout(timer);db.close();resolve(result);};
  tx.onerror=tx.onabort=()=>{clearTimeout(timer);db.close();reject(storageError(tx.error));};
  try{const request=run(tx.objectStore('tracks'));request.onsuccess=()=>{result=request.result;};}
  catch(error){clearTimeout(timer);try{tx.abort();}catch{}db.close();reject(storageError(error as DOMException));}
 });
}
export async function readLocalAudio(owner:string,trackId:string){
 const id=key(owner,trackId);const temporary=sessionAssets.get(id);if(temporary)return temporary;
 const stored=await operation<StoredAudio|undefined>('readonly',store=>store.get(id));
 if(!stored)return undefined;
 const file=stored.bytes?new Blob([stored.bytes],{type:stored.mime||'application/octet-stream'}):stored.file;
 if(!file)throw new Error('Ses dosyasını yeniden seç. Library kaydın korunuyor.');
 return {key:stored.key,name:stored.name,file,duration:stored.duration,peaks:stored.peaks,addedAt:stored.addedAt,storage:'persistent' as const};
}
function updated(){window.dispatchEvent(new Event('mixnotes-audio-updated'));}
export async function removeLocalAudio(owner:string,trackId:string){
 const id=key(owner,trackId);
 // Attempt persistent deletion before clearing a session-only attachment.
 try{await operation('readwrite',store=>store.delete(id));}catch(error){if(!sessionAssets.has(id))throw error;}
 sessionAssets.delete(id);updated();
}
export async function analyzeAudioFile(file:File):Promise<AnalyzedAudio>{
 if(file.size>50*1024*1024)throw new Error('En fazla 50 MB ses dosyası ekleyebilirsin.');
 if(!/\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(file.name))throw new Error('MP3, WAV, M4A, AAC, OGG veya FLAC dosyası seç.');
 const context=new AudioContext({sampleRate:22050});
 try{
  const bytes=await file.arrayBuffer();
  // decodeAudioData may detach its input; preserve an independent byte copy.
  const audio=await context.decodeAudioData(bytes.slice(0));
  if(audio.duration>900)throw new Error('Tek parça en fazla 15 dakika olabilir.');
  return {name:file.name,file:new Blob([bytes],{type:file.type||'application/octet-stream'}),duration:audio.duration,peaks:waveformPeaks(Array.from({length:audio.numberOfChannels},(_,i)=>audio.getChannelData(i))),addedAt:new Date().toISOString()};
 }catch(error){if(error instanceof DOMException&&error.name==='EncodingError')throw new Error('Ses dosyası çözülemedi. MP3 veya WAV sürümünü dene.');throw error;}finally{await context.close();}
}
export async function storeAnalyzedAudio(owner:string,trackId:string,audio:AnalyzedAudio){
 const id=key(owner,trackId);
 const asset:LocalAudio={...audio,key:id,storage:'persistent'};
 const record:StoredAudio={key:id,name:audio.name,bytes:await audio.file.arrayBuffer(),mime:audio.file.type,duration:audio.duration,peaks:audio.peaks,addedAt:audio.addedAt};
 try{await operation('readwrite',store=>store.put(record));sessionAssets.delete(id);}
 catch{asset.storage='session';sessionAssets.set(id,asset);}
 updated();return asset;
}
export async function saveLocalAudio(owner:string,trackId:string,file:File){return storeAnalyzedAudio(owner,trackId,await analyzeAudioFile(file));}

// Inventory only: avoid loading every large audio Blob for a set readiness check.
export async function localAudioIds(owner:string){
 const prefix=key(owner,'');const temporary=[...sessionAssets.keys()].filter(k=>k.startsWith(prefix)).map(k=>k.slice(prefix.length));
 try{const stored=await operation<IDBValidKey[]>('readonly',store=>store.getAllKeys());return {ids:new Set([...temporary,...stored.filter((k):k is string=>typeof k==='string'&&k.startsWith(prefix)).map(k=>k.slice(prefix.length))]),error:''};}
 catch{return {ids:new Set(temporary),error:'Bu tarayıcıdaki ses arşivi kontrol edilemedi. Dosyaları Library’den kontrol et.'};}
}
