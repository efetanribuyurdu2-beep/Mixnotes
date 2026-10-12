import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({entryPoints:['lib/track-link.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {parseTrackLink,embedForLink,resolveTrackLink,pageMetadata}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const spotify='https://open.spotify.com/track/0Lr4kGOYn9l83EjuK6cZFQ';
const apple='https://music.apple.com/tr/album/song/123?i=456';
const respond=x=>Promise.resolve(Response.json(x));
test('accepts canonical songs, strips tracking, and rejects unsafe or collection links',()=>{
 assert.equal(parseTrackLink(spotify+'?si=abc').url,spotify);
 assert.equal(parseTrackLink(apple).id,'456');
 assert.equal(parseTrackLink('https://music.youtube.com/watch?v=abcdefghijk').provider,'YouTube');
 assert.equal(parseTrackLink('https://www.beatport.com/track/song/1234').id,'1234');
 for(const url of ['http://127.0.0.1/x','https://open.spotify.com.evil.test/track/abc','https://open.spotify.com:444/track/abc','https://user:secret@open.spotify.com/track/abc','https://music.apple.com/tr/album/123','https://open.spotify.com/playlist/abc','https://soundcloud.com/user/sets/list'])assert.throws(()=>parseTrackLink(url));
 assert.equal(embedForLink('javascript:alert(1)'),'');
 assert.ok(embedForLink(spotify).startsWith('https://open.spotify.com/embed/track/'));
});
test('Apple song lookup uses exact ID and country and returns available metadata',async()=>{
 const result=await resolveTrackLink(apple,async(url,options)=>{assert.equal(new URL(url).hostname,'itunes.apple.com');assert.equal(new URL(url).searchParams.get('country'),'TR');assert.equal(options.redirect,'manual');return respond({results:[{kind:'song',trackId:456,trackName:'Song',artistName:'Artist',collectionName:'Album',trackTimeMillis:242500,artworkUrl100:'https://is1-ssl.mzstatic.com/image/100x100bb.jpg',primaryGenreName:'Dance',releaseDate:'2026-01-01T00:00:00Z'}]});});
 assert.equal(result.title,'Song');assert.equal(result.artist,'Artist');assert.equal(result.durationSeconds,243);assert.equal(result.album,'Album');assert.ok(result.artworkUrl.includes('600x600'));assert.equal(result.releaseDate,'2026-01-01');
 await assert.rejects(()=>resolveTrackLink(apple,()=>respond({results:[{kind:'collection',trackId:123}]})),/bulunamadı/);
});
test('Spotify falls back to oEmbed and never imports executable embed HTML',async()=>{
 let n=0; const result=await resolveTrackLink(spotify,async()=>{if(n++)throw new Error('unavailable');return respond({title:'Song',thumbnail_url:'https://i.scdn.co/image/abc',html:'<script>bad</script>'});});
 assert.equal(result.title,'Song');assert.equal(result.artist,'');assert.equal(result.durationSeconds,null);assert.equal('html' in result,false);
});
test('YouTube channel is kept separate from song artist',async()=>{
 const r=await resolveTrackLink('https://youtu.be/abcdefghijk',()=>respond({title:'Official Video',author_name:'Label channel',thumbnail_url:'https://i.ytimg.com/x.jpg'}));assert.equal(r.artist,'');assert.equal(r.creator,'Label channel');
});
test('extracts structured recording data and decodes OG metadata regardless of attribute order',async()=>{
 const html=`<meta content="A &amp; B" property="og:title"><meta property='og:image' content='https://cdn.example/cover.jpg'><script type="application/ld+json">{"@type":"MusicRecording","name":"Song","byArtist":{"name":"Artist"},"duration":"PT4M12S","genre":"House"}</script>`;
 assert.equal(pageMetadata(html).values['og:title'],'A & B');
 let n=0;const r=await resolveTrackLink(spotify,()=>n++ ? Promise.resolve(new Response(html)) : respond({title:'Song'}));assert.equal(r.artist,'Artist');assert.equal(r.genre,'House');assert.equal(r.durationSeconds,252);
});
test('provider failures and oversized replies fail visibly',async()=>{
 await assert.rejects(()=>resolveTrackLink(apple,async()=>new Response('bad',{status:503})),/kaynak|Kaynak/);
 await assert.rejects(()=>resolveTrackLink(apple,async()=>new Response('bad',{headers:{'content-length':'2000000'}})),/büyük/);
});

test('edge runtime redirect mode is supported and redirects are never followed',async()=>{
 let calls=0;
 await assert.rejects(()=>resolveTrackLink(apple,async(url,options)=>{
  calls++;assert.equal(options.redirect,'manual');
  if(!['manual','follow'].includes(options.redirect))throw new TypeError('Invalid redirect value');
  return new Response(null,{status:302,headers:{location:'http://127.0.0.1/private'}});
 }),/yönlendiriyor/);
 assert.equal(calls,2);
 const result=await resolveTrackLink(apple,async(url,options)=>{
  if(!['manual','follow'].includes(options.redirect))throw new TypeError('Invalid redirect value');
  return Response.json({results:[{trackId:456,kind:'song',trackName:'Song',artistName:'Artist'}]});
 });assert.equal(result.title,'Song');
});
test('technical network and JSON errors become readable user messages',async()=>{
 await assert.rejects(()=>resolveTrackLink(apple,async()=>{throw new TypeError('socket ECONNRESET internal');}),error=>/Müzik servisine/.test(error.message)&&!error.message.includes('ECONNRESET'));
 await assert.rejects(()=>resolveTrackLink(apple,async()=>new Response('<html>blocked</html>')),/Apple Music|geçerli parça bilgisi/);
});

test('Apple falls back to its public recording page when catalog server access fails',async()=>{
 const fixture='<script type="application/ld+json">'+JSON.stringify({'@type':'MusicRecording',name:'Şehrimin Tadı',byArtist:[{name:'Ezhel'}],inAlbum:{name:'Müptezhel',image:'https://is1-ssl.mzstatic.com/cover.jpg'},duration:'PT4M13S',datePublished:'2017-05-25',genre:['Turkish Hip-Hop/Rap']})+'</script>';
 const r=await resolveTrackLink(apple,async url=>new URL(url).hostname==='itunes.apple.com'?new Response('denied',{status:403}):new Response(fixture));
 assert.equal(r.title,'Şehrimin Tadı');assert.equal(r.artist,'Ezhel');assert.equal(r.durationSeconds,253);assert.equal(r.album,'Müptezhel');assert.equal(r.genre,'Turkish Hip-Hop/Rap');
});
const clientBundle=await build({entryPoints:['lib/client-track-link.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {lookupLinkMetadata}=await import('data:text/javascript;base64,'+Buffer.from(clientBundle.outputFiles[0].text).toString('base64'));
test('Apple direct browser lookup avoids hosted fetch and uses no forbidden request headers',async()=>{
 const addresses=[];
 const r=await lookupLinkMetadata(apple,new AbortController().signal,async(address,options)=>{
  addresses.push(String(address));assert.deepEqual(options.headers,{Accept:'application/json'});
  return Response.json({results:[{trackId:456,kind:'song',trackName:'Song',artistName:'Artist'}]});
 });assert.equal(r.title,'Song');assert.equal(addresses.length,1);assert.ok(addresses[0].startsWith('https://itunes.apple.com/'));
});
test('Browser lookup falls back to authenticated same-origin endpoint when direct access fails',async()=>{
 const calls=[];const r=await lookupLinkMetadata(apple,new AbortController().signal,async address=>{
  calls.push(String(address));
  if(String(address).startsWith('https://'))throw new TypeError('CORS failed');
  return Response.json({metadata:{title:'Song',provider:'Apple Music'}});
 });assert.equal(r.title,'Song');assert.equal(calls.length,2);assert.ok(calls[1].startsWith('/api/track-link?'));
});
