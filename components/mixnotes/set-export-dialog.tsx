"use client";
import { L, Localized } from "./localized";

import { useState } from "react";
import { Download, FileText, ListMusic, Disc3 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useWorkspace } from "./workspace-context";
import { buildM3U, buildRekordboxXml, safeFileName } from "@/lib/playlist-export";
import { downloadText } from "@/lib/track-transfer";
import { localAudioIds, readLocalAudio } from "@/lib/local-audio";
import type { MixSet, Track } from "@/lib/workspace-types";

const folderKey = "mixnotes.export.folder";
function storedFolder() { try { return localStorage.getItem(folderKey) ?? ""; } catch { return ""; } }

export function SetExportDialog({ set, tracks, open, onOpenChange, onNotes }: { set: MixSet; tracks: Track[]; open: boolean; onOpenChange: (open: boolean) => void; onNotes: () => void }) {
  const { data } = useWorkspace();
  const [folder, setFolder] = useState(storedFolder);
  const [working, setWorking] = useState(false);

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
