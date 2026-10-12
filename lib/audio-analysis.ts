// Browser-side tempo and key estimation on decoded PCM. Pure functions so tests can feed synthetic audio.
// Results are estimates: the UI always shows them as suggestions the DJ confirms.

export type TempoEstimate = { bpm: number; confidence: number };
export type KeyEstimate = { camelot: string; name: string; confidence: number };
export type AudioAnalysis = { tempo: TempoEstimate | null; key: KeyEstimate | null };

const pitchNames = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];

export function mixdown(channels: Float32Array[]): Float32Array {
  if (channels.length === 1) return channels[0];
  const out = new Float32Array(channels[0].length);
  for (const channel of channels) for (let i = 0; i < out.length; i += 1) out[i] += channel[i] / channels.length;
  return out;
}

// Analyse at most `seconds` from the middle of the track, where the groove is steadiest.
export function middleWindow(samples: Float32Array, sampleRate: number, seconds = 90) {
  const length = Math.min(samples.length, Math.floor(seconds * sampleRate));
  const start = Math.floor((samples.length - length) / 2);
  return samples.subarray(start, start + length);
}

export function onsetEnvelope(samples: Float32Array, sampleRate: number, hop = 256) {
  const frames = Math.floor(samples.length / hop);
  const energy = new Float32Array(frames);
  // One-pole low-pass favours kick and bass, which carry the grid in dance music.
  const alpha = Math.exp(-2 * Math.PI * 180 / sampleRate);
  let low = 0;
  for (let f = 0; f < frames; f += 1) {
    let sum = 0;
    for (let i = f * hop; i < (f + 1) * hop; i += 1) { low = alpha * low + (1 - alpha) * samples[i]; const broad = samples[i]; sum += low * low * 4 + broad * broad; }
    energy[f] = Math.log1p(sum * 100);
  }
  const envelope = new Float32Array(frames);
  for (let f = 1; f < frames; f += 1) envelope[f] = Math.max(0, energy[f] - energy[f - 1]);
  let mean = 0;
  for (const value of envelope) mean += value;
  mean /= Math.max(1, frames);
  for (let f = 0; f < frames; f += 1) envelope[f] = Math.max(0, envelope[f] - mean);
  return { envelope, frameRate: sampleRate / hop };
}

export function detectTempo(samples: Float32Array, sampleRate: number, range: [number, number] = [78, 168]): TempoEstimate | null {
  const { envelope, frameRate } = onsetEnvelope(middleWindow(samples, sampleRate), sampleRate);
  if (envelope.length < frameRate * 6) return null;
  const minLag = Math.floor(frameRate * 60 / range[1]), maxLag = Math.ceil(frameRate * 60 / range[0]) * 4 + 2;
  const acf = new Float32Array(maxLag + 2);
  let zero = 0;
  for (let i = 0; i < envelope.length; i += 1) zero += envelope[i] * envelope[i];
  if (zero <= 0) return null;
  for (let lag = 1; lag <= maxLag + 1; lag += 1) {
    let sum = 0;
    for (let i = lag; i < envelope.length; i += 1) sum += envelope[i] * envelope[i - lag];
    acf[lag] = sum / zero;
  }
  const interpolated = (lag: number) => { const i = Math.floor(lag), t = lag - i; return acf[i] * (1 - t) + acf[i + 1] * t; };
  // Score each beat period by its first four multiples so 4/4 bar structure sharpens the estimate.
  let bestLag = 0, bestScore = -Infinity;
  const topLag = Math.ceil(frameRate * 60 / range[0]);
  for (let lag = minLag; lag <= topLag; lag += 0.02) {
    const score = interpolated(lag) + 0.8 * interpolated(lag * 2) + 0.6 * interpolated(lag * 3) + 0.5 * interpolated(lag * 4);
    if (score > bestScore) { bestScore = score; bestLag = lag; }
  }
  if (!bestLag || bestScore <= 0) return null;
  let bpm = 60 * frameRate / bestLag;
  while (bpm < range[0]) bpm *= 2;
  while (bpm > range[1]) bpm /= 2;
  const confidence = Math.max(0, Math.min(1, bestScore / 2.9));
  return { bpm: Math.round(bpm * 10) / 10, confidence: Math.round(confidence * 100) / 100 };
}

function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const angle = -2 * Math.PI / size, wr = Math.cos(angle), wi = Math.sin(angle);
    for (let start = 0; start < n; start += size) {
      let cr = 1, ci = 0;
      for (let k = 0; k < size / 2; k += 1) {
        const a = start + k, b = a + size / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const next = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = next;
      }
    }
  }
}

export function chromagram(samples: Float32Array, sampleRate: number, size = 4096) {
  const window = middleWindow(samples, sampleRate, 120);
  const chroma = new Float64Array(12);
  const hann = Float64Array.from({ length: size }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (size - 1)));
  const bins = Array.from({ length: size / 2 }, (_, k) => {
    const freq = k * sampleRate / size;
    if (freq < 65 || freq > 2100) return -1;
    return ((Math.round(12 * Math.log2(freq / 440)) % 12) + 12 + 9) % 12;
  });
  const step = Math.max(size, Math.floor(sampleRate * 0.25));
  for (let start = 0; start + size <= window.length; start += step) {
    const re = new Float64Array(size), im = new Float64Array(size);
    for (let i = 0; i < size; i += 1) re[i] = window[start + i] * hann[i];
    fft(re, im);
    const frame = new Float64Array(12);
    for (let k = 1; k < size / 2; k += 1) if (bins[k] >= 0) frame[bins[k]] += Math.sqrt(re[k] * re[k] + im[k] * im[k]);
    const total = frame.reduce((a, b) => a + b, 0);
    if (total > 1e-6) for (let p = 0; p < 12; p += 1) chroma[p] += Math.sqrt(frame[p] / total);
  }
  return chroma;
}

// Krumhansl–Kessler key profiles.
const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

function correlation(a: ArrayLike<number>, b: number[]) {
  const n = 12, ma = Array.from(a).reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i += 1) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

export function camelotFor(pitchClass: number, mode: "major" | "minor") {
  const majorPc = mode === "major" ? pitchClass : (pitchClass + 3) % 12;
  return `${((majorPc * 7) % 12 + 7) % 12 + 1}${mode === "major" ? "B" : "A"}`;
}

export function detectKey(samples: Float32Array, sampleRate: number): KeyEstimate | null {
  const chroma = chromagram(samples, sampleRate);
  if (chroma.every((v) => v === 0)) return null;
  const scores: { pc: number; mode: "major" | "minor"; r: number }[] = [];
  for (let pc = 0; pc < 12; pc += 1) {
    const rotate = (profile: number[]) => profile.map((_, i) => profile[(i - pc + 12) % 12]);
    scores.push({ pc, mode: "major", r: correlation(chroma, rotate(majorProfile)) }, { pc, mode: "minor", r: correlation(chroma, rotate(minorProfile)) });
  }
  scores.sort((a, b) => b.r - a.r);
  const [best, second] = scores;
  if (best.r <= 0) return null;
  return {
    camelot: camelotFor(best.pc, best.mode),
    name: `${pitchNames[best.pc]}${best.mode === "minor" ? "m" : ""}`,
    confidence: Math.round(Math.max(0, Math.min(1, (best.r - second.r) * 4 + best.r * 0.5)) * 100) / 100,
  };
}

export function analyzePcm(channels: Float32Array[], sampleRate: number): AudioAnalysis {
  const mono = mixdown(channels);
  return { tempo: detectTempo(mono, sampleRate), key: detectKey(mono, sampleRate) };
}
