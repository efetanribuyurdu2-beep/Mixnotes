"use client";
import {SourcePlayerButton} from './provider-player';
import {L,Localized} from "./localized";

import { ArrowDown, ArrowUp, ExternalLink, GripVertical, MoreHorizontal, X } from "lucide-react";
import type { ReactNode } from "react";
import type { Track } from "@/lib/workspace-types";

type TrackStripProps = {
  track: Track;
  index?: number;
  selected?: boolean;
  draggable?: boolean;
  onClick?: () => void;
  onDragStart?: (trackId: string) => void;
  actions?: ReactNode;
  compact?: boolean;
};

export function TrackStrip({
  track,
  index,
  selected,
  draggable,
  onClick,
  onDragStart,
  actions,
  compact,
}: TrackStripProps) {
  const source = track.sources[0];
  return (
    <Localized><div
      className={`track-strip${selected ? " is-selected" : ""}${compact ? " is-compact" : ""}`}
      draggable={draggable}
      onDragStart={(event) => {
        event.dataTransfer.setData("application/x-mixnotes-track", track.id);
        event.dataTransfer.effectAllowed = "copyMove";
        onDragStart?.(track.id);
      }}
      data-track-id={track.id}
    >
      {draggable
        ? <GripVertical className="drag-handle" size={16} aria-hidden="true" />
        : index !== undefined && <span className="strip-index">{String(index + 1).padStart(2, "0")}</span>}
      <button type="button" className="strip-main" onClick={onClick} aria-pressed={selected}>
        {track.linkMetadata?.artworkUrl ? <img className="strip-artwork" src={track.linkMetadata.artworkUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={e=>{ e.currentTarget.style.display="none"; }} /> : <span className="mini-wave" aria-hidden="true"><i /><i /><i /><i /><i /></span>}
        <span className="strip-title">
          <strong>{track.title}</strong>
          <small>{track.artist || <L text={"Sanatçı eklenmedi"}/>}{track.version ? ` · ${track.version}` : ""}</small>
        </span>
      </button>
      <span className="strip-origin" data-origin={track.origin}>
        {track.origin === "library" ? "LIB" : "DISC"}
      </span>
      <span className="strip-number">{track.bpm ? <><strong>{track.bpm}</strong><small>BPM</small></> : <small>— BPM</small>}</span>
      <span className="strip-key">{track.musicalKey || "—"}</span>
      <span className="energy-meter" aria-label={track.energy ? `Enerji ${track.energy}/5` : "Enerji belirtilmedi"}>
        {[1, 2, 3, 4, 5].map((level) => <i key={level} className={track.energy && level <= track.energy ? "on" : ""} />)}
      </span>
      <span className="strip-genre">{track.genre || track.subgenre || <L text={"Tür yok"}/>}</span>
      {source?.externalUrl && (
        <SourcePlayerButton url={source.externalUrl} label={source.provider} className="strip-source"/>
      )}
      {actions && <div className="strip-actions">{actions}</div>}
    </div></Localized>
  );
}

export function ReorderActions({
  title,
  first,
  last,
  busy,
  onUp,
  onDown,
  onRemove,
}: {
  title: string;
  first: boolean;
  last: boolean;
  busy: boolean;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  return (
    <Localized><>
      <button className="icon-control" disabled={busy || first} onClick={onUp} aria-label={`${title} yukarı taşı`}>
        <ArrowUp size={15} />
      </button>
      <button className="icon-control" disabled={busy || last} onClick={onDown} aria-label={`${title} aşağı taşı`}>
        <ArrowDown size={15} />
      </button>
      <button className="icon-control danger-ghost" disabled={busy} onClick={onRemove} aria-label={`${title} setten çıkar`}>
        <X size={15} />
      </button>
    </></Localized>
  );
}

export function MoreButton({ label = "Diğer işlemler", onClick }: { label?: string; onClick: () => void }) {
  return (
    <Localized><button className="icon-control" onClick={onClick} aria-label={label}>
      <MoreHorizontal size={18} />
    </button></Localized>
  );
}
