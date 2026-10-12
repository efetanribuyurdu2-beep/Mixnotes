import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundled=await build({entryPoints:['lib/local-audio.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const audio=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
test('audio import validates files before storage, computes real peaks, and closes decoder on failure',async()=>{
 let opened=0,closed=0,duration=180,fail=false;
 globalThis.AudioContext=class{constructor(){opened++;}async decodeAudioData(){if(fail)throw new DOMException('bad file','EncodingError');return{duration,numberOfChannels:1,getChannelData(){return new Float32Array([0,.8,-.4,0]);}};}async close(){closed++;}};
 const file=new File([new Uint8Array(16)],'Artist - Song.wav',{type:'audio/wav'});
 await assert.rejects(()=>audio.analyzeAudioFile(new File(['bad'],'list.csv')),/dosyası seç/);
 assert.equal(opened,0);
 const asset=await audio.analyzeAudioFile(file);
 assert.equal(asset.name,file.name);assert.equal(asset.duration,180);assert.ok(Math.max(...asset.peaks)>.79);assert.deepEqual(new Uint8Array(await asset.file.arrayBuffer()),new Uint8Array(await file.arrayBuffer()));assert.equal(closed,1);
 duration=901;await assert.rejects(()=>audio.analyzeAudioFile(file),/15 dakika/);assert.equal(closed,2);
 fail=true;await assert.rejects(()=>audio.analyzeAudioFile(file),/çözülemedi/);assert.equal(closed,3);
 await assert.rejects(()=>audio.storeAnalyzedAudio('', 'track',asset),/yenile/);
});


test('iOS-compatible persistence stores byte buffers, restores playable Blobs and supports old records',async()=>{
 const records=new Map();let saved,failWrite=false;
 globalThis.window=new EventTarget();
 globalThis.indexedDB={open(){const request={};queueMicrotask(()=>{request.result={close(){},transaction(){const tx={objectStore(){return{put(record){if(failWrite){const req={};queueMicrotask(()=>{tx.error=new DOMException("WebView transaction failed","UnknownError");tx.onabort?.();});return req;}assert.ok(record.bytes instanceof ArrayBuffer);assert.equal(record.file,undefined);saved=structuredClone(record);records.set(record.key,saved);return action(record.key);},get(key){return action(records.get(key));},delete(key){records.delete(key);return action(undefined);}};},abort(){tx.onabort?.();}};function action(result){const req={result};queueMicrotask(()=>{req.onsuccess?.();queueMicrotask(()=>tx.oncomplete?.());});return req;}return tx;}};request.onsuccess?.();});return request;}};
 const asset={name:'song.mp3',file:new Blob([new Uint8Array([1,2,3,4])],{type:'audio/mpeg'}),duration:10,peaks:[.2,.5],addedAt:'now'};
 const result=await audio.storeAnalyzedAudio('alice','bytes',asset);assert.equal(result.storage,'persistent');assert.equal(saved.bytes.byteLength,4);
 const restored=await audio.readLocalAudio('alice','bytes');assert.equal(restored.file.type,'audio/mpeg');assert.deepEqual([...new Uint8Array(await restored.file.arrayBuffer())],[1,2,3,4]);assert.equal(restored.duration,10);
 assert.equal(await audio.readLocalAudio('bob','bytes'),undefined);
 records.set('alice:legacy',{...asset,key:'alice:legacy'});assert.equal((await audio.readLocalAudio('alice','legacy')).file,asset.file);
 await audio.removeLocalAudio('alice','bytes');assert.equal(await audio.readLocalAudio('alice','bytes'),undefined);
 failWrite=true;const temporary=await audio.storeAnalyzedAudio('alice','aborted',asset);assert.equal(temporary.storage,'session');assert.equal((await audio.readLocalAudio('alice','aborted')).file.size,4);
});
test('browser storage refusal keeps audio playable in this session and isolates accounts',async()=>{
 globalThis.window=new EventTarget();let events=0;window.addEventListener('mixnotes-audio-updated',()=>events++);
 globalThis.indexedDB={open(){throw new DOMException('blocked','SecurityError');}};
 const asset={name:'temporary.wav',file:new Blob([new Uint8Array([3,2,1])]),duration:10,peaks:[.3],addedAt:'now'};
 const stored=await audio.storeAnalyzedAudio('alice','temporary',asset);assert.equal(stored.storage,'session');
 const restored=await audio.readLocalAudio('alice','temporary');assert.equal(restored.storage,'session');assert.equal(restored.file.size,3);assert.equal(events,1);
 await assert.rejects(()=>audio.readLocalAudio('bob','temporary'),/kalıcı/);
 await audio.removeLocalAudio('alice','temporary');await assert.rejects(()=>audio.readLocalAudio('alice','temporary'),/kalıcı/);
});
test('decoding cannot detach the audio bytes later saved for playback',async()=>{
 globalThis.AudioContext=class{async decodeAudioData(buffer){structuredClone(buffer,{transfer:[buffer]});return{duration:1,numberOfChannels:1,getChannelData(){return new Float32Array([.2]);}};}async close(){}};
 const file=new File([new Uint8Array([7,8,9])],'song.mp3');const asset=await audio.analyzeAudioFile(file);
 assert.deepEqual([...new Uint8Array(await asset.file.arrayBuffer())],[7,8,9]);
});

test('readiness inventories audio keys without reading large files and separates browser refusal from missing files',async()=>{
 globalThis.window=new EventTarget();let gets=0;
 globalThis.indexedDB={open(){const request={};queueMicrotask(()=>{request.result={close(){},transaction(){const tx={objectStore(){return {getAllKeys(){gets++;const req={result:['inventory:one','bob:two','inventory:three']};queueMicrotask(()=>{req.onsuccess?.();tx.oncomplete?.();});return req;},get(){throw Error('Should not read blobs');}};}};return tx;}};request.onsuccess?.();});return request;}};
 let result=await audio.localAudioIds('inventory');assert.deepEqual([...result.ids].sort(),['one','three']);assert.equal(result.error,'');assert.equal(gets,1);
 globalThis.indexedDB={open(){throw new DOMException('blocked','SecurityError');}};
 result=await audio.localAudioIds('bob');assert.equal(result.ids.size,0);assert.match(result.error,/kontrol edilemedi/);
});
