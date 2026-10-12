import type { SmartRule, Track, Transition } from "./workspace-types";

const lower = (text: string) => text.trim().toLocaleLowerCase("tr-TR");
export function matchesRule(track: Track, rule: SmartRule): boolean {
  return (!rule.genre || lower(`${track.genre} ${track.subgenre}`).includes(lower(rule.genre)))
    && (!rule.tag || track.tags.some((tag) => lower(tag) === lower(rule.tag)))
    && (rule.bpmMin === null || (track.bpm !== null && track.bpm >= rule.bpmMin))
    && (rule.bpmMax === null || (track.bpm !== null && track.bpm <= rule.bpmMax))
    && (rule.energyMin === null || (track.energy !== null && track.energy >= rule.energyMin))
    && track.rating >= rule.ratingMin && (rule.origin === "all" || track.origin === rule.origin);
}

export function camelotCompatible(a: string, b: string): boolean | null {
  const parse = (key: string) => /^([1-9]|1[0-2])([AB])$/i.exec(key.trim());
  const x = parse(a), y = parse(b);
  if (!x || !y) return null;
  const diff = Math.abs(Number(x[1]) - Number(y[1]));
  return (x[1] === y[1] && x[2].toUpperCase() !== y[2].toUpperCase()) || (x[2].toUpperCase() === y[2].toUpperCase() && [0,1,11].includes(diff));
}

export function recommendNext(from: Track, candidates: Track[], transitions: Transition[]) {
  return candidates.filter((t) => t.id !== from.id && t.origin === "library").map((track) => {
    const reasons: string[] = [];
    let score = 0;
    const memory = transitions.find((t) => t.fromTrackId === from.id && t.toTrackId === track.id);
    if (memory) { score += memory.practiceStatus === "ready" ? 45 : 20; reasons.push(memory.practiceStatus === "ready" ? "Provası hazır geçiş" : "Geçiş notun var"); }
    if (from.bpm !== null && track.bpm !== null) {
      const difference = Math.abs(from.bpm - track.bpm);
      if (difference <= 4) { score += 25 - difference * 3; reasons.push(`${difference.toFixed(1)} BPM fark`); }
    }
    if (camelotCompatible(from.musicalKey, track.musicalKey)) { score += 20; reasons.push("Camelot uyumu"); }
    if (from.energy !== null && track.energy !== null && Math.abs(from.energy - track.energy) <= 1) { score += 10; reasons.push("Yakın enerji"); }
    if (from.genre && lower(from.genre) === lower(track.genre)) { score += 8; reasons.push("Aynı tür"); }
    return { track, score, reasons };
  }).filter((r) => r.reasons.length > 0).sort((a,b) => b.score-a.score || a.track.title.localeCompare(b.track.title)).slice(0,6);
}

export function trackInputFrom(track: Track) {
  const { id: _id, revision: _revision, dateAdded: _dateAdded, updatedAt: _updatedAt, sources, ...input } = track;
  return { ...input, sourceProvider: sources[0]?.provider ?? "", sourceUrl: sources[0]?.externalUrl ?? "" };
}
