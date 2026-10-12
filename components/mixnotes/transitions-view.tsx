"use client";
import {L,Localized} from "./localized";

import { TransitionStudio } from "./transition-studio";
import { useState } from "react";
import { ArrowDown, Check, Edit3, Plus, Search, Trash2, Zap, Headphones } from "lucide-react";
import { useWorkspace } from "./workspace-context";

const statusLabels = {
  idea: "FİKİR",
  practice: "ÇALIŞILIYOR",
  ready: "HAZIR",
};

export function TransitionsView() {
  const { data, openEditor, requestDelete } = useWorkspace();
  const [auditionId,setAuditionId] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "idea" | "practice" | "ready">("all");
  const trackById = new Map(data.tracks.map((track) => [track.id, track]));
  const needle = query.trim().toLocaleLowerCase("tr-TR");
  const filtered = data.transitions.filter((transition) => {
    const from = trackById.get(transition.fromTrackId ?? "")?.title || transition.fromLabel;
    const to = trackById.get(transition.toTrackId ?? "")?.title || transition.toLabel;
    return (status === "all" || transition.practiceStatus === status) && (!needle || `${from} ${to} ${transition.notes} ${transition.transitionType}`.toLocaleLowerCase("tr-TR").includes(needle));
  });

  return (
    <Localized><div className="view transitions-view">
      <header className="view-header">
        <div>
          <p className="overline">TRANSITION MEMORY</p>
          <h1><L text={"İyi geçişleri unutma"}/></h1>
          <p className="view-intro"><L text={"İki parça arasındaki kişisel tekniğini kaydet; tekrar karşılaştığında bilgi hazır olsun."}/></p>
        </div>
        <button className="button primary" disabled={data.tracks.length < 2} onClick={() => openEditor({ kind: "transition" })}><Plus size={16} /><L text={" Geçiş kaydet"}/></button>
      </header>

      {data.tracks.length >= 2 && <TransitionStudio key={auditionId || "new"} transitionId={auditionId} />}

      <div className="transition-toolbar">
        <label className="search-field"><Search size={16} /><span className="sr-only"><L text={"Geçişlerde ara"}/></span><input data-localize-attrs="placeholder" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Parça veya geçiş notu ara" /></label>
        <div data-localize-attrs="aria-label" className="segmented" aria-label="Geçiş durumu filtresi">
          {(["all", "idea", "practice", "ready"] as const).map((value) => (
            <button key={value} className={status === value ? "active" : ""} onClick={() => setStatus(value)}>{value === "all" ? <L text={"Tümü"}/> : <L text={statusLabels[value]}/>}</button>
          ))}
        </div>
      </div>

      {filtered.length ? (
        <div className="transition-memory-list">
          {filtered.map((transition) => {
            const from = trackById.get(transition.fromTrackId ?? "");
            const to = trackById.get(transition.toTrackId ?? "");
            return (
              <Localized key={transition.id}><article className="memory-transition">
                <header>
                  <span className={`status status-${transition.practiceStatus}`}>{transition.practiceStatus === "ready" && <Check size={12} />}<L text={statusLabels[transition.practiceStatus]}/></span>
                  <div><button data-localize-attrs="aria-label" className="icon-control" onClick={() => openEditor({ kind: "transition", item: transition })} aria-label="Geçişi düzenle"><Edit3 size={15} /></button><button data-localize-attrs="aria-label" className="icon-control danger-ghost" onClick={() => requestDelete({ kind: "transition", item: transition })} aria-label="Geçişi sil"><Trash2 size={15} /></button></div>
                </header>
                <div className="transition-strips">
                  <div className="transition-track from-track"><span className="track-order">A</span><div><strong>{from?.title || transition.fromLabel || <L text={"Bağlanmamış parça"}/>}</strong><small>{from?.artist || "Eski not"}</small></div><span className="track-tempo">{from?.bpm ?? "—"}<small>BPM</small></span><span className="track-key">{from?.musicalKey || "—"}</span></div>
                  <div className="transition-bridge"><i /><span><ArrowDown size={14} />{transition.transitionType || <L text={"GEÇİŞ"}/>}</span><i /></div>
                  <div className="transition-track to-track"><span className="track-order">B</span><div><strong>{to?.title || transition.toLabel || <L text={"Bağlanmamış parça"}/>}</strong><small>{to?.artist || "Eski not"}</small></div><span className="track-tempo">{to?.bpm ?? "—"}<small>BPM</small></span><span className="track-key">{to?.musicalKey || "—"}</span></div>
                </div>
                <div className="transition-knowledge">
                  {(transition.mixOutPoint || transition.mixInPoint) && <div><span><L text={"ZAMAN"}/></span><p>{transition.mixOutPoint || "—"} → {transition.mixInPoint || "—"}</p></div>}
                  {transition.eqTechnique && <div><span>EQ</span><p>{transition.eqTechnique}</p></div>}
                  {transition.timingNotes && <div><span>TIMING</span><p>{transition.timingNotes}</p></div>}
                  {transition.notes && <div className="wide"><span><L text={"NOT"}/></span><p>{transition.notes}</p></div>}
                </div>
                <footer>
                  <button className="text-action" disabled={!from || !to} onClick={()=>{setAuditionId(transition.id);window.scrollTo({top:0,behavior:"smooth"});}}><Headphones size={14}/><L text={"Stüdyoda dinle"}/></button>
                  <span><Zap size={13} /><L text={" Zorluk "}/>{transition.difficulty || "—"}/5</span>
                  <span><L text={"Puan "}/>{transition.rating || "—"}/5</span>
                  {transition.lastPracticed && <span><L text={"Son prova "}/>{new Date(`${transition.lastPracticed}T12:00:00`).toLocaleDateString("tr-TR")}</span>}
                </footer>
              </article></Localized>
            );
          })}
        </div>
      ) : (
        <div className="guided-empty centerpiece-empty transition-empty">
          <div className="empty-transition-mark"><span>A</span><i /><span>B</span></div>
          <h2>{data.tracks.length < 2 ? <L text={"Önce iki parça ekle"}/> : <L text={"Geçiş hafızan burada büyüyecek"}/>}</h2>
          <p>{data.tracks.length < 2 ? <L text={"Bir geçiş ilişkisi kurmak için Library’de en az iki parça olmalı."}/> : <L text={"İki parçayı bağla; mix-in, mix-out, EQ ve prova notlarını sakla."}/>}</p>
          {data.tracks.length >= 2 && <button className="button primary" onClick={() => openEditor({ kind: "transition" })}><Plus size={16} /><L text={" İlk geçişi kaydet"}/></button>}
        </div>
      )}
    </div></Localized>
  );
}
