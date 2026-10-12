import type { LinkMetadata } from './workspace-types';

export function parseTrackLink(raw: string) {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { throw new Error('Geçerli bir parça bağlantısı yapıştır.'); }
  if (u.protocol !== 'https:' || u.username || u.password || u.port) throw new Error('HTTPS parça bağlantısı kullan.');
  const host = u.hostname.toLowerCase();
  let provider = '', id = '', canonical = '';
  if (host === 'music.apple.com' || host === 'itunes.apple.com') {
    id = u.searchParams.get('i') || (u.pathname.includes('/song/') ? u.pathname.split('/').pop() || '' : '');
    if (!/^\d+$/.test(id)) throw new Error('Albüm yerine tek bir şarkının paylaşım bağlantısını kullan.');
    provider = 'Apple Music'; canonical = `https://${host}${u.pathname}${u.searchParams.has('i') ? `?i=${id}` : ''}`;
  } else if (host === 'open.spotify.com') {
    id = u.pathname.match(/^\/(?:intl-[a-z]+\/)?track\/([A-Za-z0-9]{22})\/?$/)?.[1] || '';
    provider = 'Spotify'; canonical = `https://open.spotify.com/track/${id}`;
  } else if (['www.youtube.com', 'youtube.com', 'music.youtube.com', 'youtu.be'].includes(host)) {
    id = host === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v') || u.pathname.match(/^\/shorts\/([\w-]{11})$/)?.[1] || '';
    if (!/^[\w-]{11}$/.test(id)) id = '';
    provider = 'YouTube'; canonical = `https://www.youtube.com/watch?v=${id}`;
  } else if (host === 'soundcloud.com' || host === 'www.soundcloud.com') {
    if (/^\/[^/]+\/[^/]+\/?$/.test(u.pathname) && !/\/sets\//.test(u.pathname)) id = u.pathname;
    provider = 'SoundCloud'; canonical = `https://soundcloud.com${u.pathname}`;
  } else if (host === 'beatport.com' || host === 'www.beatport.com') {
    id = u.pathname.match(/^\/track\/[^/]+\/(\d+)\/?$/)?.[1] || '';
    provider = 'Beatport'; canonical = `https://www.beatport.com${u.pathname}`;
  } else throw new Error('Apple Music, Spotify, YouTube, SoundCloud veya Beatport parça bağlantısı kullan. Kısaltılmış bağlantı yerine tam parça linkini paylaş.');
  if (!id) throw new Error('Playlist veya albüm yerine tek bir parça bağlantısı kullan.');
  return { provider, id, url: canonical, country: u.pathname.split('/')[1]?.match(/^[a-z]{2}$/i)?.[0]?.toUpperCase() || 'US' };
}

export function embedForLink(url: string) {
  try {
    const link = parseTrackLink(url);
    if (link.provider === 'Spotify') return `https://open.spotify.com/embed/track/${link.id}`;
    if (link.provider === 'Apple Music') return link.url.replace('https://music.apple.com/', 'https://embed.music.apple.com/');
    if (link.provider === 'YouTube') return `https://www.youtube-nocookie.com/embed/${link.id}`;
    if (link.provider === 'SoundCloud') return `https://w.soundcloud.com/player/?url=${encodeURIComponent(link.url)}&auto_play=false`;
  } catch { /* A manual source need not have an embed. */ }
  return '';
}

const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
export function pageMetadata(html: string) {
  const values: Record<string, string> = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const attrs: Record<string,string> = {};
    for (const m of tag.matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g)) attrs[m[1].toLowerCase()] = decode(m[3]);
    const key = attrs.property || attrs.name;
    if (key && attrs.content) values[key] = attrs.content;
  }
  const recordings: Record<string,unknown>[] = [];
  function walk(value: unknown, depth = 0) {
    if (depth > 12 || !value || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach(v => walk(v,depth+1)); return; }
    const obj = value as Record<string,unknown>;
    if (obj['@type'] === 'MusicRecording') recordings.push(obj);
    Object.values(obj).forEach(v => walk(v,depth+1));
  }
  for (const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { walk(JSON.parse(m[1])); } catch { /* Invalid provider structured data. */ }
  }
  return { values, recording: recordings[0] };
}

