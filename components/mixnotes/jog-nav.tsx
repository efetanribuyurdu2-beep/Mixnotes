"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import type { WorkspaceView } from "@/lib/workspace-types";
import { L } from "./localized";

type JogItem = { id: WorkspaceView; label: string; icon: LucideIcon };

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Jog wheel gezinme.
 *
 * Her bölüm tekerleğin üzerinde bir çentik. Tekerlek döndükçe sıradaki bölüme
 * geçilir. Üç yolla döner:
 *   - Sürükle: parmakla ya da fareyle tekerleğin etrafında daire çiz (scratch)
 *   - Kaydır: fare tekerleği ya da iki parmakla kaydırma
 *   - Klavye: ok tuşları, Home ve End
 * Telefonda destekleyen cihazlarda her çentikte hafif titreşim verir.
 *
 * Dışarıdaki halkada dönen ışık (playhead), parçanın BPM'ine göre 4 ölçüde bir
 * tur atar; hızı stage-backdrop'ın yazdığı --stage-bar değişkeninden gelir.
 *
 * Tek doğru kaynak "activeId"dir: tekerlek hiçbir zaman kendi başına bölüm
 * değiştirmez, onSelect'i çağırır ve dönüşü yeni activeId'ye göre yapar.
 */
export function JogNav({ items, activeId, onSelect }: { items: JogItem[]; activeId: WorkspaceView; onSelect: (id: WorkspaceView) => void }) {
  const count = items.length;
  const stepDeg = 360 / count;
  const found = items.findIndex((item) => item.id === activeId);
  const activeIndex = found >= 0 ? found : 0;

  const wheelRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(activeIndex);
  const drag = useRef<{ angle: number; acc: number } | null>(null);

  // Toplam dönüş (çentik sayısı). Son bölümden ilk bölüme geçerken geri sarmak
  // yerine aynı yönde bir çentik daha döner.
  const [turns, setTurns] = useState(activeIndex);
  const [seenIndex, setSeenIndex] = useState(activeIndex);
  // Bölüm dışarıdan değişince dönüşü render sırasında ayarla (effect içinde setState yerine).
  if (seenIndex !== activeIndex) {
    setSeenIndex(activeIndex);
    const position = ((turns % count) + count) % count;
    let delta = activeIndex - position;
    if (delta > count / 2) delta -= count;
    if (delta < -count / 2) delta += count;
    if (delta !== 0) setTurns(turns + delta);
  }
  useEffect(() => { indexRef.current = activeIndex; }, [activeIndex]);

  const step = useCallback(
    (direction: 1 | -1) => {
      const next = (indexRef.current + direction + count) % count;
      indexRef.current = next;
      onSelect(items[next].id);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(6);
    },
    [count, items, onSelect],
  );

  // Fare tekerleği: sayfayı kaydırmasın diye pasif olmayan dinleyici gerekir.
  useEffect(() => {
    const element = wheelRef.current;
    if (!element) return;
    let acc = 0;
    let last = 0;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      acc += event.deltaY || event.deltaX;
      const now = performance.now();
      if (Math.abs(acc) >= 60 && now - last >= 110) {
        step(acc > 0 ? 1 : -1);
        acc = 0;
        last = now;
      } else if (Math.abs(acc) > 240) {
        acc = 0; // eylemsizlikten gelen fazlalığı at
      }
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [step]);

  const angleOf = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return (Math.atan2(event.clientY - (rect.top + rect.height / 2), event.clientX - (rect.left + rect.width / 2)) * 180) / Math.PI;
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = { angle: angleOf(event), acc: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state) return;
    const angle = angleOf(event);
    let delta = angle - state.angle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    state.angle = angle;
    state.acc += delta;
    while (state.acc >= stepDeg) {
      step(1);
      state.acc -= stepDeg;
    }
    while (state.acc <= -stepDeg) {
      step(-1);
      state.acc += stepDeg;
    }
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") step(1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") step(-1);
    else if (event.key === "Home") onSelect(items[0].id);
    else if (event.key === "End") onSelect(items[count - 1].id);
    else return;
    event.preventDefault();
  };

  const active = items[activeIndex];
  const ActiveIcon = active.icon;

  return (
    <div className="jog">
      <div
        ref={wheelRef}
        className="jog-wheel"
        role="slider"
        tabIndex={0}
        data-localize-attrs="aria-label"
        aria-label="Bölüm tekerleği"
        aria-valuemin={1}
        aria-valuemax={count}
        aria-valuenow={activeIndex + 1}
        aria-valuetext={active.label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      >
        <span className="jog-marker" aria-hidden="true" />
        <span className="jog-led" aria-hidden="true"><i className="tail" /><i className="dot" /></span>
        <div className="jog-platter" style={{ transform: `rotate(${turns * stepDeg}deg)` }} aria-hidden="true">
          {items.map((item, index) => (
            <i
              key={item.id}
              className={index === activeIndex ? "on" : ""}
              style={{ transform: `rotate(${-index * stepDeg}deg) translateY(calc(var(--jog-r) * -1))` }}
            />
          ))}
        </div>
        <span className="jog-hub" aria-hidden="true">
          <span key={active.id}><ActiveIcon size={22} /></span>
        </span>
      </div>

      <div className="jog-meta">
        <button type="button" data-localize-attrs="aria-label" aria-label="Önceki bölüm" onClick={() => step(-1)}><ChevronLeft size={16} /></button>
        <div className="jog-label">
          <small>{pad(activeIndex + 1)} / {pad(count)}</small>
          <strong key={active.id}><L text={active.label} /></strong>
        </div>
        <button type="button" data-localize-attrs="aria-label" aria-label="Sonraki bölüm" onClick={() => step(1)}><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}
