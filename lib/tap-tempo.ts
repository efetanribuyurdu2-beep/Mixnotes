// Average BPM from tap timestamps (ms). Outlier intervals (>40% from the median) are ignored.
export function tapTempo(taps: number[]): number | null {
  if (taps.length < 2) return null;
  const intervals = taps.slice(1).map((t, i) => t - taps[i]).filter((ms) => ms > 150 && ms < 2000);
  if (!intervals.length) return null;
  const sorted = [...intervals].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const steady = intervals.filter((ms) => Math.abs(ms - median) <= median * 0.4);
  const average = steady.reduce((sum, ms) => sum + ms, 0) / steady.length;
  return Math.round((60000 / average) * 10) / 10;
}

// Delay/echo times a DJ dials into FX units for the given tempo.
export function beatTimings(bpm: number) {
  const beat = 60000 / bpm;
  return [["1/4", beat / 4], ["1/2", beat / 2], ["3/4", beat * 0.75], ["1", beat], ["2", beat * 2], ["1 BAR", beat * 4]].map(([label, ms]) => ({ label: label as string, ms: Math.round(ms as number) }));
}
