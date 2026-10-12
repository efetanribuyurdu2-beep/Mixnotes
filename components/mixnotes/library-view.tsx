"use client";
import {SpotifyMetadataRefresh} from "./spotify-metadata-refresh";
import {ProviderPlayer} from './provider-player';
import {L,Localized} from "./localized";
import { AudioAttachment } from "./audio-attachment";
import { TrackLinkPreview } from "./track-link-preview";
import { TrackSources } from "./track-sources";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ExternalLink,
  Filter,
  FolderPlus,
  ListPlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { TrackStrip } from "./track-strip";
import { useWorkspace } from "./workspace-context";

export function LibraryView() {
  const {
    data,
    selectedTrackId,
    setSelectedTrackId,
    openEditor,
    requestDelete,
    mutate,
    busy,
  } = useWorkspace();
  const [query, setQuery] = useState("");
  const [origin, setOrigin] = useState<"all" | "discovery" | "library">("all");
  const [genre, setGenre] = useState("all");
  const [bpmMin, setBpmMin] = useState("");
  const [bpmMax, setBpmMax] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const genres = useMemo(
    () => Array.from(new Set(data.tracks.map((track) => track.genre).filter(Boolean))).sort(),
    [data.tracks],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");
    const min = Number(bpmMin) || 0;
    const max = Number(bpmMax) || Infinity;
    return data.tracks.filter((track) => {
      const haystack = [track.title, track.artist, track.version, track.genre, track.subgenre, ...track.tags]
        .join(" ")
        .toLocaleLowerCase("tr-TR");
      return (
        (!needle || haystack.includes(needle)) &&
        (origin === "all" || track.origin === origin) &&
        (genre === "all" || track.genre === genre) &&
        (track.bpm === null || (track.bpm >= min && track.bpm <= max))
      );
    });
  }, [data.tracks, query, origin, genre, bpmMin, bpmMax]);

  const selected = data.tracks.find((track) => track.id === selectedTrackId) ?? filtered[0] ?? data.tracks[0];
  const activeFilterCount = Number(origin !== "all") + Number(genre !== "all") + Number(Boolean(bpmMin)) + Number(Boolean(bpmMax));

  return (
    <Localized><div className="view library-view">
      <header className="view-header">
        <div>
          <p className="overline">TRACK LIBRARY</p>
          <h1><L text={"Parçaların ve keşiflerin"}/></h1>
          <p className="view-intro"><L text={"DJ açısından önemli bilgiyi hızlı tara; ayrıntıyı seçtiğinde aç."}/></p>
        </div>
        <div className="header-actions">
          <button className="button secondary" onClick={() => openEditor({ kind: "track", origin: "discovery" })}>
            <Plus size={16} /><L text={" Keşif kaydet "}/></button>
          <button className="button primary" onClick={() => openEditor({ kind: "track", origin: "library" })}>
            <Plus size={16} /><L text={" Library’ye ekle "}/></button>
        </div>
      </header>

      <SpotifyMetadataRefresh/>
      <div className="library-layout">
        <section className="library-main">
          <div className="library-toolbar">
            <label className="search-field">
              <Search size={17} aria-hidden="true" />
              <span className="sr-only"><L text={"Parçalarda ara"}/></span>
              <input data-localize-attrs="placeholder" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Parça, sanatçı, tür veya etiket ara" />
              {query && <button data-localize-attrs="aria-label" onClick={() => setQuery("")} aria-label="Aramayı temizle"><X size={15} /></button>}
            </label>
            <button className={`button filter-button${filtersOpen ? " active" : ""}`} onClick={() => setFiltersOpen((value) => !value)}>
              <Filter size={15} /><L text={" Filtreler "}/>{activeFilterCount > 0 && <span>{activeFilterCount}</span>}
            </button>
          </div>

          {filtersOpen && (
            <div className="filter-bar">
              <label><L text={"Durum "}/><select value={origin} onChange={(event) => setOrigin(event.target.value as typeof origin)}>
                  <option value="all"><L text={"Tümü"}/></option><option value="discovery"><L text={"Keşif"}/></option><option value="library">Library</option>
                </select>
              </label>
              <label><L text={"Tür "}/><select value={genre} onChange={(event) => setGenre(event.target.value)}>
                  <option value="all"><L text={"Tüm türler"}/></option>{genres.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label>BPM min<input inputMode="numeric" value={bpmMin} onChange={(event) => setBpmMin(event.target.value)} placeholder="90" /></label>
              <label>BPM max<input inputMode="numeric" value={bpmMax} onChange={(event) => setBpmMax(event.target.value)} placeholder="130" /></label>
              <button className="text-action" onClick={() => { setOrigin("all"); setGenre("all"); setBpmMin(""); setBpmMax(""); }}><L text={"Temizle"}/></button>
            </div>
          )}

          <div className="list-summary"><span>{filtered.length}<L text={" parça"}/></span><span><L text={"Satıra tıkla → ayrıntıları aç"}/></span></div>
          {filtered.length ? (
            <>
              <div className="track-columns" aria-hidden="true"><span><L text={"PARÇA"}/></span><span><L text={"DURUM"}/></span><span><L text={"TEMPO"}/></span><span>KEY</span><span><L text={"ENERJİ"}/></span><span><L text={"TÜR"}/></span><span><L text={"KAYNAK"}/></span></div>
              <div className="track-list">
                {filtered.map((track, index) => (
                  <TrackStrip
                    key={track.id}
                    track={track}
                    index={index}
                    selected={selected?.id === track.id}
                    draggable
                    onClick={() => setSelectedTrackId(track.id)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="guided-empty full-empty">
              <p><strong><L text={"Eşleşen parça yok."}/></strong><L text={" Aramayı veya filtreleri temizleyip tekrar dene."}/></p>
              <button className="button secondary" onClick={() => { setQuery(""); setOrigin("all"); setGenre("all"); setBpmMin(""); setBpmMax(""); }}><L text={"Filtreleri temizle"}/></button>
            </div>
          )}
        </section>

        <aside data-localize-attrs="aria-label" className="context-panel" aria-label="Seçili parça ayrıntıları">
          {selected ? (
            <>
              <div className="context-topline"><span><L text={"SEÇİLİ PARÇA"}/></span><span>{selected.origin === "library" ? "LIBRARY" : "DISCOVERY"}</span></div>
              {selected.linkMetadata?<TrackLinkPreview metadata={selected.linkMetadata} player />:selected.sources[0]?.externalUrl&&<ProviderPlayer url={selected.sources[0].externalUrl} title={selected.title}/>}
              <h2>{selected.title}</h2>
              <p className="context-artist">{selected.artist || <L text={"Sanatçı eklenmedi"}/>}</p>
              <dl className="track-facts">
                <div><dt>BPM</dt><dd>{selected.bpm ?? "—"}</dd></div>
                <div><dt>KEY</dt><dd>{selected.musicalKey || "—"}</dd></div>
                <div><dt><L text={"ENERJİ"}/></dt><dd>{selected.energy ? `${selected.energy}/5` : "—"}</dd></div>
                <div><dt>RATING</dt><dd>{selected.rating ? `${selected.rating}/5` : "—"}</dd></div>
              </dl>
              {(selected.cueNotes || selected.notes || selected.introNotes || selected.outroNotes) ? (
                <div className="note-stack">
                  {selected.cueNotes && <div><span>CUE</span><p>{selected.cueNotes}</p></div>}
                  {selected.introNotes && <div><span>INTRO</span><p>{selected.introNotes}</p></div>}
                  {selected.outroNotes && <div><span>OUTRO</span><p>{selected.outroNotes}</p></div>}
                  {selected.notes && <div><span><L text={"NOT"}/></span><p>{selected.notes}</p></div>}
                </div>
              ) : <p className="muted-copy"><L text={"Bu parça için henüz DJ notu yok."}/></p>}
              {selected.tags.length > 0 && <div className="tag-list">{selected.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}
              <div className="context-actions">
                <button className="button primary" onClick={() => openEditor({ kind: "track", item: selected })}><Pencil size={15} /><L text={" Düzenle"}/></button>
                {selected.origin === "discovery" && (
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => mutate({
                      type: "track.update",
                      id: selected.id,
                      expectedRevision: selected.revision,
                      input: {
                        title: selected.title, artist: selected.artist, version: selected.version, bpm: selected.bpm,
                        musicalKey: selected.musicalKey, genre: selected.genre, subgenre: selected.subgenre,
                        energy: selected.energy, rating: selected.rating, tags: selected.tags, origin: "library",
                        notes: selected.notes, cueNotes: selected.cueNotes, introNotes: selected.introNotes,
                        linkMetadata: selected.linkMetadata, outroNotes: selected.outroNotes, durationSeconds: selected.durationSeconds, label: selected.label,
                        sourceProvider: selected.sources[0]?.provider ?? "", sourceUrl: selected.sources[0]?.externalUrl ?? "",
                      },
                    }, "Library’ye taşındı")}
                  ><Check size={15} /><L text={" Library parçası yap"}/></button>
                )}
              </div>
              {(data.crates.length > 0 || data.sets.length > 0) && (
                <div className="quick-adds">
                  <span><L text={"HIZLI EKLE"}/></span>
                  {data.crates.slice(0, 3).map((crate) => (
                    <button key={crate.id} disabled={busy || Boolean(crate.rules) || crate.trackIds.includes(selected.id)} onClick={() => mutate({ type: "crate.track.add", crateId: crate.id, trackId: selected.id }, `${crate.name} crate’ine eklendi`)}>
                      <FolderPlus size={14} /> {crate.name}
                    </button>
                  ))}
                  {data.sets.slice(0, 3).map((set) => (
                    <button key={set.id} disabled={busy || set.tracks.some((item) => item.trackId === selected.id)} onClick={() => mutate({ type: "set.track.add", setId: set.id, trackId: selected.id }, `${set.title} setine eklendi`)}>
                      <ListPlus size={14} /> {set.title}
                    </button>
                  ))}
                </div>
              )}
              <AudioAttachment key={selected.id} owner={data.profile.storageKey || ""} trackId={selected.id} />
              <TrackSources track={selected} />
              <div className="context-footer">
                {selected.sources[0]?.externalUrl && <a href={selected.sources[0].externalUrl} target="_top" rel="noreferrer"><L text={"Kaynakta aç "}/><ExternalLink size={13} /></a>}
                <button onClick={() => requestDelete({ kind: "track", item: selected })}><Trash2 size={14} /><L text={" Sil"}/></button>
              </div>
            </>
          ) : (
            <div className="context-empty"><ArrowRight size={20} /><p><L text={"Ayrıntıları görmek için bir parça seç."}/></p></div>
          )}
        </aside>
      </div>
    </div></Localized>
  );
}
