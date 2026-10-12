import { parseCamelot } from "./set-flow";
import type { MixSet, Session, Track } from "./workspace-types";

const day = 86_400_000;
const isoDay = (date: Date) => date.toISOString().slice(0, 10);
const utcDay = (text: string) => Date.parse(`${text}T00:00:00Z`);

export function bpmHistogram(tracks: Track[], width = 4) {
  const bpms = tracks.map((t) => t.bpm).filter((b): b is number => b !== null && b > 0);
  if (!bpms.length) return [];
  const start = Math.floor(Math.min(...bpms) / width) * width, end = Math.floor(Math.max(...bpms) / width) * width;
  const buckets = Array.from({ length: (end - start) / width + 1 }, (_, i) => ({ from: start + i * width, to: start + (i + 1) * width, count: 0 }));
  for (const bpm of bpms) buckets[Math.floor((bpm - start) / width)].count += 1;
  return buckets;
}

export function topKeys(tracks: Track[], limit = 6) {
  const counts = new Map<string, number>();
  for (const t of tracks) { const key = parseCamelot(t.musicalKey); if (key) { const id = `${key.number}${key.letter}`; counts.set(id, (counts.get(id) ?? 0) + 1); } }
  return [...counts].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key, "en", { numeric: true })).slice(0, limit);
}

// A set counts once per logged performance, or once if it is marked performed without a log.
export function mostPlayed(tracks: Track[], sets: MixSet[], sessions: Session[], limit = 5) {
  const plays = new Map<string, number>();
  for (const set of sets) {
    const logged = sessions.filter((s) => s.kind === "performance" && s.setId === set.id).length;
    const times = logged || (set.status === "performed" ? 1 : 0);
    for (const item of set.tracks) plays.set(item.trackId, (plays.get(item.trackId) ?? 0) + times);
  }
  const byId = new Map(tracks.map((t) => [t.id, t]));
  return [...plays].filter(([id, n]) => n > 0 && byId.has(id)).map(([id, plays]) => ({ track: byId.get(id)!, plays }))
    .sort((a, b) => b.plays - a.plays || a.track.title.localeCompare(b.track.title)).slice(0, limit);
}

export function practiceStreak(sessions: Session[], today = new Date()) {
  const days = new Set(sessions.map((s) => s.date));
  let cursor = utcDay(isoDay(today));
  if (!days.has(isoDay(new Date(cursor)))) cursor -= day;
  let streak = 0;
  while (days.has(isoDay(new Date(cursor)))) { streak += 1; cursor -= day; }
  return streak;
}

export function minutesSince(sessions: Session[], days: number, today = new Date()) {
  const from = utcDay(isoDay(today)) - (days - 1) * day;
  return sessions.filter((s) => utcDay(s.date) >= from).reduce((sum, s) => sum + s.durationMinutes, 0);
}

// Week columns (Monday first) ending with the current week; each cell is one day's minutes.
export function activityGrid(sessions: Session[], weeks = 12, today = new Date()) {
  const minutes = new Map<string, number>();
  for (const s of sessions) minutes.set(s.date, (minutes.get(s.date) ?? 0) + s.durationMinutes);
  const end = utcDay(isoDay(today));
  const weekday = (new Date(end).getUTCDay() + 6) % 7;
  const start = end - weekday * day - (weeks - 1) * 7 * day;
  return Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => {
    const time = start + (w * 7 + d) * day, date = isoDay(new Date(time));
    return { date, minutes: minutes.get(date) ?? 0, future: time > end };
  }));
}

export function activityLevel(minutes: number) {
  return minutes <= 0 ? 0 : minutes < 30 ? 1 : minutes < 60 ? 2 : minutes < 120 ? 3 : 4;
}
