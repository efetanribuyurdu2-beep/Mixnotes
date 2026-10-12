"use client";
import { L, Localized } from "./localized";

import { useEffect, useState } from "react";
import { Download, ExternalLink, FileText, ListMusic, Disc3, Music4 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useWorkspace } from "./workspace-context";
import { buildM3U, buildRekordboxXml, safeFileName } from "@/lib/playlist-export";
import { downloadText } from "@/lib/track-transfer";
import { localAudioIds, readLocalAudio } from "@/lib/local-audio";
import type { MixSet, Track } from "@/lib/workspace-types";

const folderKey = "mixnotes.export.folder";
function storedFolder() { try { return localStorage.getItem(folderKey) ?? ""; } catch { return ""; } }

export function SetExportDialog({ set, tracks, open, onOpenChange, onNotes }: { set: MixSet; tracks: Track[]; open: boolean; onOpenChange: (open: boolean) => void; onNotes: () => void }) {
  const { data, setView } = useWorkspace();
  const [folder, setFolder] = useState(storedFolder);
  const [working, setWorking] = useState(false);
  const [spotify, setSpotify] = useState<"unknown" | "connected" | "disconnected">("unknown");
  const [spotifyResult, setSpotifyResult] = useState<{ url: string; added: number; unmatched: string[] } | null>(null);
  const [spotifyError, setSpotifyError] = useState("");

  useEffect(() => {
    let live = true;
    fetch("/api/spotify/status", { cache: "no-store" }).then((r) => r.json() as Promise<{ connected?: boolean }>)
      .then((v) => { if (live) setSpotify(v.connected ? "connected" : "disconnected"); })
      .catch(() => { if (live) setSpotify("disconnected"); });
    return () => { live = false; };
  }, []);

  async function exportToSpotify() {
    setWorking(true); setSpotifyError(""); setSpotifyResult(null);
    try {
      const response = await fetch("/api/spotify/export-set", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ setId: set.id }) });
      const body = await response.json() as { url?: string; added?: number; unmatched?: string[]; error?: string };
      if (!response.ok || !body.url) throw new Error(body.error || "Spotify playlist oluşturulamadı. Tekrar dene.");
      setSpotifyResult({ url: body.url, added: body.added ?? 0, unmatched: body.unmatched ?? [] });
    } catch (cause) { setSpotifyError(cause instanceof Error ? cause.message : "Spotify playlist oluşturulamadı. Tekrar dene."); }
    finally { setWorking(false); }
  }

  // Attached audio keeps the DJ's real file names, which is what DJ software matches on.
  async function attachedNames() {
    const names = new Map<string, string>();
    const owner = data.profile.storageKey;
    if (!owner) return names;
    const { ids } = await localAudioIds(owner);
    for (const track of tracks) {
      if (!ids.has(track.id)) continue;
      try { const asset = await readLocalAudio(owner, track.id); if (asset) names.set(track.id, asset.name); } catch { /* fall back to Artist - Title */ }
    }
    return names;
  }

  async function exportAs(kind: "m3u" | "rekordbox") {
    setWorking(true);
    try {
      try { localStorage.setItem(folderKey, folder); } catch { /* preference only */ }
      const names = await attachedNames();
      const base = safeFileName(set.title);
      if (kind === "m3u") downloadText(`${base}.m3u8`, buildM3U(set, tracks, folder, names), "audio/x-mpegurl;charset=utf-8");
      else downloadText(`${base}-rekordbox.xml`, buildRekordboxXml(set, tracks, data.transitions, folder, names), "application/xml;charset=utf-8");
    } finally { setWorking(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="export-dialog">
        <Localized>
          <DialogTitle><L text="Seti dışa aktar" /></DialogTitle>
          <DialogDescription><L text="Seti DJ yazılımına playlist olarak al. Parçalar dosya adıyla eşlenir; ses dosyası MixNotes'a ekliyse onun adı kullanılır, değilse “Sanatçı - Parça.mp3” varsayılır." /></DialogDescription>
          <label className="export-folder">
            <span><L text="Müzik klasörün (isteğe bağlı)" /></span>
            <input value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="/Users/dj/Music  ·  C:\Music" spellCheck={false} />
            <small><L text="Dosyalarının bulunduğu klasörü yazarsan yazılım parçaları doğrudan bulur. Boş bırakırsan playlist'i müzik klasörüne koyup açabilirsin." /></small>
          </label>
          <div className="export-options">
            <button className="export-option" disabled={working} onClick={() => exportAs("rekordbox")}>
              <Disc3 size={20} /><strong>Rekordbox XML</strong>
              <small><L text="Rekordbox › Tercihler › Gelişmiş › rekordbox xml ile içe al. BPM, key, puan ve geçiş notları yorum olarak gelir." /></small>
            </button>
            <button className="export-option" disabled={working} onClick={() => exportAs("m3u")}>
              <ListMusic size={20} /><strong>M3U8 playlist</strong>
              <small><L text="Serato, Traktor, VirtualDJ ve Engine DJ'de playlist olarak açılır." /></small>
            </button>
            {spotify === "connected" ? (
              <button className="export-option" disabled={working} onClick={exportToSpotify}>
                <Music4 size={20} /><strong><L text="Spotify playlist" /></strong>
                <small><L text="Sırayla özel bir Spotify playlist'i oluşturur. Spotify bağlantısı olan parçalar doğrudan, diğerleri aramayla eşlenir." /></small>
              </button>
            ) : spotify === "disconnected" ? (
              <button className="export-option" onClick={() => { onOpenChange(false); setView("discover"); }}>
                <Music4 size={20} /><strong><L text="Spotify playlist" /></strong>
                <small><L text="Önce Discover'da Spotify hesabını bağla." /></small>
              </button>
            ) : null}
            {spotifyResult && (
              <div className="export-result" role="status">
                <p><L text="Playlist hazır:" /> {spotifyResult.added} <L text="parça eklendi." /> <a href={spotifyResult.url} target="_blank" rel="noreferrer"><L text="Spotify'da aç" /> <ExternalLink size={12} /></a></p>
                {spotifyResult.unmatched.length > 0 && <details><summary>{spotifyResult.unmatched.length} <L text="parça bulunamadı" /></summary><ul>{spotifyResult.unmatched.map((t) => <li key={t}>{t}</li>)}</ul></details>}
              </div>
            )}
            {spotifyError && <p className="inline-error" role="alert"><L text={spotifyError} /></p>}
            <button className="export-option" onClick={() => { onNotes(); onOpenChange(false); }}>
              <FileText size={20} /><strong><L text="Set notları (TXT)" /></strong>
              <small><L text="Sıra, BPM/key, cue notları ve geçiş teknikleri; yazdırmak için." /></small>
            </button>
          </div>
          <p className="audio-local-note"><Download size={12} /> <L text="Cue noktaları ve beatgrid DJ yazılımının kendi analizine bırakılır." /></p>
        </Localized>
      </DialogContent>
    </Dialog>
  );
}
