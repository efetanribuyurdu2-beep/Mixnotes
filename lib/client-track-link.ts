import {parseTrackLink,resolveTrackLink} from './track-link';
import type {LinkMetadata} from './workspace-types';

export async function lookupLinkMetadata(url:string,signal:AbortSignal,fetcher:typeof fetch=fetch):Promise<LinkMetadata> {
  // Apple's public catalog allows CORS. A visitor can reach it directly when a hosted server cannot.
  if (parseTrackLink(url).provider === 'Apple Music') {
    try {
      return await resolveTrackLink(url, (address,options)=>{
        if(new URL(String(address)).hostname !== 'itunes.apple.com') throw new Error('Use server fallback for provider pages');
        return fetcher(address,{...options,headers:{Accept:'application/json'},signal:AbortSignal.any([signal,options?.signal as AbortSignal])});
      });
    }catch { if(signal.aborted) throw new DOMException('Cancelled','AbortError'); }
  }
  const response=await fetcher(`/api/track-link?url=${encodeURIComponent(url.trim())}`,{signal});
  const payload=await response.json() as {error?:string;metadata?:LinkMetadata};
  if (!response.ok || !payload.metadata) throw new Error(payload.error || 'Parça bilgileri alınamadı.');
  return payload.metadata;
}
