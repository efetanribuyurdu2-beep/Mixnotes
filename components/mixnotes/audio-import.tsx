"use client";
import {L,Localized} from "./localized";
import { useState, type ChangeEvent } from "react";
import { Music2, Upload } from "lucide-react";
import { useWorkspace } from "./workspace-context";
import { analyzeAudioFile, storeAnalyzedAudio } from "@/lib/local-audio";
import { importedTrackSchema } from "@/lib/workspace-validation";
import type { WorkspaceData } from "@/lib/workspace-types";

type Row = { id: number; file: File; title: string; artist: string; trackId: string; status: string; done: boolean };
const same = (a: string, b: string) => a.trim().toLocaleLowerCase("tr-TR") === b.trim().toLocaleLowerCase("tr-TR");
export function AudioImport() {
  const { data, mutate, busy } = useWorkspace();
  const [rows, setRows] = useState<Row[]>([]), [working, setWorking] = useState(false), [error, setError] = useState("");
  function choose(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []); event.target.value = ""; setError("");
    if (files.length > 20) { setError("Bir seferde en fazla 20 dosya seçebilirsin."); return; }
    setRows(files.map((file, id) => {
      const name = file.name.replace(/\.[^.]+$/, ""); const parts = name.split(" - ");
      return { id, file, title: (parts.length > 1 ? parts.slice(1).join(" - ") : name).slice(0,200), artist: (parts.length > 1 ? parts[0] : "").slice(0,200), trackId: "", status: "", done: false };
    }));
  }
  function patch(id: number, values: Partial<Row>) { setRows(current => current.map(row => row.id === id ? { ...row, ...values } : row)); }
  async function commit() {
    if (working || busy) return;
    setWorking(true); setError("");
    let workspace = data;
    try {
      if (!workspace.profile.storageKey) throw new Error("Ses dosyalarını eklemek için sayfayı yenile.");
      for (const row of rows.filter(row => !row.done)) {
        try {
          patch(row.id, { status: "Ses analiz ediliyor…" });
          const asset = await analyzeAudioFile(row.file);
          let target = workspace.tracks.find(track => track.id === row.trackId);
          if (row.trackId && !target) throw new Error("Seçilen parça bulunamadı. Yeniden seç.");
          if (!row.trackId) {
            const input = importedTrackSchema.parse({ title: row.title, artist: row.artist, durationSeconds: Math.max(1, Math.round(asset.duration)) });
            target = workspace.tracks.find(track => same(track.title,input.title) && same(track.artist,input.artist) && !track.version.trim());
            if (!target) {
              patch(row.id, { status: "Library’ye ekleniyor…" });
              let updated: WorkspaceData | undefined;
              const ok = await mutate({ type: "tracks.audio.import", inputs: [input] }, `${input.title} Library’ye eklendi`, result => { updated = result; });
              if (!ok || !updated) throw new Error("Library kaydı eklenemedi. Yeniden dene.");
              workspace = updated;
              target = workspace.tracks.find(track => same(track.title,input.title) && same(track.artist,input.artist) && !track.version.trim());
            }
          }
          if (!target) throw new Error("Dosyanın bağlanacağı parça bulunamadı.");
          // Keep the record ID on failure so a storage retry never creates a second record.
          patch(row.id, { trackId: target.id, status: "Dosya kaydediliyor…" });
          const saved = await storeAnalyzedAudio(workspace.profile.storageKey!, target.id, asset);
          patch(row.id, { status: saved.storage === "session" ? "Hazır · Yalnızca bu oturumda. Sayfayı yenilersen ses dosyasını tekrar seç." : "Hazır · Waveform oluşturuldu", done: true });
        } catch (cause) { patch(row.id, { status: cause instanceof Error ? cause.message : "Dosya eklenemedi." }); }
      }
    } catch (cause) { setError((cause as Error).message); }
    finally { setWorking(false); }
  }
  return <Localized><section className="home-section audio-import"><Music2 size={24}/><h2><L text={"MP3 / WAV içe aktar"}/></h2>
    <p><L text={"iPad’in Dosyalar uygulamasından parçalarını seç. Ses dosyası Library’ye bağlanır, gerçek waveform oluşturulur ve Transition Lab’de kullanılabilir."}/></p>
    <label className="button primary file-button"><Upload size={16}/><L text={"Ses dosyalarını seç"}/><input type="file" multiple accept=".mp3,.wav,.m4a,.aac,.ogg,.flac,audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/aac,audio/ogg,audio/flac" onChange={choose} disabled={working || busy}/></label>
    <p className="source-disclosure"><L text={"En fazla 20 dosya; dosya başına 50 MB ve 15 dakika. M4A, AAC, OGG ve FLAC desteği tarayıcıya bağlıdır. Ses bu cihazda saklanır; JSON/CSV yedeğine dahil edilmez."}/></p>
    {error && <p className="inline-error" role="alert"><L text={error}/></p>}
    {rows.length > 0 && <><p><L text={"Parça adı ve sanatçı dosya adından önerilir; düzenleyebilirsin. Aynı ad ve sanatçıdaki mevcut kayıt kullanılır. Mevcut bir parçaya bağlarsan cihazdaki ses dosyası yenilenir."}/></p>
      <div className="audio-import-rows">{rows.map(row => <div className="audio-import-row" key={row.id}>
        <strong>{row.file.name} <small>{(row.file.size / 1024 / 1024).toFixed(1)} MB</small></strong>
        <label><L text={"Library kaydı"}/><select value={row.trackId} disabled={working || row.done} onChange={e => patch(row.id,{trackId:e.target.value})}><option value=""><L text={"Yeni parça / aynı kaydı kullan"}/></option>{data.tracks.map(track => <option key={track.id} value={track.id}>{track.title} · {track.artist}</option>)}</select></label>
        {!row.trackId && <div className="audio-import-fields"><label><L text={"Parça adı"}/><input value={row.title} maxLength={200} disabled={working || row.done} onChange={e => patch(row.id,{title:e.target.value})}/></label><label><L text={"Sanatçı"}/><input value={row.artist} maxLength={200} disabled={working || row.done} onChange={e => patch(row.id,{artist:e.target.value})}/></label></div>}
        <p role="status">{row.status ? <L text={row.status}/> : <L text="İçe aktarım için hazır"/>}</p>
      </div>)}</div>
      <div className="transfer-actions"><button className="button primary" disabled={working || busy || rows.every(row => row.done)} onClick={commit}>{working ? <L text={"Sırayla aktarılıyor…"}/> : <L text={"Ses dosyalarını içe aktar"}/>}</button><button className="button secondary" disabled={working || busy} onClick={() => setRows([])}><L text={"Listeyi temizle"}/></button></div>
      <p aria-live="polite">{rows.filter(row => row.done).length} / {rows.length}<L text={" dosya hazır. Başarısız dosyalar tekrar denenebilir."}/></p>
    </>}
  </section></Localized>;
}
