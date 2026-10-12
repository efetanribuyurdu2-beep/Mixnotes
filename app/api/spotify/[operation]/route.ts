import {identityFromRequest} from '@/db/workspace';
import {membershipFor} from '@/db/membership';
import {database} from '@/db/raw';
import {clientId,randomToken,challenge,seal,unseal,loadConnection,saveConnection,tokenRequest,spotifyGet,mapSpotifyTrack,spotifyScopes,SpotifyError} from '@/lib/spotify-server';
type Context={params:Promise<{operation:string}>};
const cookieName='__Host-mixnotes-spotify-pkce';
const cookie=(value:string,age:number)=>`${cookieName}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
const redirectFor=(request:Request)=>new URL('/api/spotify/callback',request.url).href;
const clearCookie=()=>cookie('',0);
function json(value:unknown,status=200){return Response.json(value,{status,headers:{'Cache-Control':'no-store'}});}
function returnHome(request:Request,result:string){return new Response(null,{status:303,headers:{Location:new URL('/?spotify='+result,request.url).href,'Set-Cookie':clearCookie(),'Cache-Control':'no-store'}});}
export async function GET(request:Request,context:Context){const user=await identityFromRequest(request);if(!user)return json({error:'Oturum doğrulanamadı.'},401);const {operation}=await context.params;const url=new URL(request.url);try{
 const client=await clientId();
 if(operation==='status'){const token=await loadConnection(user.id);return json({configured:!!client,connected:!!token,clientId:(await membershipFor(user.id)).plan==='founder'?client:undefined,redirectUri:redirectFor(request)});}
 if(operation==='connect'){
  if(!client)throw new SpotifyError('Önce Spotify uygulamasının Client ID bilgisini kaydet.');const state=randomToken(),verifier=randomToken(),callback=redirectFor(request);const value=await seal({state,verifier,owner:user.id,client,callback,expires:Date.now()+600000},'spotify-pkce');const target=new URL('https://accounts.spotify.com/authorize');target.search=new URLSearchParams({client_id:client,response_type:'code',redirect_uri:callback,scope:spotifyScopes,state,code_challenge_method:'S256',code_challenge:await challenge(verifier)}).toString();return new Response(null,{status:302,headers:{Location:target.href,'Set-Cookie':cookie(value,600),'Cache-Control':'no-store'}});
 }
 if(operation==='callback'){
  const raw=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1)||'';
  const pending=await unseal<{state:string;verifier:string;owner:string;client:string;callback:string;expires:number}>(raw,'spotify-pkce');
  if(!pending||pending.owner!==user.id||pending.expires<Date.now()||pending.client!==client||pending.callback!==redirectFor(request)||pending.state!==url.searchParams.get('state'))return returnHome(request,'expired');
  if(url.searchParams.has('error'))return returnHome(request,'cancelled');const code=url.searchParams.get('code');if(!code)return returnHome(request,'failed');
  const v=await tokenRequest({client_id:client,grant_type:'authorization_code',code,redirect_uri:pending.callback,code_verifier:pending.verifier});if(!v.refresh_token)return returnHome(request,'failed');await saveConnection({owner:user.id,client,access:v.access_token!,refresh:v.refresh_token,expires:Date.now()+v.expires_in!*1000});return returnHome(request,'connected');
 }
 if(operation==='playlists'){
  const offset=Math.max(0,Math.min(5000,Number(url.searchParams.get('offset'))||0));const result=await spotifyGet(user.id,`/me/playlists?limit=20&offset=${Math.floor(offset)}`);const items=(Array.isArray(result.items)?result.items:[]) as {id:string;name:string;owner?:{id?:string;display_name?:string};images?:{url:string}[]}[];return json({items:items.filter(i=>/^[a-zA-Z0-9]{22}$/.test(i.id)).map(i=>({id:i.id,name:i.name,owner:i.owner?.display_name||'',artworkUrl:i.images?.[0]?.url||'',url:`https://open.spotify.com/playlist/${i.id}`})),nextOffset:result.next?offset+20:null});
 }
 if(operation==='items'){
  const id=url.searchParams.get('playlist')||'';if(!/^[a-zA-Z0-9]{22}$/.test(id))throw new SpotifyError('Geçerli bir playlist seç.');const offset=Math.max(0,Math.min(10000,Number(url.searchParams.get('offset'))||0));const result=await spotifyGet(user.id,`/playlists/${id}/items?limit=50&offset=${Math.floor(offset)}`);const rows=(Array.isArray(result.items)?result.items:[]) as {item?:unknown;track?:unknown;is_local?:boolean}[];return json({items:rows.filter(i=>!i.is_local).map(i=>mapSpotifyTrack(i.item||i.track)).filter(Boolean),nextOffset:result.next?offset+50:null});
 }
 if(operation==='search'){
  const query=url.searchParams.get('q')?.trim()||'';if(query.length<2||query.length>100)throw new SpotifyError('2–100 karakterlik bir arama yaz.');const result=await spotifyGet(user.id,`/search?type=track&limit=10&q=${encodeURIComponent(query)}`);const tracks=result.tracks as {items?:unknown[]};return json({items:(tracks?.items||[]).map(mapSpotifyTrack).filter(Boolean)});
 }
 return json({error:'Not found'},404);
 }catch(e){if(operation==='callback')return returnHome(request,'failed');return json({error:e instanceof SpotifyError?e.message:'Spotify bağlantısı tamamlanamadı.'},e instanceof SpotifyError?e.status:503);}}
export async function POST(request:Request,context:Context){if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Forbidden'},403);const user=await identityFromRequest(request);if(!user)return json({error:'Unauthorized'},401);const {operation}=await context.params;
 if(operation==='disconnect'){await database().prepare('DELETE FROM spotify_connections WHERE owner_id=?').bind(user.id).run();return json({connected:false});}
 if(operation==='config'){
  if((await membershipFor(user.id)).plan!=='founder')return json({error:'Forbidden'},403);try{const text=await request.text();if(text.length>1000)return json({error:'Bilgileri kontrol et.'},413);const {clientId:client}=JSON.parse(text) as {clientId?:unknown};if(typeof client!=='string'||!/^[a-fA-F0-9]{32}$/.test(client.trim()))return json({error:'Spotify Web API uygulamasının 32 karakterlik Client ID bilgisini gir. Soloist anahtarı bu alanda kullanılamaz.'},400);await database().prepare("INSERT INTO spotify_settings(id,client_id) VALUES ('app',?) ON CONFLICT(id) DO UPDATE SET client_id=excluded.client_id").bind(client.trim()).run();return json({configured:true});}catch{return json({error:'Client ID kaydedilemedi.'},400);}
 }
 return json({error:'Not found'},404);
}
