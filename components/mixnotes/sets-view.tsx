"use client";
import {SetReadiness} from "./set-readiness";
import {L,Localized} from "./localized";

import { useState } from "react";
import {
  CalendarDays,
  Check,
  CircleDashed,
  ClipboardCheck,
  Download,
  Edit3,
  GripVertical,
  LayoutTemplate,
  ListMusic,
  Plus,
  Search,
  MonitorPlay,
  Share2,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { HarmonicBadge, SetOptimizer, StageMode } from "./set-stage";
import { SetTemplateDialog } from "./set-template-dialog";
import { SetExportDialog } from "./set-export-dialog";
import { SetShareDialog } from "./set-share-dialog";
import { useQuickCommands } from "./pending-command";
import { Pane, SubTabs } from "./sub-tabs";
import { ReorderActions, TrackStrip } from "./track-strip";
import { useWorkspace } from "./workspace-context";
import { recommendNext } from "@/lib/dj-logic";
import { downloadText } from "@/lib/track-transfer";
import type { Track } from "@/lib/workspace-types";

function SetFlow({ tracks }: { tracks: Track[] }) {
  if (tracks.length < 2) return null;
  const bpms = tracks.map((track) => track.bpm).filter((bpm): bpm is number => bpm !== null);
  const min = bpms.length ? Math.min(...bpms) : 0;
  const max = bpms.length ? Math.max(...bpms) : 0;
  const range = Math.max(1, max - min);
  const coords = tracks.map((track, index) => ({
    id: track.id,
    x: (index / (tracks.length - 1)) * 100,
    y: track.bpm === null ? 70 : 75 - ((track.bpm - min) / range) * 50,
    energyY: track.energy === null ? null : 85 - ((track.energy - 1) / 4) * 70,
  }));
  const points = coords.map(({ x, y }) => `${x},${y}`).join(" ");
  const energyPoints = coords.filter((point) => point.energyY !== null).map(({ x, energyY }) => `${x},${energyY}`).join(" ");

  return (
    <Localized><div className="set-flow" aria-label={`BPM akışı ${min || "belirsiz"} ile ${max || "belirsiz"} arası`}>
      <div className="set-flow-head">
        <span><L text={"BPM AKIŞI"}/></span>
        <span className="flow-legend"><i className="is-bpm" />BPM<i className="is-energy" /><L text={"ENERJİ"}/></span>
        <strong>{bpms.length ? `${min}–${max}` : <L text={"BPM verisi ekle"}/>}</strong>
      </div>
      <svg viewBox="0 0 100 90" preserveAspectRatio="none" role="img">
        <path d="M0 75 H100" className="flow-grid" />
        <path d="M0 50 H100" className="flow-grid" />
        <path d="M0 25 H100" className="flow-grid" />
        {energyPoints && <polyline points={energyPoints} className="flow-energy" />}
        <polyline points={points} className="flow-line" />
        {coords.map(({ id, x, y }) => <circle key={id} cx={x} cy={y} r="2.2" className="flow-point" />)}
      </svg>
      <div className="flow-labels">{tracks.map((track, index) => <span key={track.id}>{String(index + 1).padStart(2, "0")}</span>)}</div>
    </div></Localized>
  );
}

export function SetsView() {
  const {
    data,
    selectedSetId,
    setSelectedSetId,
    setSelectedTrackId,
    openEditor,
    requestDelete,
    mutate,
    busy,
  } = useWorkspace();
  const [sourceSearch, setSourceSearch] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);
  const [optimizerOpen, setOptimizerOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const active = data.sets.find((set) => set.id === selectedSetId) ?? data.sets[0];
  useQuickCommands(["stage", "optimize", "template", "share", "export"], (command) => {
    if (command === "template") { setTemplateOpen(true); return; }
    if (!active?.tracks.length) return;
    if (command === "stage") setStageOpen(true);
    if (command === "optimize" && active.tracks.length > 2) setOptimizerOpen(true);
    if (command === "share") setShareOpen(true);
    if (command === "export") setExportOpen(true);
  });
  const trackById = new Map(data.tracks.map((track) => [track.id, track]));
  const orderedTracks = active?.tracks.map((item) => trackById.get(item.trackId)).filter(Boolean) as Track[] ?? [];
  const setTrackIds = new Set(active?.tracks.map((item) => item.trackId) ?? []);
  const sourceNeedle = sourceSearch.trim().toLocaleLowerCase("tr-TR");
  const available = data.tracks.filter((track) => !setTrackIds.has(track.id) && (!sourceNeedle || `${track.title} ${track.artist}`.toLocaleLowerCase("tr-TR").includes(sourceNeedle)));
  const preparedPairs = active ? active.tracks.slice(0, -1).filter((item, index) => {
    const next = active.tracks[index + 1];
    return data.transitions.some((transition) => transition.fromTrackId === item.trackId && transition.toTrackId === next.trackId);
  }).length : 0;
  const recommendations = orderedTracks.length ? recommendNext(orderedTracks[orderedTracks.length-1], available, data.transitions) : [];
  const duration = orderedTracks.reduce((sum, track) => sum + (track.durationSeconds ?? 0), 0);

  function exportSet() {
    if(!active)return;
    const text=[active.title,active.genre,active.notes,"",...orderedTracks.flatMap((track,index)=>{
      const next=orderedTracks[index+1], transition=next?data.transitions.find(t=>t.fromTrackId===track.id&&t.toTrackId===next.id):undefined;
      return [`${String(index+1).padStart(2,"0")}. ${track.artist} — ${track.title} | ${track.bpm??"—"} BPM | ${track.musicalKey||"—"}`,track.cueNotes&&`CUE: ${track.cueNotes}`,transition&&`→ ${transition.transitionType}: ${transition.mixOutPoint} / ${transition.mixInPoint} · ${transition.eqTechnique} · ${transition.notes}`].filter(Boolean);
    })].join("\n");
    downloadText("mixnotes-set-notes.txt",text,"text/plain;charset=utf-8");
  }
  async function reorder(fromId: string, targetIndex: number) {
    if (!active) return;
    const order = active.tracks.map((item) => item.trackId);
    const fromIndex = order.indexOf(fromId);
    if (fromIndex < 0 || fromIndex === targetIndex) return;
    order.splice(fromIndex, 1);
    order.splice(targetIndex, 0, fromId);
    await mutate({ type: "set.reorder", setId: active.id, trackIds: order }, "Set sırası güncellendi");
  }

  async function dropOnSurface(event: React.DragEvent) {
    event.preventDefault();
    setDragOver(false);
    if (!active) return;
    const trackId = event.dataTransfer.getData("application/x-mixnotes-track");
    if (trackId && !active.tracks.some((item) => item.trackId === trackId)) {
      await mutate({ type: "set.track.add", setId: active.id, trackId }, `${active.title} setine eklendi`);
    }
  }

  return (
    <Localized><div className="view collection-view sets-view">
      <header className="view-header">
        <div>
          <p className="overline">SET BUILDER</p>
          <h1><L text={"Akışı sırala, boşlukları gör"}/></h1>
          <p className="view-intro"><L text={"BPM ve enerji bilgisini rehber olarak kullan; yaratıcı karar her zaman sende."}/></p>
        </div>
        <div className="header-actions">
          <button className="button secondary" onClick={() => setTemplateOpen(true)}><LayoutTemplate size={16} /><L text={" Şablondan set"}/></button>
          <button className="button primary" onClick={() => openEditor({ kind: "set" })}><Plus size={16} /><L text={" Yeni set"}/></button>
        </div>
      </header>
      {templateOpen && <SetTemplateDialog open={templateOpen} onOpenChange={setTemplateOpen} />}

      <div className="builder-layout">
        <nav className="object-list" aria-label="Set listesi">
          <div className="object-list-label"><span><L text={"SETLERİN"}/></span><strong>{String(data.sets.length).padStart(2, "0")}</strong></div>
          {data.sets.map((set) => (
            <button key={set.id} className={active?.id === set.id ? "active" : ""} onClick={() => setSelectedSetId(set.id)}>
              <ListMusic size={16} /><span><strong>{set.title}</strong><small>{set.tracks.length}<L text={" parça · "}/>{set.status === "ready" ? <L text={"Hazır"}/> : <L text={"Taslak"}/>}</small></span>
            </button>
          ))}
          {!data.sets.length && <p><L text={"Bir set oluşturup Library’den performans sırasını kur."}/></p>}
        </nav>

        <section
          className={`builder-surface${dragOver ? " is-drop-target" : ""}`}
          onDragOver={(event) => { if (event.dataTransfer.types.includes("application/x-mixnotes-track")) { event.preventDefault(); setDragOver(true); } }}
          onDragLeave={() => setDragOver(false)}
          onDrop={dropOnSurface}
        >
          {active ? (
            <>
              <header className="builder-header set-builder-header">
                <div>
                  <p className="overline"><L text={"AÇIK SET"}/></p><h2>{active.title}</h2>
                  <p className="set-meta-line">{active.genre || <L text={"Tür belirtilmedi"}/>}{active.eventDate && <><i /> <CalendarDays size={13} />{new Date(`${active.eventDate}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}</>}</p>
                </div>
                <div className="header-actions">
                  {orderedTracks.length > 0 && <button className="button primary" onClick={() => setStageOpen(true)}><MonitorPlay size={15} /><L text={" Sahne modu"}/></button>}
                  {orderedTracks.length > 2 && <button className="button secondary" onClick={() => setOptimizerOpen(true)}><Wand2 size={15} /><L text={" Akışı optimize et"}/></button>}
                  <button className="button secondary" onClick={() => setShareOpen(true)}><Share2 size={15} /><L text={active.shareToken ? " Paylaşılıyor" : " Paylaş"}/></button>
                  <button className="button secondary" onClick={() => setExportOpen(true)}><Download size={15} /><L text={" Dışa aktar"}/></button>
                  <button className="button secondary" onClick={() => openEditor({ kind: "picker", target: "set", targetId: active.id })}><Plus size={15} /><L text={" Parça ekle"}/></button>
                  <button data-localize-attrs="aria-label" className="icon-control" onClick={() => openEditor({ kind: "set", item: active })} aria-label="Seti düzenle"><Edit3 size={16} /></button>
                  <button className="icon-control danger-ghost" onClick={() => requestDelete({ kind: "set", item: active })} aria-label="Seti sil"><Trash2 size={16} /></button>
                </div>
              </header>
              <div className="set-summary-bar">
                <span><small><L text={"PARÇA"}/></small><strong>{orderedTracks.length}</strong></span>
                <span><small><L text={"SÜRE"}/></small><strong>{duration ? `${Math.floor(duration / 60)} dk` : "—"}</strong></span>
                <span><small><L text={"GEÇİŞ"}/></small><strong>{preparedPairs}/{Math.max(0, orderedTracks.length - 1)}</strong></span>
                <span><small><L text={"DURUM"}/></small><strong>{active.status === "ready" ? <L text={"Hazır"}/> : active.status === "performed" ? <L text={"Çalındı"}/> : <L text={"Taslak"}/>}</strong></span>
              </div>
              {stageOpen && <StageMode set={active} tracks={orderedTracks} onClose={() => setStageOpen(false)} />}
              {shareOpen && <SetShareDialog set={active} open={shareOpen} onOpenChange={setShareOpen} />}
              {exportOpen && <SetExportDialog set={active} tracks={orderedTracks} open={exportOpen} onOpenChange={setExportOpen} onNotes={exportSet} />}
              {optimizerOpen && <SetOptimizer set={active} tracks={orderedTracks} open={optimizerOpen} onOpenChange={setOptimizerOpen} />}
              <SubTabs id="set-builder" tabs={[{ id: "flow", label: "Akış", icon: ListMusic, badge: orderedTracks.length }, { id: "ready", label: "Hazırlık", icon: ClipboardCheck }, { id: "suggest", label: "Öneriler", icon: Sparkles, badge: recommendations.length || "" }]}>
              <Pane id="flow">
              <SetFlow tracks={orderedTracks} />
              {active.notes && <div className="set-note-inline"><span><L text={"SET NOTU"}/></span><p>{active.notes}</p></div>}

              {orderedTracks.length ? (
                <div className="set-sequence">
                  {orderedTracks.map((track, index) => {
                    const next = orderedTracks[index + 1];
                    const transition = next ? data.transitions.find((item) => item.fromTrackId === track.id && item.toTrackId === next.id) : undefined;
                    return (
                      <Localized key={track.id}><div className="sequence-item">
                        <div
                          className="set-track-drag"
                          draggable
                          onDragStart={(event) => {
                            event.stopPropagation();
                            event.dataTransfer.setData("application/x-mixnotes-set-track", track.id);
                            event.dataTransfer.effectAllowed = "move";
                          }}
                          onDragOver={(event) => {
                            if (event.dataTransfer.types.includes("application/x-mixnotes-set-track")) event.preventDefault();
                          }}
                          onDrop={(event) => {
                            event.preventDefault(); event.stopPropagation();
                            const fromId = event.dataTransfer.getData("application/x-mixnotes-set-track");
                            if (fromId) void reorder(fromId, index);
                          }}
                        >
                          <GripVertical className="sequence-grip" size={15} aria-hidden="true" />
                          <TrackStrip
                            track={track}
                            index={index}
                            compact
                            onClick={() => setSelectedTrackId(track.id)}
                            actions={<ReorderActions
                              title={track.title}
                              first={index === 0}
                              last={index === orderedTracks.length - 1}
                              busy={busy}
                              onUp={() => reorder(track.id, index - 1)}
                              onDown={() => reorder(track.id, index + 1)}
                              onRemove={() => mutate({ type: "set.track.remove", setId: active.id, trackId: track.id }, "Setten çıkarıldı")}
                            />}
                          />
                        </div>
                        {next && (
                          <button
                            className={`transition-slot${transition ? " prepared" : ""}`}
                            onClick={() => openEditor({ kind: "transition", item: transition, fromTrackId: track.id, toTrackId: next.id })}
                          >
                            {transition ? <><Check size={14} /><span>{transition.transitionType || <L text={"Geçiş hazır"}/>}</span><small>{transition.practiceStatus === "ready" ? "PROVASI HAZIR" : "NOTU VAR"}</small></> : <><CircleDashed size={14} /><span><L text={"Geçişi hazırla"}/></span><small>{track.bpm && next.bpm ? `${next.bpm - track.bpm > 0 ? "+" : ""}${Math.round((next.bpm - track.bpm) * 10) / 10} BPM` : "NOT EKLE"}</small></>}
                            <HarmonicBadge from={track} to={next} />
                          </button>
                        )}
                      </div></Localized>
                    );
                  })}
                </div>
              ) : (
                <div className="guided-empty full-empty drop-empty">
                  <p><strong><L text={"Set sırası boş."}/></strong><L text={" Library kuyruğundan parçaları sürükle veya “Parça ekle”yi kullan."}/></p>
                </div>
              )}

              </Pane>
              <Pane id="ready"><SetReadiness setId={active.id}/></Pane>
              <Pane id="suggest">
              {orderedTracks.length>0 && <section className="recommendation-panel"><div className="section-title-row"><div><p className="overline">NEXT TRACK</p><h3>{orderedTracks[orderedTracks.length-1].title}<L text={" sonrasında"}/></h3></div><span><L text={"Library önerileri"}/></span></div><p className="muted-copy"><L text={"Kayıtlı geçişler, BPM, Camelot key ve enerji bilgilerine göre sıralanır. Dinleyerek kontrol et."}/></p>{recommendations.length ? <div className="recommendation-list">{recommendations.map(({track,reasons})=><div key={track.id}><div><strong>{track.title}</strong><p>{track.artist}</p><small>{reasons.join(" · ")}</small></div><button className="button secondary" disabled={busy} onClick={()=>mutate({type:"set.track.add",setId:active!.id,trackId:track.id},"Öneri sete eklendi")}><L text={"Sete ekle"}/></button></div>)}</div> : <p className="muted-copy"><L text={"Öneri için Library’ye çalınabilir parçalar ve BPM / key / enerji bilgisi ekle."}/></p>}</section>}
              {available.length > 0 && (
                <section className="source-tray">
                  <div className="source-tray-head">
                    <div><p className="overline"><L text={"LIBRARY KUYRUĞU"}/></p><h3><L text={"Sete sürükle"}/></h3></div>
                    <label className="mini-search"><Search size={14} /><input data-localize-attrs="placeholder" value={sourceSearch} onChange={(event) => setSourceSearch(event.target.value)} placeholder="Parça ara" /></label>
                  </div>
                  <div className="source-tray-list">
                    {available.slice(0, 8).map((track) => <TrackStrip key={track.id} track={track} compact draggable onClick={() => setSelectedTrackId(track.id)} />)}
                  </div>
                </section>
              )}
              </Pane>
              </SubTabs>
            </>
          ) : (
            <div className="guided-empty centerpiece-empty">
              <ListMusic size={28} />
              <h2><L text={"İlk performans akışını kur"}/></h2>
              <p><L text={"Set bir crate değildir; çalacağın parçaları bilinçli bir sıraya yerleştir."}/></p>
              <button className="button primary" onClick={() => openEditor({ kind: "set" })}><Plus size={16} /><L text={" İlk seti oluştur"}/></button>
              <button className="button secondary" onClick={() => setTemplateOpen(true)}><LayoutTemplate size={16} /><L text={" Şablondan başla"}/></button>
            </div>
          )}
        </section>
      </div>
    </div></Localized>
  );
}
