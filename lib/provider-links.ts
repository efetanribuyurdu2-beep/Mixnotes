// Only build official player URLs. Provider pages that block framing stay external.
export function providerPlayer(raw:string){
  let u:URL;try{u=new URL(raw.trim());}catch{return null;}
  if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
  const host=u.hostname.toLowerCase();
  if(host==='open.spotify.com'){
    const match=u.pathname.match(/^\/(?:intl-[a-z]+\/)?(track|playlist|album|episode|show|artist)\/([a-zA-Z0-9]{22})\/?$/);
    if(match)return {provider:'Spotify',url:`https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator`,canonical:`https://open.spotify.com/${match[1]}/${match[2]}`,height:match[1]==='track'?152:352};
  }
  if(host==='soundcloud.com'||host==='www.soundcloud.com'){
    if(!/^\/[^/]+\/(?:sets\/)?[^/]+\/?$/.test(u.pathname)||/^\/(search|discover|you|stream)\//.test(u.pathname))return null;
    const canonical=`https://soundcloud.com${u.pathname}${/^s-[a-zA-Z0-9]+$/.test(u.searchParams.get('secret_token')||'')?`?secret_token=${u.searchParams.get('secret_token')}`:''}`;
    return {provider:'SoundCloud',url:`https://w.soundcloud.com/player/?url=${encodeURIComponent(canonical)}&auto_play=false&show_comments=false&visual=false`,canonical,height:166};
  }
  if(host==='music.apple.com'||host==='itunes.apple.com'){
    if(!/^\/[a-z]{2}\/(album|song|playlist)\//i.test(u.pathname))return null;
    const id=u.searchParams.get('i'),canonical=`https://music.apple.com${u.pathname}${id&&/^\d+$/.test(id)?`?i=${id}`:''}`;
    return {provider:'Apple Music',url:canonical.replace('https://music.apple.com/','https://embed.music.apple.com/'),canonical,height:175};
  }
  if(['youtube.com','www.youtube.com','music.youtube.com','youtu.be'].includes(host)){
    const id=host==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v')||u.pathname.match(/^\/shorts\/([\w-]{11})$/)?.[1];
    if(id&&/^[\w-]{11}$/.test(id))return {provider:'YouTube',url:`https://www.youtube-nocookie.com/embed/${id}`,canonical:`https://www.youtube.com/watch?v=${id}`,height:240};
  }
  return null;
}
export function safeExternalUrl(raw:string){try{const u=new URL(raw.trim());return u.protocol==='https:'&&!u.username&&!u.password&&!u.port?u.href:'';}catch{return '';}}
