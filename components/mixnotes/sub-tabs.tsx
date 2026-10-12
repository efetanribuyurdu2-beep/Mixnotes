"use client";
import { L } from "./localized";

import { createContext, useContext, useEffect, useId, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type Tab = { id: string; label: string; icon?: LucideIcon; badge?: string | number };
const ActiveTab = createContext<{ active: string; base: string } | null>(null);

function stored(key: string, fallback: string, ids: string[]) {
  try { const value = localStorage.getItem(key); return value && ids.includes(value) ? value : fallback; } catch { return fallback; }
}

// Panes stay mounted while hidden, so audio, forms and scroll positions survive tab switches.
export function SubTabs({ id, tabs, children, onChange }: { id: string; tabs: Tab[]; children: ReactNode; onChange?: (tab: string) => void }) {
  const key = `mixnotes.tab.${id}`;
  const [active, setActive] = useState(tabs[0].id);
  const base = useId().replace(/:/g, "");
  const ids = tabs.map((t) => t.id).join(",");
  // Restore the last tab after hydration so server and client render the same first frame.
  useEffect(() => {
    const list = ids.split(",");
    const frame = requestAnimationFrame(() => setActive(stored(key, list[0], list)));
    return () => cancelAnimationFrame(frame);
  }, [key, ids]);

  useEffect(() => {
    const onSelect = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; tab: string }>).detail;
      if (detail?.id === id && ids.split(",").includes(detail.tab)) { setActive(detail.tab); try { localStorage.setItem(key, detail.tab); } catch { /* preference only */ } }
    };
    window.addEventListener("mixnotes-select-tab", onSelect);
    return () => window.removeEventListener("mixnotes-select-tab", onSelect);
  }, [id, ids, key]);

  function select(tab: string) {
    setActive(tab);
    onChange?.(tab);
    try { localStorage.setItem(key, tab); } catch { /* preference only */ }
  }

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const next = event.key === "ArrowRight" ? index + 1 : event.key === "ArrowLeft" ? index - 1 : null;
    if (next === null) return;
    event.preventDefault();
    const tab = tabs[(next + tabs.length) % tabs.length];
    select(tab.id);
    document.getElementById(`${base}-tab-${tab.id}`)?.focus();
  }

  return (
    <ActiveTab.Provider value={{ active, base }}>
      <nav className="sub-tabs" role="tablist" aria-label="Bölümler">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} id={`${base}-tab-${tab.id}`} role="tab" aria-selected={active === tab.id} aria-controls={`${base}-pane-${tab.id}`} tabIndex={active === tab.id ? 0 : -1}
              className={active === tab.id ? "active" : ""} onClick={() => select(tab.id)} onKeyDown={(event) => onKeyDown(event, index)}>
              {Icon && <Icon size={15} aria-hidden="true" />}<L text={tab.label} />{tab.badge !== undefined && tab.badge !== "" && <small>{tab.badge}</small>}
            </button>
          );
        })}
      </nav>
      {children}
    </ActiveTab.Provider>
  );
}

export function Pane({ id, children, className = "" }: { id: string; children: ReactNode; className?: string }) {
  const context = useContext(ActiveTab);
  if (!context) return <>{children}</>;
  return (
    <div id={`${context.base}-pane-${id}`} role="tabpanel" aria-labelledby={`${context.base}-tab-${id}`} hidden={context.active !== id} className={`sub-pane ${className}`}>
      {children}
    </div>
  );
}

// Lets quick actions open the right tab before scrolling to a tool inside it.
export function selectTab(id: string, tab: string) {
  window.dispatchEvent(new CustomEvent("mixnotes-select-tab", { detail: { id, tab } }));
}
