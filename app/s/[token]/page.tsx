import type { Metadata } from "next";
import { readSharedSet } from "@/db/set-shares";
import { harmonicMatch } from "@/lib/set-flow";

export const dynamic = "force-dynamic";

async function load(token: string) {
  try { return await readSharedSet(token); } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const set = await load((await params).token);
  return { title: set ? `${set.title} · MixNotes` : "MixNotes", robots: { index: false, follow: false } };
}

const minutes = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export default async function SharedSetPage({ params }: { params: Promise<{ token: string }> }) {
  const set = await load((await params).token);
  if (!set) {
    return (
      <main className="share-page share-missing">
        <p className="overline">MIXNOTES</p>
        <h1>Bu set artık paylaşılmıyor.</h1>
        <p>Bağlantı kaldırılmış veya yanlış olabilir.</p>
      </main>
    );
  }
  const total = set.tracks.reduce((sum, track) => sum + (track.durationSeconds ?? 0), 0);
  const bpms = set.tracks.map((t) => t.bpm).filter((b): b is number => b !== null);
  return (
    <main className="share-page">
      <header className="share-head">
        <p className="overline">MIXNOTES · SET</p>
        <h1>{set.title}</h1>
        <p className="share-meta">
          {[set.genre, set.eventDate && new Date(`${set.eventDate}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })].filter(Boolean).join(" · ")}
        </p>
        <div className="share-stats">
          <span><small>PARÇA</small><strong>{set.tracks.length}</strong></span>
          {total > 0 && <span><small>SÜRE</small><strong>{Math.round(total / 60)} dk</strong></span>}
          {bpms.length > 0 && <span><small>BPM</small><strong>{Math.min(...bpms)}–{Math.max(...bpms)}</strong></span>}
        </div>
      </header>
      <ol className="share-list">
        {set.tracks.map((track, index) => {
          const previous = set.tracks[index - 1];
          const match = previous ? harmonicMatch(previous.musicalKey, track.musicalKey) : "unknown";
          return (
            <li key={index}>
              <span className="share-index">{String(index + 1).padStart(2, "0")}</span>
              <div className="share-track">
                <strong>{track.title}{track.version && <em> ({track.version})</em>}</strong>
                <span>{track.artist}</span>
              </div>
              <div className="share-data">
                <span>{track.bpm ?? "—"}<small>BPM</small></span>
                <span className={`share-key is-${match}`}>{track.musicalKey || "—"}</span>
                {track.durationSeconds ? <span>{minutes(track.durationSeconds)}</span> : null}
              </div>
            </li>
          );
        })}
      </ol>
      <footer className="share-foot">MixNotes ile hazırlandı · DJ notları ve cue&apos;lar gizli tutulur.</footer>
    </main>
  );
}
