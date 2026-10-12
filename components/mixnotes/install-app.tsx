"use client";
import { L, Localized } from "./localized";

import { useEffect, useState } from "react";
import { Download, Share, Smartphone, X } from "lucide-react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
const dismissedKey = "mixnotes.install.dismissed";

// Registers the offline shell in production builds only, so dev HMR never serves stale code.
export function useServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => { /* offline shell is optional */ });
  }, []);
}

function standalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function InstallAppCard() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try { dismissed = localStorage.getItem(dismissedKey) === "1"; } catch { /* show anyway */ }
    if (dismissed || standalone()) return;
    const apple = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    // Defer to the next frame so the card mounts after hydration without a synchronous effect update.
    const frame = requestAnimationFrame(() => { setIos(apple); setVisible(apple); });
    const onPrompt = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPromptEvent); setVisible(true); };
    const onInstalled = () => setVisible(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem(dismissedKey, "1"); } catch { /* session only */ }
  }

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setVisible(false);
    setPrompt(null);
  }

  if (!visible) return null;
  return (
    <Localized><aside className="install-card" aria-label="Uygulamayı yükle">
      <Smartphone size={22} aria-hidden="true" />
      <div>
        <strong><L text="MixNotes'u ana ekrana ekle" /></strong>
        {ios
          ? <p><L text="Safari'de Paylaş" /> <Share size={13} aria-label="Paylaş" /> <L text="› Ana Ekrana Ekle'ye dokun. Tam ekran açılır, internet yokken de son kopyan görünür." /></p>
          : <p><L text="Tam ekran açılır, kabinde internet yokken de son kopyan görünür." /></p>}
      </div>
      {!ios && prompt && <button className="button primary" onClick={install}><Download size={15} /><L text="Yükle" /></button>}
      <button className="icon-control" onClick={dismiss} aria-label="Kapat"><X size={16} /></button>
    </aside></Localized>
  );
}
