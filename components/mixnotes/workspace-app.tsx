"use client";
import {L,Localized,LanguageContext} from "./localized";
import {translateUi} from "@/lib/ui-translations";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Headphones,
  Compass,
  Activity,
  FileUp,
  Archive,
  Boxes,
  Command,
  Download,
  Home,
  Library,
  ListMusic,
  Menu,
  Plus,
  RefreshCw,
  Repeat2,
  Search,
  WifiOff,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { WorkspaceData, WorkspaceView } from "@/lib/workspace-types";
import { PlansView, StudioToolsView } from "./studio-tools";
import { DiscoverView } from "./discover-view";
import { ProfileAvatar } from "./profile-avatar";
import { useServiceWorker } from "./install-app";
import { queueCommand, type QuickCommand } from "./pending-command";
import { PracticeView } from "./practice-view";
import { TransferView } from "./transfer-view";
import { CratesView } from "./crates-view";
import { WorkspaceDeleteDialog, WorkspaceEditor } from "./editors";
import { HomeView } from "./home-view";
import { LibraryView } from "./library-view";
import { SetsView } from "./sets-view";
import { TransitionsView } from "./transitions-view";
import {
  WorkspaceProvider,
  type DeleteState,
  type EditorState,
  type WorkspaceAction,
} from "./workspace-context";

const navigation = [

  { id: "home" as const, label: "Workspace", icon: Home },
  { id: "discover" as const, label: "Discover", icon: Compass },
  { id: "library" as const, label: "Library", icon: Library },
  { id: "crates" as const, label: "Crates", icon: Boxes },
  { id: "sets" as const, label: "Sets", icon: ListMusic },
  { id: "transitions" as const, label: "Transitions", icon: Repeat2 },
  { id: "practice" as const, label: "Transition Lab", icon: Activity },
  { id: "tools" as const, label: "DJ Toolbox", icon: Headphones },
  { id: "transfer" as const, label: "Import / Export", icon: FileUp },
  { id: "plans" as const, label: "Planlar", icon: Archive },
];

const viewLabels: Record<WorkspaceView, string> = {
  plans: "Planlar", tools: "DJ Toolbox",
  home: "DJ Studio",
  discover: "Discover",
  practice: "Transition Lab",
  transfer: "Import / Export",
  library: "Track Library",
  crates: "Crates",
  sets: "Set Builder",
  transitions: "Transition Memory",
};

type CommandResult = {
  id: string;
  type: "track" | "crate" | "set" | "transition" | "action";
  title: string;
  subtitle: string;
  run: () => void;
};

async function requestWorkspace() {
  const response = await fetch("/api/workspace", { cache: "no-store" });
  const payload = await response.json() as WorkspaceData & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Çalışma alanı yüklenemedi.");
  return payload;
}

function readWorkspaceSnapshot() {
  const cached = localStorage.getItem("mixnotes.workspace.snapshot");
  if (!cached) return null;
  try {
    return JSON.parse(cached) as WorkspaceData;
  } catch {
    localStorage.removeItem("mixnotes.workspace.snapshot");
    return null;
  }
}

