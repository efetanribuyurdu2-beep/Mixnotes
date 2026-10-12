"use client";
import { L, Localized } from "./localized";

import { useState } from "react";
import { Check, LoaderCircle, ScanSearch } from "lucide-react";
import { useWorkspace } from "./workspace-context";
import { analyzeStoredAudio, type LocalAudio } from "@/lib/local-audio";
import { trackInputFrom } from "@/lib/dj-logic";
import type { AudioAnalysis } from "@/lib/audio-analysis";

const level = (confidence: number) => (confidence >= 0.6 ? "Yüksek güven" : confidence >= 0.3 ? "Orta güven" : "Düşük güven");

export function AudioAnalysisPanel({ trackId, asset }: { trackId: string; asset: LocalAudio }) {
  const { data, mutate, busy } = useWorkspace();
  const track = data.tracks.find((item) => item.id === trackId);
  const [result, setResult] = useState<AudioAnalysis | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  if (!track) return null;

  async function run() {
    setWorking(true); setError("");
    // Yield a frame so the spinner paints before the synchronous DSP work.
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
    try { setResult(await analyzeStoredAudio(asset.file)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Analiz başarısız."); }
    finally { setWorking(false); }
  }

  async function apply(fields: { bpm?: number; musicalKey?: string }) {
    if (!track) return;
    await mutate({ type: "track.update", id: track.id, expectedRevision: track.revision, input: { ...trackInputFrom(track), ...fields } }, "Analiz sonucu parçaya kaydedildi");
  }

  const tempo = result?.tempo, key = result?.key;
  const bpmDiffers = tempo && track.bpm !== tempo.bpm;
  const keyDiffers = key && track.musicalKey.trim().toUpperCase() !== key.camelot;

  return (
    <Localized><div className="audio-analysis">
      <button className="button secondary" disabled={working || busy} onClick={run}>
        {working ? <LoaderCircle className="spin" size={15} /> : <ScanSearch size={15} />}
        {working ? <L text="Analiz ediliyor…" /> : result ? <L text="Yeniden analiz et" /> : <L text="BPM ve key'i analiz et" />}
      </button>
      {error && <p role="alert" className="inline-error"><L text={error} /></p>}
      {result && (
        <div className="analysis-results" aria-live="polite">
          <div>
            <small>BPM</small>
            <strong>{tempo ? tempo.bpm : "—"}</strong>
            {tempo && <em><L text={level(tempo.confidence)} /></em>}
            {tempo && <span className="analysis-alt">½ {(tempo.bpm / 2).toFixed(1)} · ×2 {(tempo.bpm * 2).toFixed(1)}</span>}
          </div>
          <div>
            <small>KEY</small>
            <strong>{key ? key.camelot : "—"}</strong>
            {key && <em>{key.name} · <L text={level(key.confidence)} /></em>}
          </div>
          <div className="analysis-actions">
            {bpmDiffers || keyDiffers ? (
              <button className="button primary" disabled={busy} onClick={() => apply({ ...(bpmDiffers ? { bpm: tempo!.bpm } : {}), ...(keyDiffers ? { musicalKey: key!.camelot } : {}) })}>
                <Check size={15} /><L text="Parçaya uygula" />
              </button>
            ) : (tempo || key) ? <p className="muted-copy"><Check size={13} /> <L text="Kayıttaki değerlerle aynı." /></p> : <p className="muted-copy"><L text="Belirgin bir ritim veya ton bulunamadı." /></p>}
          </div>
          <p className="audio-local-note"><L text="Analiz bu cihazda yapılır ve tahmindir. Yarım/çift tempo karışabilir; kulağınla doğrula." /></p>
        </div>
      )}
    </div></Localized>
  );
}
