import { scorePair } from "./set-flow";
import type { Track, Transition } from "./workspace-types";

export type SetTemplate = {
  id: string;
  name: string;
  description: string;
  minutes: number;
  // Energy targets (1–5) sampled evenly across the set; interpolated per slot.
  energy: number[];
  // BPM drift relative to the opener, sampled the same way.
  bpmDrift: number[];
  // Where the opener should sit within the Library's BPM range (0 = slowest, 1 = fastest).
  startTempo: number;
};

export const setTemplates: SetTemplate[] = [
  { id: "warmup", name: "Isınma", description: "Düşük enerjiyle başla, odayı yavaşça doldur.", minutes: 60, energy: [2, 2, 2.5, 3, 3, 3.5], bpmDrift: [0, 1, 2, 3, 4, 5], startTempo: 0.15 },
  { id: "peak", name: "Zirve saati", description: "Yüksek enerjiyi koru, kısa nefes aralarıyla.", minutes: 60, energy: [4, 4.5, 5, 4, 5, 5], bpmDrift: [0, 1, 2, 2, 3, 3], startTempo: 0.6 },
  { id: "sunset", name: "Gün batımı", description: "Melodik bir yükseliş, sonra yumuşak bir iniş.", minutes: 90, energy: [2, 3, 4, 4, 3.5, 3], bpmDrift: [0, 1, 2, 3, 2, 1], startTempo: 0.25 },
  { id: "journey", name: "Yolculuk", description: "Uzun set: yavaş başla, zirveye çık, kontrollü kapat.", minutes: 120, energy: [2, 3, 4, 5, 5, 4, 3], bpmDrift: [0, 2, 4, 6, 7, 6, 5], startTempo: 0.2 },
  { id: "closing", name: "Kapanış", description: "Zirveden çık, tanıdık parçalarla nazikçe bitir.", minutes: 45, energy: [4, 3.5, 3, 2.5, 2], bpmDrift: [0, -1, -2, -3, -4], startTempo: 0.55 },
];

export function sampleCurve(curve: number[], position: number) {
  if (curve.length === 1) return curve[0];
  const scaled = Math.min(1, Math.max(0, position)) * (curve.length - 1), i = Math.floor(scaled), t = scaled - i;
  return i >= curve.length - 1 ? curve[curve.length - 1] : curve[i] * (1 - t) + curve[i + 1] * t;
}

export type GenerateOptions = { minutes?: number; genre?: string };

export function generateFromTemplate(library: Track[], template: SetTemplate, transitions: Transition[], options: GenerateOptions = {}) {
  const minutes = options.minutes ?? template.minutes;
  const needle = options.genre?.trim().toLocaleLowerCase("tr-TR") ?? "";
  const pool = library.filter((t) => t.origin === "library" && (!needle || `${t.genre} ${t.subgenre}`.toLocaleLowerCase("tr-TR").includes(needle)));
  if (!pool.length) return [];
  const known = pool.map((t) => t.bpm).filter((b): b is number => b !== null).sort((a, b) => a - b);
  const startBpm = known.length ? known[Math.min(known.length - 1, Math.floor(template.startTempo * known.length))] : null;
  const fit = (track: Track, position: number) => {
    let score = 0;
    const energy = sampleCurve(template.energy, position);
    score -= track.energy === null ? 8 : Math.abs(track.energy - energy) * 14;
    if (startBpm !== null && track.bpm !== null) score -= Math.abs(track.bpm - (startBpm + sampleCurve(template.bpmDrift, position))) * 2.5;
    return score + track.rating * 2;
  };
  const chosen: Track[] = [];
  const remaining = [...pool];
  let seconds = 0;
  while (remaining.length && seconds < minutes * 60) {
    const position = seconds / (minutes * 60);
    const previous = chosen[chosen.length - 1];
    let best = 0, bestScore = -Infinity;
    remaining.forEach((track, i) => {
      const score = fit(track, position) + (previous ? scorePair(previous, track, transitions).score * 0.6 : 0);
      if (score > bestScore) { bestScore = score; best = i; }
    });
    const [track] = remaining.splice(best, 1);
    chosen.push(track);
    seconds += track.durationSeconds ?? 300;
  }
  return chosen;
}
