import { identityFromRequest } from "@/db/workspace";

export const dynamic = "force-dynamic";

const normal = (text: string) => text.toLocaleLowerCase("tr-TR").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/\(.*?\)|\[.*?\]/g, " ").replace(/feat\.?|ft\.?/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
const firstArtist = (text: string) => normal(text.split(/,|&| x | feat\.? | ft\.? /i)[0] ?? "");
const allowedHost = (host: string) => /(^|\.)itunes\.apple\.com$/.test(host) || /(^|\.)mzstatic\.com$/.test(host);

type SearchResult = { trackName?: string; artistName?: string; previewUrl?: string };

// Finds the store's 30-second preview for a title/artist and streams it back, so the browser can
// estimate BPM and key. Only Apple preview hosts are fetched; nothing else can be proxied.
export async function GET(request: Request) {
  if (!(await identityFromRequest(request))) return Response.json({ error: "Oturum doğrulanamadı." }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const title = (params.get("title") ?? "").trim().slice(0, 200), artist = (params.get("artist") ?? "").trim().slice(0, 200);
  if (title.length < 2) return Response.json({ error: "Parça adı gerekli." }, { status: 400 });
  try {
    const search = new URL("https://itunes.apple.com/search");
    search.search = new URLSearchParams({ term: `${artist} ${title}`.trim(), media: "music", entity: "song", limit: "10", country: "TR" }).toString();
    const found = await fetch(search, { signal: AbortSignal.timeout(8000), headers: { Accept: "application/json" } });
    if (!found.ok) return Response.json({ error: "Katalog yanıt vermedi." }, { status: 503 });
    const results = ((await found.json()) as { results?: SearchResult[] }).results ?? [];
    const wantTitle = normal(title), wantArtist = firstArtist(artist);
    // Only accept a confident match; a wrong preview would give a wrong BPM.
    const match = results.find((r) => {
      if (!r.previewUrl || !r.trackName) return false;
      const t = normal(r.trackName), a = normal(r.artistName ?? "");
      const titleOk = t === wantTitle || t.startsWith(`${wantTitle} `) || wantTitle.startsWith(`${t} `);
      return titleOk && (!wantArtist || a.includes(wantArtist) || wantArtist.includes(a));
    });
    if (!match?.previewUrl) return Response.json({ error: "Önizleme bulunamadı." }, { status: 404 });
    const url = new URL(match.previewUrl);
    if (url.protocol !== "https:" || !allowedHost(url.hostname)) return Response.json({ error: "Önizleme bulunamadı." }, { status: 404 });
    const audio = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!audio.ok || !audio.body || (audio.url && !allowedHost(new URL(audio.url).hostname))) return Response.json({ error: "Önizleme alınamadı." }, { status: 502 });
    let total = 0;
    const limited = audio.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({ transform(chunk, controller) { total += chunk.byteLength; if (total > 8 * 1024 * 1024) { controller.error(new Error("Preview too large")); return; } controller.enqueue(chunk); } }));
    return new Response(limited, { headers: { "Content-Type": audio.headers.get("content-type")?.startsWith("audio/") ? audio.headers.get("content-type")! : "audio/mp4", "Cache-Control": "private, max-age=86400" } });
  } catch {
    return Response.json({ error: "Önizleme alınamadı." }, { status: 503 });
  }
}