export function WorkspaceApp() {
  useServiceWorker();
  const [data, setData] = useState<WorkspaceData | null>(null);
  useEffect(() => { const url=new URL(window.location.href);const listen=url.searchParams.get('listen');if(listen==='discover'||listen==='practice'){setView(listen);url.searchParams.delete('listen');window.history.replaceState(null,'',url.pathname+url.search+url.hash);}const result=url.searchParams.get('spotify');if(!result)return;setView('discover');const message=result==='connected'?'Spotify hesabın bağlı.':result==='cancelled'?'Spotify bağlantısı iptal edildi.':'Spotify bağlantısı tamamlanamadı. Ayarları kontrol edip yeniden dene.';if(result==='connected')toast.success(message);else toast.error(message);url.searchParams.delete('spotify');window.history.replaceState(null,'',url.pathname+url.search+url.hash);},[]);
  useEffect(() => { document.documentElement.lang = data?.profile.language ?? "tr"; }, [data?.profile.language]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const [view, setView] = useState<WorkspaceView>("home");
  const [selectedTrackId, setSelectedTrackId] = useState("");
  const [selectedCrateId, setSelectedCrateId] = useState("");
  const [selectedSetId, setSelectedSetId] = useState("");
  const [editor, setEditor] = useState<EditorState>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteState>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const payload = await requestWorkspace();
      setData(payload);
      setOffline(false);
      localStorage.setItem("mixnotes.workspace.snapshot", JSON.stringify(payload));
    } catch (error) {
      const cached = readWorkspaceSnapshot();
      if (cached) {
        setData(cached);
        setOffline(true);
        toast.warning("Çevrimdışı kopya açıldı. Bağlantı gelene kadar görüntüleyebilirsin.");
        return;
      }
      setLoadError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    requestWorkspace()
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
        setOffline(false);
        localStorage.setItem("mixnotes.workspace.snapshot", JSON.stringify(payload));
      })
      .catch((error: Error) => {
        if (cancelled) return;
        const cached = readWorkspaceSnapshot();
        if (cached) {
          setData(cached);
          setOffline(true);
          toast.warning("Çevrimdışı kopya açıldı. Bağlantı gelene kadar görüntüleyebilirsin.");
        } else {
          setLoadError(error.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
      if (event.key === "Escape") setMobileNav(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const mutate = useCallback(async (action: WorkspaceAction, message = "Kaydedildi", onSuccess?: (data: WorkspaceData) => void) => {
    if (offline) { toast.error(translateUi("Değişiklik yapmak için yeniden bağlan.",data?.profile.language??"tr")); return false; }
    if (busy) return false;
    setBusy(true);
    try {
      const response = await fetch("/api/workspace/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      const payload = await response.json() as WorkspaceData & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Değişiklik kaydedilemedi.");
      setData(payload);
      setOffline(false);
      localStorage.setItem("mixnotes.workspace.snapshot", JSON.stringify(payload));
      toast.success(translateUi(message,payload.profile.language??"tr"));
      onSuccess?.(payload);
      return true;
    } catch (error) {
      toast.error(translateUi((error as Error).message,data?.profile.language??"tr"));
      return false;
    } finally {
      setBusy(false);
    }
  }, [offline, busy, data?.profile.language]);

  function navigate(next: WorkspaceView) {
    setView(next);
    setMobileNav(false);
  }

  function exportWorkspace() {
    if (!data) return;
    const exportData = {
      format: "mixnotes-workspace",
      version: data.meta.schemaVersion,
      exportedAt: new Date().toISOString(),
      tracks: data.tracks,
      crates: data.crates,
      sets: data.sets,
      transitions: data.transitions,
      sessions: data.sessions ?? [],
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `mixnotes-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success(translateUi("MixNotes yedeği indirildi",data.profile.language??"tr"));
  }

  const commandResults = useMemo<CommandResult[]>(() => {
    if (!data) return [];
    const closeAnd = (run: () => void) => () => { run(); setCommandOpen(false); setCommandQuery(""); };
const activeSetId = selectedSetId || data.sets[0]?.id || "";
    const onSet = (command: QuickCommand) => () => { if (activeSetId) setSelectedSetId(activeSetId); setView("sets"); queueCommand(command); };
    const onView = (target: WorkspaceView, command?: QuickCommand) => () => { setView(target); if (command) queueCommand(command); };
    const results: CommandResult[] = [
      { id: "add-track", type: "action", title: "Library’ye parça ekle", subtitle: "Yeni kayıt", run: closeAnd(() => setEditor({ kind: "track", origin: "library" })) },
      { id: "add-set", type: "action", title: "Yeni set oluştur", subtitle: "Set Builder", run: closeAnd(() => setEditor({ kind: "set" })) },
      { id: "add-transition", type: "action", title: "Geçiş kaydet", subtitle: "Transition Memory", run: closeAnd(() => setEditor({ kind: "transition" })) },
      ...(activeSetId && data.sets.find((set) => set.id === activeSetId)?.tracks.length ? [
        { id: "quick-stage", type: "action" as const, title: "Sahne modunu aç", subtitle: data.sets.find((set) => set.id === activeSetId)!.title, run: closeAnd(onSet("stage")) },
        { id: "quick-optimize", type: "action" as const, title: "Akışı optimize et", subtitle: data.sets.find((set) => set.id === activeSetId)!.title, run: closeAnd(onSet("optimize")) },
        { id: "quick-share", type: "action" as const, title: "Seti paylaş", subtitle: data.sets.find((set) => set.id === activeSetId)!.title, run: closeAnd(onSet("share")) },
        { id: "quick-export", type: "action" as const, title: "Seti dışa aktar", subtitle: "Rekordbox · M3U8", run: closeAnd(onSet("export")) },
      ] : []),
      { id: "quick-template", type: "action", title: "Şablondan set oluştur", subtitle: "Set Builder", run: closeAnd(onSet("template")) },
      { id: "quick-tap", type: "action", title: "Tap BPM", subtitle: "DJ Toolbox", run: closeAnd(onView("tools", "tap")) },
      { id: "quick-camelot", type: "action", title: "Camelot çarkı", subtitle: "DJ Toolbox", run: closeAnd(onView("tools", "camelot")) },
      { id: "quick-practice", type: "action", title: "Prova kaydet", subtitle: "Transition Lab", run: closeAnd(onView("practice")) },
      { id: "quick-stats", type: "action", title: "İstatistikler", subtitle: "Workspace", run: closeAnd(onView("home", "stats")) },
      ...data.tracks.map((track) => ({ id: `track-${track.id}`, type: "track" as const, title: track.title, subtitle: `${track.artist || "Sanatçı yok"} · ${track.bpm ?? "—"} BPM`, run: closeAnd(() => { setSelectedTrackId(track.id); setView("library"); }) })),
      ...data.crates.map((crate) => ({ id: `crate-${crate.id}`, type: "crate" as const, title: crate.name, subtitle: `${crate.trackIds.length} parça`, run: closeAnd(() => { setSelectedCrateId(crate.id); setView("crates"); }) })),
      ...data.sets.map((set) => ({ id: `set-${set.id}`, type: "set" as const, title: set.title, subtitle: `${set.tracks.length} parça · ${set.genre || "Tür yok"}`, run: closeAnd(() => { setSelectedSetId(set.id); setView("sets"); }) })),
      ...data.transitions.map((transition) => ({ id: `transition-${transition.id}`, type: "transition" as const, title: `${data.tracks.find((track) => track.id === transition.fromTrackId)?.title || transition.fromLabel} → ${data.tracks.find((track) => track.id === transition.toTrackId)?.title || transition.toLabel}`, subtitle: transition.transitionType || "Geçiş notu", run: closeAnd(() => setView("transitions")) })),
    ];
    const needle = commandQuery.trim().toLocaleLowerCase("tr-TR");
    return results.filter((result) => !needle || `${result.type === "action" ? translateUi(result.title,data.profile.language??"tr") : result.title} ${result.subtitle}`.toLocaleLowerCase(data.profile.language === "en" ? "en-US" : "tr-TR").includes(needle)).slice(0, 18);
  }, [data, commandQuery, selectedSetId]);

  if (loading) {
    return <div className="app-loading"><div className="loading-brand"><span className="signal-mark"><i /><i /><i /></span><strong>mixnotes</strong></div><Skeleton className="h-10 w-52" /><Skeleton className="h-64 w-full" /><p><L text={"Hazırlık alanın kuruluyor…"}/></p></div>;
  }

  if (!data || loadError) {
    return <div className="fatal-state"><span className="signal-mark"><i /><i /><i /></span><p className="overline">MIXNOTES</p><h1><L text={"Çalışma alanına ulaşamadık"}/></h1><p>{loadError || <L text={"Beklenmeyen bir hata oluştu."}/>}</p><button className="button primary" onClick={() => { setLoading(true); void load(); }}><RefreshCw size={16} /><L text={" Tekrar dene"}/></button></div>;
  }

  const activeCrateId = data.crates.some((crate) => crate.id === selectedCrateId) ? selectedCrateId : data.crates[0]?.id ?? "";
  const activeSetId = data.sets.some((set) => set.id === selectedSetId) ? selectedSetId : data.sets[0]?.id ?? "";

  const contextValue = {
    data,
    view,
    setView: navigate,
    busy,
    selectedTrackId,
    setSelectedTrackId,
    selectedCrateId: activeCrateId,
    setSelectedCrateId,
    selectedSetId: activeSetId,
    setSelectedSetId,
    openEditor: setEditor,
    requestDelete: setDeleteTarget,
    mutate,
  };

  return (
    <LanguageContext.Provider value={data.profile.language??"tr"}><WorkspaceProvider value={contextValue}><Localized>
      <Toaster theme="dark" position="bottom-right" />
      <div className="app-shell">
        <header className="app-topbar">
          <button data-localize-attrs="aria-label" className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Menüyü aç"><Menu size={20} /></button>
          <button data-localize-attrs="aria-label" className="brand-lockup" onClick={() => navigate("home")} aria-label="MixNotes ana çalışma alanı">
            <span className="signal-mark"><i /><i /><i /></span><strong>mixnotes<span>.</span></strong>
          </button>
          <span className="topbar-view"><L text={viewLabels[view]}/></span>
          <button className="command-trigger" onClick={() => setCommandOpen(true)}><Search size={15} /><span><L text={"Her yerde ara"}/></span><kbd>⌘ K</kbd></button>
          <button data-localize-attrs="title" className="topbar-action" onClick={exportWorkspace} title="Verilerini JSON olarak dışa aktar"><Download size={17} /><span><L text={"Yedekle"}/></span></button>
          <ProfileAvatar/>
        </header>

        {offline && <div className="offline-banner"><WifiOff size={15} /><L text={" Çevrimdışı kopyayı görüntülüyorsun. Değişiklikler bağlantı geri geldiğinde yapılabilir."}/><button onClick={() => void load()}><L text={"Yeniden dene"}/></button></div>}

        <div className="app-body">
          <aside className={`left-rail${mobileNav ? " mobile-open" : ""}`}>
            <div className="mobile-rail-head"><span><L text={"MENÜ"}/></span><button data-localize-attrs="aria-label" onClick={() => setMobileNav(false)} aria-label="Menüyü kapat"><X size={20} /></button></div>
            <nav aria-label="Ana navigasyon">
              {navigation.map((item) => {
                const Icon = item.icon;
                return <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => navigate(item.id)}><Icon size={18} /><span><L text={item.label}/></span>{item.id === "library" && <small>{data.tracks.length}</small>}{item.id === "transitions" && data.transitions.some((transition) => transition.practiceStatus === "practice") && <i data-localize-attrs="aria-label" aria-label="Çalışılacak geçiş var" />}</button>;
              })}
            </nav>
            <div className="rail-collections">
              <div><span><L text={"HIZLI CRATES"}/></span><button data-localize-attrs="aria-label" aria-label="Crate oluştur" onClick={() => setEditor({ kind: "crate" })}><Plus size={14} /></button></div>
              {data.crates.slice(0, 4).map((crate) => <button key={crate.id} onClick={() => { setSelectedCrateId(crate.id); navigate("crates"); }}><Archive size={14} /><span>{crate.name}</span><small>{crate.trackIds.length}</small></button>)}
              {!data.crates.length && <p><L text={"Hazırlık malzemeni crate’lerde grupla."}/></p>}
            </div>
            <button className="rail-command" onClick={() => setCommandOpen(true)}><Command size={16} /><span>Command palette</span><kbd>⌘K</kbd></button>
            <div className="rail-status"><span className="status-dot" /> <div><strong>MixNotes Studio</strong><small><L text={"Verilerin senin hesabına bağlı"}/></small></div></div>
          </aside>

          <main className="main-workspace">
            {view === "plans" && <PlansView />}
            {view === "tools" && <StudioToolsView />}
            {view === "home" && <HomeView />}
            {view === "discover" && <DiscoverView />}
            {view === "practice" && <PracticeView />}
            {view === "transfer" && <TransferView />}
            {view === "library" && <LibraryView />}
            {view === "crates" && <CratesView />}
            {view === "sets" && <SetsView />}
            {view === "transitions" && <TransitionsView />}
          </main>
        </div>

        <nav className="mobile-bottom-nav" aria-label="Mobil navigasyon">
          {navigation.map((item) => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => navigate(item.id)}><Icon size={19} /><span>{item.label === "Workspace" ? <L text="Ana"/> : <L text={item.label}/>}</span></button>; })}
        </nav>
        {mobileNav && <button data-localize-attrs="aria-label" className="rail-scrim" aria-label="Menüyü kapat" onClick={() => setMobileNav(false)} />}
      </div>

      <WorkspaceEditor editor={editor} close={() => setEditor(null)} />
      <WorkspaceDeleteDialog target={deleteTarget} close={() => setDeleteTarget(null)} />

      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent className="command-dialog">
          <DialogTitle><L text={"MixNotes’ta ara"}/></DialogTitle>
          <DialogDescription><L text={"Parçalar, crate’ler, setler, geçişler ve hızlı işlemler."}/></DialogDescription>
          <label className="command-input"><Search size={18} /><input data-localize-attrs="placeholder" autoFocus value={commandQuery} onChange={(event) => setCommandQuery(event.target.value)} placeholder="Bir şey yaz…" /></label>
          <div className="command-results">
            {commandResults.map((result) => <button key={result.id} onClick={result.run}><span className={`command-type type-${result.type}`}>{result.type === "track" ? "TR" : result.type === "crate" ? "CR" : result.type === "set" ? "ST" : result.type === "transition" ? "FX" : "+"}</span><span><strong>{result.type === "action" ? <L text={result.title}/> : result.title}</strong><small>{result.type === "action" ? <L text={result.subtitle}/> : result.subtitle}</small></span></button>)}
            {!commandResults.length && <p><L text={"Aramana uyan bir kayıt bulunamadı."}/></p>}
          </div>
        </DialogContent>
      </Dialog>
    </Localized></WorkspaceProvider></LanguageContext.Provider>
  );
}
