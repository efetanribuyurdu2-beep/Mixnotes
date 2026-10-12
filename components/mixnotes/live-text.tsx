"use client";

import { useEffect } from "react";

/**
 * Canlı yazı: sloganların ve logo yazısının üzerinde imleci (ya da parmağı)
 * izler. Görünmeyen bir bileşendir; sadece konumu CSS değişkenlerine yazar:
 *   --mx / --my  imlecin yazı kutusu içindeki konumu (px)
 *   data-live    yazının "canlı" olduğunu belirtir (rengi stage.css verir)
 * Telefonda parmak kalkınca renk yaklaşık bir saniye daha kalıp söner.
 */
const SELECTOR = ".view-header h1, .studio-overview h2, .brand-lockup strong, .premium-hub > h1";

export function LiveText() {
  useEffect(() => {
    let active: HTMLElement | null = null;
    let timer: number | undefined;

    const release = () => {
      window.clearTimeout(timer);
      if (active) {
        active.removeAttribute("data-live");
        active = null;
      }
    };

    const onPointer = (event: PointerEvent) => {
      const target = (event.target as Element | null)?.closest?.(SELECTOR) as HTMLElement | null;
      if (!target) {
        if (event.pointerType === "mouse") release();
        return;
      }
      window.clearTimeout(timer);
      if (active !== target) {
        release();
        active = target;
        target.setAttribute("data-live", "");
      }
      const rect = target.getBoundingClientRect();
      target.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      target.style.setProperty("--my", `${event.clientY - rect.top}px`);
    };

    const onTouchEnd = (event: PointerEvent) => {
      if (event.pointerType === "mouse") return;
      window.clearTimeout(timer);
      timer = window.setTimeout(release, 1100);
    };

    document.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("pointerdown", onPointer, { passive: true });
    document.addEventListener("pointerup", onTouchEnd, { passive: true });
    document.addEventListener("pointercancel", onTouchEnd, { passive: true });
    // Dokunmatik ekranda parmak kalkınca da pointerleave gelir; onu yok say ki renk biraz kalsın.
    const onLeave = (event: PointerEvent) => { if (event.pointerType === "mouse") release(); };
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      release();
      document.removeEventListener("pointermove", onPointer);
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("pointerup", onTouchEnd);
      document.removeEventListener("pointercancel", onTouchEnd);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return null;
}
