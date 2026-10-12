"use client";

import { useEffect, useMemo, useState } from "react";
import { STAGE_DEFAULT, barSeconds, extractCoverTone, toneFromText, type StageTone } from "@/lib/stage-palette";
import { useWorkspace } from "./workspace-context";

/**
 * Gün batımı kulübü zemini.
 * - Sabit katman: gökyüzü + ufuktaki güneş (her zaman aynı kimlik)
 * - Şarkı katmanı: seçili parçanın rengi, sahne sınırları içinde
 * - Nabız: parçanın BPM'ine göre ölçü başına bir kez atar
 *
 * Şu an uygulamada global bir "çalan parça" durumu olmadığı için seçili parçayı
 * (yoksa aktif setin ilk parçasını) kullanır.
 */
export function StageBackdrop() {
  const { data, selectedTrackId } = useWorkspace();

  const track = useMemo(() => {
    const picked = data.tracks.find((item) => item.id === selectedTrackId);
    if (picked) return picked;
    const activeSet = data.sets.find((set) => set.status !== "performed") ?? data.sets[0];
    const firstId = activeSet?.tracks[0]?.trackId;
    return data.tracks.find((item) => item.id === firstId) ?? null;
  }, [data.tracks, data.sets, selectedTrackId]);

  const artworkUrl = track?.linkMetadata?.artworkUrl ?? "";
  const seed = track ? `${track.title}|${track.artist}` : "";
  const bpm = track?.bpm ?? null;

  // Anında (ve kararlı) bir yedek renk; kapak okunursa onunla değiştirilir.
  const fallback = useMemo(() => (seed ? toneFromText(seed) : STAGE_DEFAULT), [seed]);
  const [cover, setCover] = useState<{ url: string; tone: StageTone } | null>(null);

  useEffect(() => {
    if (!artworkUrl) return;
    let cancelled = false;
    void extractCoverTone(artworkUrl).then((fromCover) => {
      if (!cancelled && fromCover) setCover({ url: artworkUrl, tone: fromCover });
    });
    return () => {
      cancelled = true;
    };
  }, [artworkUrl]);

  const tone = cover && cover.url === artworkUrl ? cover.tone : fallback;

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--stage-h", String(tone.hue));
    root.style.setProperty("--stage-s", `${tone.sat}%`);
    root.style.setProperty("--stage-l", `${tone.light}%`);
    root.style.setProperty("--stage-bar", `${barSeconds(bpm)}s`);
  }, [tone, bpm]);

  return (
    <div className="stage-backdrop" aria-hidden="true">
      <div className="stage-beams" />
      <div className="stage-sun" />
      <div className="stage-blob stage-blob-song"><i /></div>
      <div className="stage-blob stage-blob-violet"><i /></div>
      <div className="stage-vignette" />
    </div>
  );
}
