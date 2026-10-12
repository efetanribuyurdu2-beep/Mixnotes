"use client";
import { L, Localized } from "./localized";

import { useMemo, useRef, useState } from "react";
import { useQuickCommands } from "./pending-command";
import { Flame } from "lucide-react";
import { useWorkspace } from "./workspace-context";
import { activityGrid, activityLevel, bpmHistogram, minutesSince, mostPlayed, practiceStreak, topKeys } from "@/lib/stats";
import { translateUi } from "@/lib/ui-translations";

const weekdayLabels = ["Pzt", "", "Çar", "", "Cum", "", ""];

function Readout({ text, fallback }: { text: string; fallback: string }) {
  return <p className="stats-readout" aria-live="polite">{text || <L text={fallback} />}</p>;
}

export function StatsPanel() {
  const { data, setView, setSelectedTrackId } = useWorkspace();
  const language = data.profile.language ?? "tr";
  const sessions = useMemo(() => data.sessions ?? [], [data.sessions]);
  const library = useMemo(() => data.tracks.filter((t) => t.origin === "library"), [data.tracks]);
  const grid = useMemo(() => activityGrid(sessions), [sessions]);
  const histogram = useMemo(() => bpmHistogram(library), [library]);
  const keys = useMemo(() => topKeys(library), [library]);
  const played = useMemo(() => mostPlayed(data.tracks, data.sets, sessions), [data.tracks, data.sets, sessions]);
  const streak = practiceStreak(sessions);
  const recent = minutesSince(sessions, 30);
  const performances = sessions.filter((s) => s.kind === "performance").length;
  const readyTransitions = data.transitions.filter((t) => t.practiceStatus === "ready").length;
  const [activityText, setActivityText] = useState("");
  const panel = useRef<HTMLElement>(null);
  useQuickCommands(["stats"], () => panel.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  const [bpmText, setBpmText] = useState("");
  const histogramMax = Math.max(1, ...histogram.map((b) => b.count));
  const keyMax = Math.max(1, ...keys.map((k) => k.count));
  const playMax = Math.max(1, ...played.map((p) => p.plays));
  const tracksWord = translateUi("parça", language);

  return (
    <Localized><section ref={panel} className="home-section stats-panel">
      <div className="section-title-row">
        <div><p className="overline"><L text="İSTATİSTİKLER" /></p><h2><L text="Hazırlık nabzın" /></h2></div>
      </div>

      <div className="stats-tiles">
        <div className="stats-tile is-hero"><small><L text="PROVA SERİSİ" /></small><strong>{streak}<em> <L text="gün" /></em></strong>{streak > 0 && <Flame size={16} aria-hidden="true" />}</div>
        <div className="stats-tile"><small><L text="SON 30 GÜN" /></small><strong>{recent}<em> dk</em></strong></div>
        <div className="stats-tile"><small><L text="PERFORMANS" /></small><strong>{performances}</strong></div>
        <div className="stats-tile"><small><L text="HAZIR GEÇİŞ" /></small><strong>{readyTransitions}<em>/{data.transitions.length}</em></strong></div>
      </div>

      <div className="stats-grid">
        <figure className="stats-card">
          <figcaption><L text="Son 12 hafta" /></figcaption>
          <div className="activity-grid" role="grid" aria-label="Prova takvimi" onMouseLeave={() => setActivityText("")}>
            <div className="activity-days" aria-hidden="true">{weekdayLabels.map((d, i) => <span key={i}>{d && <L text={d} />}</span>)}</div>
            {grid.map((week) => (
              <div key={week[0].date} className="activity-week" role="row">
                {week.map((cell) => {
                  const label = `${new Date(`${cell.date}T12:00:00`).toLocaleDateString(language === "en" ? "en-GB" : "tr-TR", { day: "numeric", month: "short" })} · ${cell.minutes} dk`;
                  return <span key={cell.date} role="gridcell" tabIndex={cell.future ? -1 : 0} aria-label={label} className={`activity-cell level-${activityLevel(cell.minutes)}${cell.future ? " is-future" : ""}`}
                    onMouseEnter={() => !cell.future && setActivityText(label)} onFocus={() => !cell.future && setActivityText(label)} onClick={() => !cell.future && setActivityText(label)} />;
                })}
              </div>
            ))}
          </div>
          <div className="activity-legend" aria-hidden="true"><L text="Az" />{[0, 1, 2, 3, 4].map((l) => <span key={l} className={`activity-cell level-${l}`} />)}<L text="Çok" /></div>
          <Readout text={activityText} fallback="Bir güne dokun; o günkü prova süresini gör." />
        </figure>

        <figure className="stats-card">
          <figcaption><L text="Library BPM dağılımı" /></figcaption>
          {histogram.length ? (
            <>
              <div className="bpm-bars" onMouseLeave={() => setBpmText("")}>
                {histogram.map((b) => {
                  const label = `${b.from}–${b.to - 1} BPM · ${b.count} ${tracksWord}`;
                  return (
                    <button key={b.from} className="bpm-bar" aria-label={label} onMouseEnter={() => setBpmText(label)} onFocus={() => setBpmText(label)} onClick={() => setBpmText(label)}>
                      <span style={{ height: `${b.count ? Math.max(6, (b.count / histogramMax) * 100) : 0}%` }} />
                    </button>
                  );
                })}
              </div>
              <div className="bpm-axis" aria-hidden="true"><span>{histogram[0].from}</span><span>{histogram[histogram.length - 1].to - 1}</span></div>
              <Readout text={bpmText} fallback="Bir sütuna dokun; o tempo aralığındaki parça sayısını gör." />
            </>
          ) : <p className="muted-copy"><L text="BPM bilgisi olan Library parçası yok." /></p>}
        </figure>

        <figure className="stats-card">
          <figcaption><L text="En çok kullandığın key'ler" /></figcaption>
          {keys.length ? (
            <ol className="rank-bars">
              {keys.map((k) => (
                <li key={k.key}><span className="rank-label">{k.key}</span><span className="rank-track"><i style={{ width: `${(k.count / keyMax) * 100}%` }} /></span><span className="rank-value">{k.count}</span></li>
              ))}
            </ol>
          ) : <p className="muted-copy"><L text="Key'leri Camelot formatında (ör. 8A) gir ya da ses dosyasından analiz et." /></p>}
          {keys.length > 0 && <button className="text-action" onClick={() => setView("tools")}><L text="Camelot çarkında gör" /></button>}
        </figure>

        <figure className="stats-card">
          <figcaption><L text="En çok çaldığın parçalar" /></figcaption>
          {played.length ? (
            <ol className="rank-bars is-tracks">
              {played.map(({ track, plays }) => (
                <li key={track.id}>
                  <button className="rank-label" onClick={() => { setSelectedTrackId(track.id); setView("library"); }}><strong>{track.title}</strong><small>{track.artist}</small></button>
                  <span className="rank-track"><i style={{ width: `${(plays / playMax) * 100}%` }} /></span>
                  <span className="rank-value">{plays}×</span>
                </li>
              ))}
            </ol>
          ) : <p className="muted-copy"><L text="Sahne modundan performans kaydettiğinde en çok çaldığın parçalar burada görünür." /></p>}
        </figure>
      </div>
    </section></Localized>
  );
}
