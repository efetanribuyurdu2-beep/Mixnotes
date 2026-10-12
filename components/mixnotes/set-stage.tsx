"use client";
import { L, Localized } from "./localized";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles, Star, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useWorkspace } from "./workspace-context";
import { flowScore, harmonicMatch, optimizeOrder, scorePair, type HarmonicMatch } from "@/lib/set-flow";
import type { MixSet, Track } from "@/lib/workspace-types";

const harmonicLabels: Record<HarmonicMatch, string> = {
  same: "Aynı key",
  compatible: "Harmonik uyum",
  "energy-boost": "Enerji yükseltme",
  clash: "Key çatışması",
  unknown: "Key bilinmiyor",
};

export function HarmonicBadge({ from, to }: { from: Track; to: Track }) {
  const match = harmonicMatch(from.musicalKey, to.musicalKey);
  if (match === "unknown") return null;
  return <span className={`harmonic-badge is-${match}`} title={`${from.musicalKey} → ${to.musicalKey}`}><L text={harmonicLabels[match]} /></span>;
}

function formatClock(seconds: number) {
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(s).padStart(2, "0")}`;
}

export function StageMode({ set, tracks, onClose }: { set: MixSet; tracks: Track[]; onClose: () => void }) {
  const { data, mutate, busy, setSelectedTrackId } = useWorkspace();
  const [index, setIndex] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [logging, setLogging] = useState(false);
  const touchStart = useRef<number | null>(null);
  const current = tracks[index];
  const next = tracks[index + 1];
  const transition = next ? data.transitions.find((t) => t.fromTrackId === current.id && t.toTrackId === next.id) : undefined;
  const notes = set.tracks.find((item) => item.trackId === current?.id)?.notes;

  // The stage backdrop follows the selected track, so its colour and pulse follow the set.
  useEffect(() => { if (current) setSelectedTrackId(current.id); }, [current, setSelectedTrackId]);

  const go = useCallback((delta: number) => setIndex((value) => Math.min(tracks.length - 1, Math.max(0, value + delta))), [tracks.length]);

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (logging) return;
      if (event.key === "ArrowRight" || event.key === " ") { event.preventDefault(); go(1); }
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "Escape") setLogging(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, logging]);

  // Keep the screen awake in the booth; unsupported browsers simply skip it.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((value) => { lock = value; }).catch(() => {});
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { void lock?.release().catch(() => {}); document.body.style.overflow = previous; };
  }, []);

  async function logPerformance(rating: number) {
    const ok = await mutate({
      type: "session.create",
      input: { kind: "performance", date: new Date().toISOString().slice(0, 10), durationMinutes: Math.min(1440, Math.max(1, Math.round(elapsed / 60))), setId: set.id, transitionId: null, rating, notes: `Sahne modu · ${index + 1}/${tracks.length} parça` },
    }, "Performans kaydedildi");
    if (ok) onClose();
  }

  if (!current) return null;
  return (
    <Localized><div
      className="stage-mode"
      role="dialog"
      aria-modal="true"
      aria-label="Sahne modu"
      onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }}
      onTouchEnd={(event) => {
        if (touchStart.current === null) return;
        const dx = event.changedTouches[0].clientX - touchStart.current;
        if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
        touchStart.current = null;
      }}
    >
      <header className="stage-top">
        <div><p className="overline"><L text={"SAHNE MODU"} /></p><strong>{set.title}</strong></div>
        <div className="stage-clock" aria-label="Geçen süre">{formatClock(elapsed)}</div>
        <button className="icon-control" onClick={() => setLogging(true)} aria-label="Sahne modunu kapat"><X size={20} /></button>
      </header>

      <div className="stage-progress" aria-hidden="true">{tracks.map((track, i) => <i key={track.id} className={i < index ? "done" : i === index ? "now" : ""} />)}</div>

      <main className="stage-now">
        <p className="stage-position">{String(index + 1).padStart(2, "0")} / {String(tracks.length).padStart(2, "0")}</p>
        <h1>{current.title}</h1>
        <p className="stage-artist">{current.artist}</p>
        <div className="stage-stats">
          <span><small>BPM</small><strong>{current.bpm ?? "—"}</strong></span>
          <span><small>KEY</small><strong>{current.musicalKey || "—"}</strong></span>
          <span><small><L text={"ENERJİ"} /></small><strong>{current.energy ?? "—"}<em>/5</em></strong></span>
        </div>
        {(current.cueNotes || current.outroNotes || notes) && (
          <div className="stage-notes">
            {current.cueNotes && <p><b>CUE</b>{current.cueNotes}</p>}
            {current.outroNotes && <p><b>OUTRO</b>{current.outroNotes}</p>}
            {notes && <p><b><L text={"NOT"} /></b>{notes}</p>}
          </div>
        )}
      </main>

      {next ? (
        <section className="stage-next">
          <div className="stage-transition">
            <ArrowRight size={18} />
            <div>
              <strong>{transition?.transitionType || <L text={"Geçiş notu yok"} />}</strong>
              <p>{[transition?.mixOutPoint && `OUT ${transition.mixOutPoint}`, transition?.mixInPoint && `IN ${transition.mixInPoint}`, transition?.eqTechnique, transition?.fxNotes, transition?.timingNotes].filter(Boolean).join(" · ") || [current.bpm && next.bpm ? `${next.bpm - current.bpm > 0 ? "+" : ""}${Math.round((next.bpm - current.bpm) * 10) / 10} BPM` : ""].join("")}</p>
            </div>
            <HarmonicBadge from={current} to={next} />
          </div>
          <button className="stage-next-card" onClick={() => go(1)}>
            <small><L text={"SIRADAKİ"} /></small>
            <strong>{next.title}</strong>
            <span>{next.artist} · {next.bpm ?? "—"} BPM · {next.musicalKey || "—"}</span>
            {next.introNotes && <em>INTRO · {next.introNotes}</em>}
          </button>
        </section>
      ) : (
        <section className="stage-next stage-finale"><Sparkles size={18} /><strong><L text={"Son parça. Kapanışı güzel yap."} /></strong></section>
      )}

      <footer className="stage-controls">
        <button className="button secondary" disabled={index === 0} onClick={() => go(-1)}><ChevronLeft size={18} /><L text={"Önceki"} /></button>
        <button className="button primary" disabled={!next} onClick={() => go(1)}><L text={"Sonraki"} /><ChevronRight size={18} /></button>
      </footer>

      {logging && (
        <div className="stage-log" role="alertdialog" aria-label="Performansı kaydet">
          <div>
            <h2><L text={"Performansı kaydet?"} /></h2>
            <p>{formatClock(elapsed)} · {index + 1}/{tracks.length} <L text={"parça"} /></p>
            <p className="muted-copy"><L text={"Nasıl geçti? Puan verirsen Transition Lab geçmişine eklenir ve set çalındı olarak işaretlenir."} /></p>
            <div className="stage-rating">{[1, 2, 3, 4, 5].map((value) => <button key={value} className="icon-control" disabled={busy} onClick={() => logPerformance(value)} aria-label={`${value}/5`}><Star size={18} />{value}</button>)}</div>
            <div className="stage-log-actions">
              <button className="button secondary" onClick={() => setLogging(false)}><L text={"Sahneye dön"} /></button>
              <button className="button secondary" onClick={onClose}><L text={"Kaydetmeden çık"} /></button>
            </div>
          </div>
        </div>
      )}
    </div></Localized>
  );
}

export function SetOptimizer({ set, tracks, open, onOpenChange }: { set: MixSet; tracks: Track[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data, mutate, busy } = useWorkspace();
  const proposal = useMemo(() => optimizeOrder(tracks, data.transitions), [tracks, data.transitions]);
  const before = flowScore(tracks, data.transitions);
  const after = flowScore(proposal, data.transitions);
  const unchanged = proposal.every((track, i) => track.id === tracks[i]?.id);

  async function apply() {
    const ok = await mutate({ type: "set.reorder", setId: set.id, trackIds: proposal.map((t) => t.id) }, "Set akışı optimize edildi");
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="optimizer-dialog">
        <Localized>
          <DialogTitle><L text={"Akışı optimize et"} /></DialogTitle>
          <DialogDescription><L text={"İlk parçan sabit kalır. Sıralama kayıtlı geçişlerine, BPM farkına, Camelot uyumuna ve enerji akışına göre puanlanır. Son karar senin."} /></DialogDescription>
          <div className="optimizer-score">
            <span><small><L text={"ŞİMDİ"} /></small><strong>{before}</strong></span>
            <ArrowRight size={16} />
            <span className={after > before ? "better" : ""}><small><L text={"ÖNERİ"} /></small><strong>{after}</strong></span>
          </div>
          {unchanged ? <p className="muted-copy"><L text={"Mevcut sıra zaten en akıcı seçenek görünüyor."} /></p> : (
            <ol className="optimizer-list">
              {proposal.map((track, i) => {
                const prev = proposal[i - 1];
                const pair = prev ? scorePair(prev, track, data.transitions) : null;
                const moved = tracks[i]?.id !== track.id;
                return (
                  <li key={track.id} className={moved ? "moved" : ""}>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <div><strong>{track.title}</strong><small>{track.artist} · {track.bpm ?? "—"} BPM · {track.musicalKey || "—"}</small></div>
                    {prev && pair && <HarmonicBadge from={prev} to={track} />}
                  </li>
                );
              })}
            </ol>
          )}
          <div className="optimizer-actions">
            <button className="button secondary" onClick={() => onOpenChange(false)}><L text={"Vazgeç"} /></button>
            <button className="button primary" disabled={busy || unchanged} onClick={apply}><L text={"Bu sırayı uygula"} /></button>
          </div>
        </Localized>
      </DialogContent>
    </Dialog>
  );
}
