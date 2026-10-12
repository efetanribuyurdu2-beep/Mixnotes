"use client";
import { L } from "./localized";

import { useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { useWorkspace } from "./workspace-context";
import { compatibleKeys, harmonicMatch, parseCamelot } from "@/lib/set-flow";
import { beatTimings, tapTempo } from "@/lib/tap-tempo";

const keyNames: Record<string, string> = {
  "1A": "A♭m", "2A": "E♭m", "3A": "B♭m", "4A": "Fm", "5A": "Cm", "6A": "Gm", "7A": "Dm", "8A": "Am", "9A": "Em", "10A": "Bm", "11A": "F♯m", "12A": "D♭m",
  "1B": "B", "2B": "F♯", "3B": "D♭", "4B": "A♭", "5B": "E♭", "6B": "B♭", "7B": "F", "8B": "C", "9B": "G", "10B": "D", "11B": "A", "12B": "E",
};

export function TapTempo() {
  const { data } = useWorkspace();
  const [taps, setTaps] = useState<number[]>([]);
  const [pulse, setPulse] = useState(false);
  const pulseTimer = useRef<number | undefined>(undefined);
  const bpm = tapTempo(taps);
  const nearby = bpm ? data.tracks.filter((t) => t.bpm !== null && Math.abs(t.bpm - bpm) <= 3).sort((a, b) => Math.abs(a.bpm! - bpm) - Math.abs(b.bpm! - bpm)).slice(0, 5) : [];

  function tap() {
    const now = performance.now();
    setTaps((list) => (list.length && now - list[list.length - 1] > 2000 ? [now] : [...list, now].slice(-12)));
    setPulse(true);
    window.clearTimeout(pulseTimer.current);
    pulseTimer.current = window.setTimeout(() => setPulse(false), 90);
  }

  return (
    <section className="tool-card tap-tempo">
      <h3><L text="Tap BPM" /></h3>
      <p><L text="Ritme dokun; son vuruşların ortalaması BPM'i verir. 2 saniye beklersen yeniden başlar." /></p>
      <button
        className={`tap-pad${pulse ? " is-pulse" : ""}`}
        onPointerDown={(event) => { event.preventDefault(); tap(); }}
        onKeyDown={(event) => { if (event.key === " " || event.key === "Enter" || event.key.toLowerCase() === "t") { event.preventDefault(); if (!event.repeat) tap(); } }}
        aria-label="Ritme dokun"
      >
        <strong>{bpm ? bpm.toFixed(1) : "—"}</strong>
        <small>{taps.length < 2 ? <L text="DOKUN" /> : `${taps.length} TAP`}</small>
      </button>
      {bpm && (
        <>
          <div className="tap-meta">
            <span>½ <b>{(bpm / 2).toFixed(1)}</b></span>
            <span>×2 <b>{(bpm * 2).toFixed(1)}</b></span>
            <button className="text-action" onClick={() => setTaps([])}><RotateCcw size={13} /><L text="Sıfırla" /></button>
          </div>
          <div className="tap-delays" aria-label="Delay süreleri">
            {beatTimings(bpm).map(({ label, ms }) => <span key={label}><small>{label}</small><b>{ms}</b>ms</span>)}
          </div>
          {nearby.length > 0 && (
            <div className="tap-matches">
              <small><L text="BU TEMPODA LIBRARY" /></small>
              {nearby.map((t) => <p key={t.id}><strong>{t.title}</strong> · {t.artist} <em>{t.bpm} BPM</em></p>)}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function segmentPath(index: number, inner: number, outer: number) {
  const center = 150, start = ((index * 30 - 15 - 90) * Math.PI) / 180, end = ((index * 30 + 15 - 90) * Math.PI) / 180;
  const point = (r: number, a: number) => `${(center + r * Math.cos(a)).toFixed(2)} ${(center + r * Math.sin(a)).toFixed(2)}`;
  return `M ${point(outer, start)} A ${outer} ${outer} 0 0 1 ${point(outer, end)} L ${point(inner, end)} A ${inner} ${inner} 0 0 0 ${point(inner, start)} Z`;
}

export function CamelotWheel() {
  const { data, setSelectedTrackId, setView } = useWorkspace();
  const [selected, setSelected] = useState("8A");
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of data.tracks) { const key = parseCamelot(t.musicalKey); if (key) { const id = `${key.number}${key.letter}`; map.set(id, (map.get(id) ?? 0) + 1); } }
    return map;
  }, [data.tracks]);
  const max = Math.max(1, ...counts.values());
  const compatible = new Set(compatibleKeys(selected));
  const matches = data.tracks.filter((t) => compatible.has(`${parseCamelot(t.musicalKey)?.number}${parseCamelot(t.musicalKey)?.letter}`)).sort((a, b) => b.rating - a.rating).slice(0, 8);

  return (
    <section className="tool-card camelot-card">
      <h3><L text="Camelot çarkı" /></h3>
      <p><L text="Bir key seç; uyumlu key'ler ve Library'deki karşılıkları öne çıkar. Halka ne kadar doluysa o key'de o kadar parçan var." /></p>
      <div className="camelot-layout">
        <svg viewBox="0 0 300 300" className="camelot-wheel" role="group" aria-label="Camelot çarkı">
          {Array.from({ length: 12 }, (_, i) => i + 1).flatMap((n) => (["B", "A"] as const).map((letter) => {
            const id = `${n}${letter}`, count = counts.get(id) ?? 0;
            const [inner, outer] = letter === "B" ? [100, 145] : [56, 100];
            const angle = ((n % 12) * 30 - 90) * (Math.PI / 180), r = (inner + outer) / 2;
            const state = id === selected ? "is-selected" : compatible.has(id) ? "is-compatible" : "is-dim";
            return (
              <g key={id} className={`camelot-seg ${state}`} onClick={() => setSelected(id)} role="button" tabIndex={0} aria-label={`${id} ${keyNames[id]} · ${count}`} aria-pressed={id === selected}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelected(id); } }}>
                <path d={segmentPath(n % 12, inner + 1, outer - 1)} style={{ fill: `hsl(${(n - 1) * 30 + 20} ${letter === "B" ? 62 : 52}% ${letter === "B" ? 58 : 46}% / ${0.25 + 0.75 * (count / max)})` }} />
                <text x={150 + r * Math.cos(angle)} y={150 + r * Math.sin(angle)} dy="0.35em">{id}</text>
              </g>
            );
          }))}
          <text x="150" y="142" className="camelot-center">{selected}</text>
          <text x="150" y="164" className="camelot-center-sub">{keyNames[selected]}</text>
        </svg>
        <div className="camelot-side">
          <small><L text="UYUMLU KEY'LER" /></small>
          <div className="camelot-chips">
            {compatibleKeys(selected).map((key) => (
              <button key={key} className={`harmonic-badge is-${harmonicMatch(selected, key)}`} onClick={() => setSelected(key)}>{key} · {keyNames[key]}</button>
            ))}
          </div>
          <small><L text="LIBRARY'DE" /> · {matches.length}</small>
          {matches.length ? matches.map((t) => (
            <button key={t.id} className="camelot-track" onClick={() => { setSelectedTrackId(t.id); setView("library"); }}>
              <strong>{t.title}</strong><span>{t.artist} · {t.musicalKey} · {t.bpm ?? "—"} BPM</span>
            </button>
          )) : <p className="muted-copy"><L text="Bu key'lerde parça yok. Library'de key bilgisini Camelot formatında (ör. 8A) gir." /></p>}
        </div>
      </div>
    </section>
  );
}
