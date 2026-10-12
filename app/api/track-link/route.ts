import { identityFromRequest } from '@/db/workspace';
import { resolveTrackLink } from '@/lib/track-link';
export async function GET(request: Request) {
  if (!await identityFromRequest(request)) return Response.json({error:'Oturum doğrulanamadı.'},{status:401});
  const raw = new URL(request.url).searchParams.get('url') || '';
  if (raw.length > 2000) return Response.json({error:'Bağlantı çok uzun.'},{status:400});
  try { return Response.json({metadata:await resolveTrackLink(raw)},{headers:{'Cache-Control':'private, max-age=300'}}); }
  catch (error) { return Response.json({error: error instanceof Error ? error.message : 'Parça bilgileri alınamadı.'},{status:422}); }
}
