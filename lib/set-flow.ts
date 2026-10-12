import { camelotCompatible } from "./dj-logic";
import type { Track, Transition } from "./workspace-types";

export type CamelotKey = { number: number; letter: "A" | "B" };
export type HarmonicMatch = "same" | "compatible" | "energy-boost" | "clash" | "unknown";

export function parseCamelot(key: string): CamelotKey | null {
  const match = /^([1-9]|1[0-2])([AB])$/i.exec(key.trim());
  return match ? { number: Number(match[1]), letter: match[2].toUpperCase() as "A" | "B" } : null;
}

// Keys a DJ can mix into from `key`: same, relative major/minor, ±1 on the wheel and the +2 energy boost.
export function compatibleKeys(key: string): string[] {
  const parsed = parseCamelot(key);
  if (!parsed) return [];
  const step = (offset: number) => ((parsed.number - 1 + offset + 12) % 12) + 1;
  const other = parsed.letter === "A" ? "B" : "A";
  return [`${parsed.number}${parsed.letter}`, `${parsed.number}${other}`, `${step(1)}${parsed.letter}`, `${step(-1)}${parsed.letter}`, `${step(2)}${parsed.letter}`];
}

export function harmonicMatch(from: string, to: string): HarmonicMatch {
  const a = parseCamelot(from), b = parseCamelot(to);
  if (!a || !b) return "unknown";
  if (a.number === b.number && a.letter === b.letter) return "same";
  if (camelotCompatible(from, to)) return "compatible";
  if (a.letter === b.letter && ((b.number - a.number + 12) % 12) === 2) return "energy-boost";
  return "clash";
}

export type PairScore = { score: number; bpmDelta: number | null; energyDelta: number | null; harmonic: HarmonicMatch; prepared: boolean };

// Higher is smoother. Weights mirror recommendNext so suggestions and ordering agree.
export function scorePair(from: Track, to: Track, transitions: Transition[]): PairScore {
  const memory = transitions.find((t) => t.fromTrackId === from.id && t.toTrackId === to.id);
  let score = 0;
  if (memory) score += memory.practiceStatus === "ready" ? 45 : 20;
  const bpmDelta = from.bpm !== null && to.bpm !== null ? Math.round((to.bpm - from.bpm) * 10) / 10 : null;
  if (bpmDelta !== null) score += Math.max(-30, 25 - Math.abs(bpmDelta) * 3);
  const harmonic = harmonicMatch(from.musicalKey, to.musicalKey);
  score += { same: 22, compatible: 20, "energy-boost": 12, clash: -15, unknown: 0 }[harmonic];
  const energyDelta = from.energy !== null && to.energy !== null ? to.energy - from.energy : null;
  if (energyDelta !== null) score += Math.abs(energyDelta) <= 1 ? 10 : -6 * (Math.abs(energyDelta) - 1);
  if (from.genre && from.genre.trim().toLocaleLowerCase("tr-TR") === to.genre.trim().toLocaleLowerCase("tr-TR")) score += 8;
  return { score, bpmDelta, energyDelta, harmonic, prepared: Boolean(memory) };
}

export function flowScore(tracks: Track[], transitions: Transition[]) {
  if (tracks.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < tracks.length - 1; i += 1) total += scorePair(tracks[i], tracks[i + 1], transitions).score;
  return Math.round(total / (tracks.length - 1));
}

// Greedy path from the fixed opener, then 2-opt passes. Keeps the first track so the DJ's opener stays.
export function optimizeOrder(tracks: Track[], transitions: Transition[]): Track[] {
  if (tracks.length < 3) return [...tracks];
  const cost = (a: Track, b: Track) => scorePair(a, b, transitions).score;
  const [first, ...rest] = tracks;
  const order = [first];
  const pool = [...rest];
  while (pool.length) {
    const last = order[order.length - 1];
    let best = 0;
    for (let i = 1; i < pool.length; i += 1) if (cost(last, pool[i]) > cost(last, pool[best])) best = i;
    order.push(pool.splice(best, 1)[0]);
  }
  const total = (list: Track[]) => list.slice(0, -1).reduce((sum, t, i) => sum + cost(t, list[i + 1]), 0);
  let improved = true, guard = 0;
  while (improved && guard < 50) {
    improved = false; guard += 1;
    for (let i = 1; i < order.length - 1; i += 1) {
      for (let j = i + 1; j < order.length; j += 1) {
        const candidate = [...order.slice(0, i), ...order.slice(i, j + 1).reverse(), ...order.slice(j + 1)];
        if (total(candidate) > total(order)) { order.splice(0, order.length, ...candidate); improved = true; }
      }
    }
  }
  return total(order) >= total(tracks) ? order : [...tracks];
}
