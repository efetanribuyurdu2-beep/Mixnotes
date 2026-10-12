"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ListMusic, Music2, Repeat2, Sparkles, type LucideIcon } from "lucide-react";
import { L } from "./localized";
import { useWorkspace, type EditorState } from "./workspace-context";

type Pad = { label: string; icon: LucideIcon; hue: number; editor: NonNullable<EditorState> };

/**
 * Hot cue pad'leri: sık yapılan dört işe tek dokunuş.
 * Renkler sahne paletinin (mor → magenta → kızıl → amber) içinde kalır.
 * Pad'lerin ışığı parçanın BPM'ine göre sırayla yanar (her pad bir vuruş
 * arayla), böylece dört pad bir sequencer gibi akar.
 */
const PADS: Pad[] = [
  { label: "Fikir kaydet", icon: Sparkles, hue: 38, editor: { kind: "track", origin: "discovery" } },
  { label: "Parça ekle", icon: Music2, hue: 12, editor: { kind: "track", origin: "library" } },
  { label: "Set oluştur", icon: ListMusic, hue: 335, editor: { kind: "set" } },
  { label: "Geçiş kaydet", icon: Repeat2, hue: 275, editor: { kind: "transition" } },
];

export function CuePads({ onFire }: { onFire?: () => void }) {
  const { openEditor } = useWorkspace();
  const [fired, setFired] = useState<{ index: number; nonce: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function fire(index: number) {
    setFired((current) => ({ index, nonce: (current?.nonce ?? 0) + 1 }));
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFired(null), 480);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(10);
    onFire?.();
    openEditor(PADS[index].editor);
  }

  return (
    <div className="cues" role="group" data-localize-attrs="aria-label" aria-label="Hızlı işlemler">
      <div className="cues-head"><span>HOT CUES</span><span>4</span></div>
      <div className="cues-grid">
        {PADS.map((pad, index) => {
          const Icon = pad.icon;
          const isFired = fired?.index === index;
          return (
            <button
              key={pad.label}
              type="button"
              className={`cue-pad${isFired ? " fired" : ""}`}
              style={{ "--pad-h": pad.hue, "--pad-i": index } as CSSProperties}
              data-localize-attrs="aria-label,title"
              aria-label={pad.label}
              title={pad.label}
              onClick={() => fire(index)}
            >
              <small aria-hidden="true">{index + 1}</small>
              <Icon size={18} aria-hidden="true" />
              <span><L text={pad.label} /></span>
              {isFired && <u key={fired?.nonce} className="flash" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
