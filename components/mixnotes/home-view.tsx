"use client";
import {L,Localized} from "./localized";
import { StatsPanel } from "./stats-panel";
import { InstallAppCard } from "./install-app";
import { Pane, SubTabs } from "./sub-tabs";
import { BarChart3, LayoutDashboard } from "lucide-react";

import { ArrowRight, Boxes, ListMusic, Plus, Repeat2, Search, Sparkles } from "lucide-react";
import { TrackStrip } from "./track-strip";
import { useWorkspace } from "./workspace-context";

export function HomeView() {
  const {
    data,
    setView,
    setSelectedTrackId,
    setSelectedSetId,
    openEditor,
  } = useWorkspace();
  const activeSet = data.sets.find((set) => set.status !== "performed") ?? data.sets[0];
  const practiceTransitions = data.transitions.filter((transition) => transition.practiceStatus !== "ready").slice(0, 3);
  const trackById = new Map(data.tracks.map((track) => [track.id, track]));

  function goToTrack(id: string) {
    setSelectedTrackId(id);
    setView("library");
  }

  return (
    <Localized><div className="view home-view">
      <header className="view-header home-heading">
        <div>
          <p className="overline"><L text={"HAZIRLIK MASASI"}/></p>
          <h1><L text={"Pisti sen yönet."}/></h1>
          <p className="view-intro"><L text={"Keşiften sahneye her kararın burada. Parçanı bul, akışını kur, geçişini prova et."}/></p>
        </div>
        <div className="header-actions">
          <button className="button secondary" onClick={() => openEditor({ kind: "track", origin: "discovery" })}>
            <Plus size={16} /><L text={" Fikir kaydet "}/></button>
          <button className="button primary" onClick={() => openEditor({ kind: "track", origin: "library" })}>
            <Plus size={16} /><L text={" Parça ekle "}/></button>
        </div>
      </header>

      <section data-localize-attrs="aria-label" className="workflow-line" aria-label="MixNotes hazırlık akışı">
        <button onClick={() => setView("discover")}><Search size={16} /><span><L text={"KEŞFET"}/></span><strong>{data.tracks.filter((t) => t.origin === "discovery").length}</strong></button>
        <i aria-hidden="true" />
        <button onClick={() => setView("crates")}><Boxes size={16} /><span><L text={"ORGANİZE ET"}/></span><strong>{data.crates.length}</strong></button>
        <i aria-hidden="true" />
        <button onClick={() => setView("sets")}><ListMusic size={16} /><span><L text={"SETİ HAZIRLA"}/></span><strong>{data.sets.length}</strong></button>
        <i aria-hidden="true" />
        <button onClick={() => setView("transitions")}><Repeat2 size={16} /><span><L text={"GEÇİŞİ ÇALIŞ"}/></span><strong>{data.transitions.length}</strong></button>
      </section>

      <InstallAppCard />
      <SubTabs id="home" tabs={[{ id: "overview", label: "Genel", icon: LayoutDashboard }, { id: "stats", label: "İstatistikler", icon: BarChart3 }]}>
      <Pane id="overview">
      <div className="home-grid">
        <section className="home-section continue-section">
          <div className="section-title-row">
            <div><p className="overline"><L text={"DEVAM ET"}/></p><h2>{activeSet ? activeSet.title : <L text={"İlk setini hazırla"}/>}</h2></div>
            {activeSet && <span className={`status status-${activeSet.status}`}>{activeSet.status === "ready" ? <L text={"HAZIR"}/> : "TASLAK"}</span>}
          </div>
          {activeSet ? (
            <>
              <div className="set-progress-summary">
                <span><strong>{activeSet.tracks.length}</strong><L text={" parça"}/></span>
                <span><strong>{activeSet.genre || "Serbest"}</strong><L text={" akış"}/></span>
                <span><strong>{activeSet.tracks.slice(0, -1).filter((item, index) => {
                  const next = activeSet.tracks[index + 1];
                  return data.transitions.some((transition) => transition.fromTrackId === item.trackId && transition.toTrackId === next?.trackId);
                }).length}/{Math.max(0, activeSet.tracks.length - 1)}</strong><L text={" hazırlanmış geçiş"}/></span>
              </div>
              <button className="text-action" onClick={() => { setSelectedSetId(activeSet.id); setView("sets"); }}><L text={" Set Builder’ı aç "}/><ArrowRight size={16} />
              </button>
            </>
          ) : (
            <div className="guided-empty">
              <p><L text={"Bir set oluştur; Library’den parçaları sırala ve aralarındaki geçişleri kaydet."}/></p>
              <button className="button primary" onClick={() => openEditor({ kind: "set" })}><Plus size={16} /><L text={" Set oluştur"}/></button>
            </div>
          )}
        </section>

        <section className="home-section memory-section">
          <div className="section-title-row">
            <div><p className="overline">DJ MEMORY</p><h2><L text={"Sıradaki çalışma"}/></h2></div>
            <Sparkles size={18} aria-hidden="true" />
          </div>
          {practiceTransitions.length ? (
            <div className="practice-list">
              {practiceTransitions.map((transition) => (
                <button key={transition.id} onClick={() => setView("transitions")}>
                  <span>{trackById.get(transition.fromTrackId ?? "")?.title || transition.fromLabel || <L text={"İlk parça"}/>}</span>
                  <ArrowRight size={14} />
                  <span>{trackById.get(transition.toTrackId ?? "")?.title || transition.toLabel || <L text={"İkinci parça"}/>}</span>
                  <small>{transition.practiceStatus === "practice" ? <L text={"ÇALIŞILIYOR"}/> : <L text={"FİKİR"}/>}</small>
                </button>
              ))}
            </div>
          ) : (
            <div className="guided-empty compact-empty">
              <p><L text={"İki parçayı bağladığında MixNotes burada neyi çalışacağını hatırlatacak."}/></p>
              <button className="text-action" onClick={() => openEditor({ kind: "transition" })}><L text={"İlk geçişi kaydet "}/><ArrowRight size={15} /></button>
            </div>
          )}
        </section>
      </div>

      <section className="studio-overview"><div><p className="overline">THE DJ WORKSPACE</p><h2><L text={"Keşiften sahneye."}/></h2><p><L text={"Parçalarını bul, akışını kur, prova et. Her karar bir sonraki setine kalsın."}/></p><div className="header-actions"><button className="button primary" onClick={()=>setView("discover")}><L text={"Discover’ı aç "}/><ArrowRight size={16}/></button><button className="button secondary" onClick={()=>setView("practice")}><L text={"Prova kaydet"}/></button></div></div><div className="studio-numbers"><span><strong>{data.tracks.length}</strong><L text={"PARÇA"}/></span><span><strong>{(data.sessions??[]).reduce((n,s)=>n+s.durationMinutes,0)}</strong><L text={"PROVA / SAHNE DK"}/></span></div></section>
      <section className="home-section recent-section">
        <div className="section-title-row">
          <div><p className="overline"><L text={"SON EKLENENLER"}/></p><h2><L text={"Hazırlık kuyruğun"}/></h2></div>
          <button className="text-action" onClick={() => setView("library")}><L text={"Tüm Library "}/><ArrowRight size={15} /></button>
        </div>
        {data.tracks.length ? (
          <div className="track-list home-tracks">
            {data.tracks.slice(0, 5).map((track, index) => (
              <TrackStrip key={track.id} track={track} index={index} compact onClick={() => goToTrack(track.id)} />
            ))}
          </div>
        ) : (
          <div className="guided-empty full-empty">
            <p><strong><L text={"Hazırlık kuyruğun boş."}/></strong><L text={" Bir bağlantı veya parça fikri kaydet; daha sonra düzenleyebilirsin."}/></p>
            <button className="button primary" onClick={() => openEditor({ kind: "track", origin: "discovery" })}><Plus size={16} /><L text={" İlk parçayı kaydet"}/></button>
          </div>
        )}
      </section>
      </Pane>
      <Pane id="stats"><StatsPanel /></Pane>
      </SubTabs>
    </div></Localized>
  );
}
