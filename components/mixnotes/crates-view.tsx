"use client";
import {L,Localized} from "./localized";

import { useState } from "react";
import { Archive, Edit3, GripVertical, Plus, Search, Trash2, X } from "lucide-react";
import { TrackStrip } from "./track-strip";
import { useWorkspace } from "./workspace-context";

export function CratesView() {
  const {
    data,
    selectedCrateId,
    setSelectedCrateId,
    setSelectedTrackId,
    openEditor,
    requestDelete,
    mutate,
    busy,
  } = useWorkspace();
  const [dragOver, setDragOver] = useState(false);
  const [sourceSearch, setSourceSearch] = useState("");
  const active = data.crates.find((crate) => crate.id === selectedCrateId) ?? data.crates[0];
  const trackById = new Map(data.tracks.map((track) => [track.id, track]));
  const crateTracks = active?.trackIds.map((id) => trackById.get(id)).filter(Boolean) ?? [];
  const crateTrackIds = new Set(active?.trackIds ?? []);
  const sourceNeedle = sourceSearch.trim().toLocaleLowerCase("tr-TR");
  const available = data.tracks.filter((track) => !crateTrackIds.has(track.id) && (!sourceNeedle || `${track.title} ${track.artist}`.toLocaleLowerCase("tr-TR").includes(sourceNeedle)));

  async function addDroppedTrack(event: React.DragEvent) {
    event.preventDefault();
    setDragOver(false);
    if (!active || active.rules) return;
    const trackId = event.dataTransfer.getData("application/x-mixnotes-track");
    if (trackId) await mutate({ type: "crate.track.add", crateId: active.id, trackId }, `${active.name} crate’ine eklendi`);
  }

  return (
    <Localized><div className="view collection-view">
      <header className="view-header">
        <div>
          <p className="overline">CRATES</p>
          <h1><L text={"Aday parçalarını topla"}/></h1>
          <p className="view-intro"><L text={"Crate bir set değildir; aynı amaç için düşündüğün malzemeyi burada biriktir."}/></p>
        </div>
        <button className="button primary" onClick={() => openEditor({ kind: "crate" })}><Plus size={16} /><L text={" Yeni crate"}/></button>
      </header>

      <div className="builder-layout">
        <nav className="object-list" aria-label="Crate listesi">
          <div className="object-list-label"><span><L text={"CRATE’LERİN"}/></span><strong>{String(data.crates.length).padStart(2, "0")}</strong></div>
          {data.crates.map((crate) => (
            <button key={crate.id} className={active?.id === crate.id ? "active" : ""} onClick={() => setSelectedCrateId(crate.id)}>
              <Archive size={16} /><span><strong>{crate.name}</strong><small>{crate.rules ? "SMART · " : ""}{crate.trackIds.length}<L text={" parça"}/></small></span>
            </button>
          ))}
          {!data.crates.length && <p><L text={"İlk crate’ini oluştur; örneğin “Warm-up” veya “Sonraki prova”."}/></p>}
        </nav>

        <section
          className={`builder-surface${dragOver ? " is-drop-target" : ""}`}
          onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={addDroppedTrack}
        >
          {active ? (
            <>
              <header className="builder-header">
                <div><p className="overline"><L text={"AÇIK CRATE"}/></p><h2>{active.name}</h2><p>{active.description || <L text={"Bu crate için açıklama eklenmedi."}/>}</p></div>
                <div className="header-actions">
                  {!active.rules && <button className="button secondary" onClick={() => openEditor({ kind: "picker", target: "crate", targetId: active.id })}><Plus size={15} /><L text={" Parça ekle"}/></button>}
                  <button data-localize-attrs="aria-label" className="icon-control" onClick={() => openEditor({ kind: "crate", item: active })} aria-label="Crate’i düzenle"><Edit3 size={16} /></button>
                  <button className="icon-control danger-ghost" onClick={() => requestDelete({ kind: "crate", item: active })} aria-label="Crate’i sil"><Trash2 size={16} /></button>
                </div>
              </header>
              {active.rules ? <div className="smart-rule-summary"><span className="status status-ready">SMART CRATE</span><p>{[active.rules.genre && `Tür: ${active.rules.genre}`,active.rules.tag && `Etiket: ${active.rules.tag}`,active.rules.bpmMin!==null && `BPM ≥ ${active.rules.bpmMin}`,active.rules.bpmMax!==null && `BPM ≤ ${active.rules.bpmMax}`,active.rules.energyMin!==null && `Enerji ≥ ${active.rules.energyMin}`,active.rules.ratingMin>0 && `Puan ≥ ${active.rules.ratingMin}`,active.rules.origin!=="all" && active.rules.origin].filter(Boolean).join(" · ") || <L text={"Tüm parçalar"}/>}</p><small><L text={"Parça bilgileri değiştikçe içerik otomatik güncellenir."}/></small></div> : <div className="drop-instruction"><GripVertical size={15} /><span><L text={"Library kuyruğundan bir parçayı buraya sürükleyebilirsin."}/></span></div>}
              {crateTracks.length ? (
                <div className="track-list builder-tracks">
                  {crateTracks.map((track, index) => track && (
                    <TrackStrip
                      key={track.id}
                      track={track}
                      index={index}
                      compact
                      onClick={() => setSelectedTrackId(track.id)}
                      actions={active.rules ? undefined : <button className="icon-control danger-ghost" disabled={busy} onClick={() => mutate({ type: "crate.track.remove", crateId: active.id, trackId: track.id }, "Crate’ten çıkarıldı")} aria-label={`${track.title} crate’ten çıkar`}><X size={15} /></button>}
                    />
                  ))}
                </div>
              ) : (
                <div className="guided-empty full-empty drop-empty">
                  <p><strong>{active.name}<L text={" boş."}/></strong> {active.rules ? <L text={"Kurallara uyan parça yok; kuralları düzenle veya Library’ye yeni parça ekle."}/> : <L text={"Library’den parçaları buraya sürükle veya “Parça ekle”yi kullan."}/>}</p>
                </div>
              )}

              {!active.rules && available.length > 0 && (
                <section className="source-tray">
                  <div className="source-tray-head">
                    <div><p className="overline"><L text={"LIBRARY KUYRUĞU"}/></p><h3><L text={"Sürükle ve ekle"}/></h3></div>
                    <label className="mini-search"><Search size={14} /><input data-localize-attrs="placeholder" value={sourceSearch} onChange={(event) => setSourceSearch(event.target.value)} placeholder="Parça ara" /></label>
                  </div>
                  <div className="source-tray-list">
                    {available.slice(0, 8).map((track) => (
                      <TrackStrip key={track.id} track={track} compact draggable onClick={() => setSelectedTrackId(track.id)} />
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : (
            <div className="guided-empty centerpiece-empty">
              <Archive size={28} />
              <h2><L text={"Malzemeni gruplamaya başla"}/></h2>
              <p><L text={"Afro House Finds, Warm-up veya Try Next Practice gibi bir crate oluştur."}/></p>
              <button className="button primary" onClick={() => openEditor({ kind: "crate" })}><Plus size={16} /><L text={" İlk crate’i oluştur"}/></button>
            </div>
          )}
        </section>
      </div>
    </div></Localized>
  );
}
