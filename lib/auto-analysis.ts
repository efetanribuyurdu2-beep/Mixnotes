import { analyzePcm, type AudioAnalysis } from "./audio-analysis";
import type { Track } from "./workspace-types";

export const needsAnalysis = (track: Track) => track.bpm === null || !track.musicalKey.trim();

// Only fills what is missing, so values the DJ typed (or confirmed) are never overwritten.
export function missingFields(track: Track, analysis: AudioAnalysis) {
  const fields: { bpm?: number; musicalKey?: string } = {};
  if (track.bpm === null && analysis.tempo && analysis.tempo.confidence >= 0.2) fields.bpm = analysis.tempo.bpm;
  if (!track.musicalKey.trim() && analysis.key && analysis.key.confidence >= 0.15) fields.musicalKey = analysis.key.camelot;
  return fields;
}

export async function analyzeBlob(blob: Blob): Promise<AudioAnalysis> {
  const context = new AudioContext({ sampleRate: 22050 });
  try {
    const audio = await context.decodeAudioData(await blob.arrayBuffer());
    return analyzePcm(Array.from({ length: audio.numberOfChannels }, (_, i) => audio.getChannelData(i)), audio.sampleRate);
  } finally {
    await context.close();
  }
}

export async function analyzePreview(track: Track): Promise<AudioAnalysis | null> {
  const query = new URLSearchParams({ title: track.title, artist: track.artist });
  const response = await fetch(`/api/preview-audio?${query}`);
  if (!response.ok) return null;
  return analyzeBlob(await response.blob());
}

const triedKey = (owner: string) => `mixnotes.autoAnalysis.${owner}`;
export function triedIds(owner: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(triedKey(owner)) ?? "[]") as string[]); } catch { return new Set(); }
}
export function rememberTried(owner: string, ids: Set<string>) {
  try { localStorage.setItem(triedKey(owner), JSON.stringify([...ids].slice(-2000))); } catch { /* best effort */ }
}