async function limitedFetch(url: string, json: boolean, fetcher: typeof fetch) {
  // URLs are built from fixed provider hosts. Never follow redirects into arbitrary destinations.
  let response: Response;
  try {
    response = await fetcher(url, { redirect: 'manual', signal: AbortSignal.timeout(7000), headers: { Accept: json ? 'application/json' : 'text/html', 'User-Agent': 'Mozilla/5.0 (compatible; MixNotes/1.0)' } });
  } catch {
    throw new Error('Müzik servisine şu anda ulaşılamıyor. Tekrar dene veya bilgileri elle ekle.');
  }
  if (response.status >= 300 && response.status < 400) throw new Error('Kaynak bağlantıyı başka bir adrese yönlendiriyor. Serviste şarkıyı açıp tam parça bağlantısını yeniden paylaş.');
  if (!response.ok) { console.warn('track_link_upstream', {host:new URL(url).hostname,status:response.status}); throw new Error('Kaynak şu anda parça bilgilerini paylaşmıyor. Tekrar dene veya bilgileri elle ekle.'); }
  if (Number(response.headers.get('content-length')) > 1_500_000) throw new Error('Kaynak yanıtı çok büyük.');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Kaynak boş yanıt verdi.');
  let size = 0, text = ''; const decoder = new TextDecoder();
  try { while (true) { const {done,value} = await reader.read(); if (done) break; size += value.byteLength; if (size > 1_500_000) throw new Error('Kaynak yanıtı çok büyük.'); text += decoder.decode(value, {stream:true}); } } finally { await reader.cancel(); }
  text += decoder.decode();
  if (!json) return text;
  try { return JSON.parse(text); } catch { throw new Error('Kaynak geçerli parça bilgisi döndürmedi. Tekrar dene veya bilgileri elle ekle.'); }
}
const clean = (value: unknown) => typeof value === 'string' ? value.trim().slice(0,200) : '';
const secureUrl = (value: unknown) => typeof value === 'string' && /^https:\/\//.test(value) ? value.slice(0,2000) : '';
export async function resolveTrackLink(raw: string, fetcher: typeof fetch = fetch): Promise<LinkMetadata> {
  const link = parseTrackLink(raw);
  const result: LinkMetadata = { provider: link.provider, url: link.url, title: '', artist: '', artworkUrl: '', album: '', releaseDate: '', genre: '', durationSeconds: null, previewUrl: '', creator: '' };
  if (link.provider === 'Apple Music') {
    let data;
    try { data = await limitedFetch(`https://itunes.apple.com/lookup?id=${link.id}&entity=song&country=${link.country}`, true, fetcher); }
    catch {
      const {recording} = pageMetadata(await limitedFetch(link.url, false, fetcher));
      if (!recording || !clean(recording.name)) throw new Error('Apple Music parça bilgilerine ulaşılamadı. Tekrar dene veya bilgileri elle ekle.');
      result.title = clean(recording.name);
      const artists = recording.byArtist;
      result.artist = Array.isArray(artists) ? artists.map(a=>clean(a?.name)).filter(Boolean).join(', ').slice(0,200) : artists && typeof artists === 'object' ? clean((artists as Record<string,unknown>).name) : '';
      const album = recording.inAlbum as Record<string,unknown>|undefined;
      result.album = clean(album?.name); result.artworkUrl = secureUrl(album?.image) || secureUrl(recording.image);
      result.releaseDate = clean(recording.datePublished).slice(0,10);
      result.genre = Array.isArray(recording.genre) ? clean(recording.genre[0]) : clean(recording.genre);
      const d = clean(recording.duration).match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
      result.durationSeconds = d ? Number(d[1]||0)*3600+Number(d[2]||0)*60+Number(d[3]||0) : null;
      return result;
    }
    const song = data.results?.find((r: {trackId?:number;kind?:string}) => String(r.trackId) === link.id && r.kind === 'song');
    if (!song) throw new Error('Bu şarkı ilgili ülkenin kataloğunda bulunamadı. Başka bir ülkeye ait parça linkini deneyebilir veya elle ekleyebilirsin.');
    result.title = clean(song.trackName); result.artist = clean(song.artistName); result.album = clean(song.collectionName);
    result.genre = clean(song.primaryGenreName); result.releaseDate = clean(song.releaseDate).slice(0,10);
    result.artworkUrl = secureUrl(song.artworkUrl100)?.replace(/100x100bb/, '600x600bb');
    result.previewUrl = secureUrl(song.previewUrl); result.durationSeconds = song.trackTimeMillis ? Math.round(song.trackTimeMillis/1000) : null;
  } else {
    const endpoints: Record<string,string> = { Spotify: `https://open.spotify.com/oembed?url=${encodeURIComponent(link.url)}`, YouTube: `https://www.youtube.com/oembed?url=${encodeURIComponent(link.url)}&format=json`, SoundCloud: `https://soundcloud.com/oembed?url=${encodeURIComponent(link.url)}&format=json` };
    if (endpoints[link.provider]) {
      const data = await limitedFetch(endpoints[link.provider], true, fetcher);
      result.title = clean(data.title); result.artworkUrl = secureUrl(data.thumbnail_url);
      if (link.provider === 'YouTube') result.creator = clean(data.author_name);
      if (link.provider === 'SoundCloud') { result.artist = clean(data.author_name); result.title = result.title.replace(new RegExp(' by ' + result.artist.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'), ''); }
    }
    if (link.provider === 'Spotify' || link.provider === 'Beatport') {
      try {
        const {values,recording} = pageMetadata(await limitedFetch(link.url, false, fetcher));
        result.title = clean(recording?.name) || result.title || clean(values['og:title']).replace(/\s*[|–-]\s*(Spotify|Beatport).*$/i, '');
        const by = recording?.byArtist;
        result.artist = Array.isArray(by) ? by.map(x => clean(x?.name)).filter(Boolean).join(', ').slice(0,200) : by && typeof by === 'object' ? clean((by as Record<string,unknown>).name) : '';
        if (!result.artist && link.provider === 'Spotify') {
          // Spotify's description identifies artist before the explicit Song marker.
          const parts = (values['og:description'] || '').split(' · ');
          const marker = parts.findIndex(p => /^Song\b/i.test(p));
          if (marker > 0) result.artist = clean(parts.slice(0,marker).join(', '));
        }
        result.artworkUrl = secureUrl(values['og:image']) || result.artworkUrl;
        result.genre = clean(recording?.genre); result.releaseDate = clean(recording?.datePublished).slice(0,10);
        const album = recording?.inAlbum; result.album = album && typeof album === 'object' ? clean((album as Record<string,unknown>).name) : '';
        const duration = clean(recording?.duration).match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/);
        if (duration) result.durationSeconds = Math.round(Number(duration[1]||0)*3600 + Number(duration[2]||0)*60 + Number(duration[3]||0));
      } catch (error) { if (!result.title) throw error; }
    }
  }
  if (!result.title) throw new Error('Kaynak parça adını döndürmedi. Bilgileri elle ekleyebilirsin.');
  return result;
}
