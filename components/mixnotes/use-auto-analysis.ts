"use client";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { analyzePreview, missingFields, needsAnalysis, rememberTried, triedIds } from "@/lib/auto-analysis";
import { trackInputFrom } from "@/lib/dj-logic";
import { translateUi } from "@/lib/ui-translations";
import type { WorkspaceData } from "@/lib/workspace-types";

type Apply = (action: Record<string, unknown>) => Promise<WorkspaceData | null>;

// Fills missing BPM/key in the background from store previews, one track at a time,
// trying each track once per device so the catalog is not hammered.
export function useAutoAnalysis(data: WorkspaceData | null, offline: boolean, apply: Apply) {
  const running = useRef(false);
  const mounted = useRef(true);
  const latest = useRef(data);
  const applyRef = useRef(apply);
  useEffect(() => { latest.current = data; applyRef.current = apply; });
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const owner = data?.profile.storageKey ?? "";
  // Re-run only when the set of tracks still missing BPM/key changes, not on every save.
  const pending = data ? data.tracks.filter(needsAnalysis).map((t) => t.id).join(",") : "";

  useEffect(() => {
    if (!owner || !pending || offline || running.current || typeof AudioContext === "undefined") return;
    running.current = true;
    void (async () => {
      const tried = triedIds(owner);
      let filled = 0;
      for (let processed = 0; processed < 12 && mounted.current; processed += 1) {
        const candidate = latest.current?.tracks.find((t) => needsAnalysis(t) && !tried.has(t.id) && t.title.trim().length > 1);
        if (!candidate) break;
        tried.add(candidate.id);
        rememberTried(owner, tried);
        try {
          const analysis = await analyzePreview(candidate);
          // Re-read the record: the DJ may have edited it while the preview was analysed.
          const track = latest.current?.tracks.find((t) => t.id === candidate.id);
          if (!analysis || !track || !mounted.current) continue;
          const fields = missingFields(track, analysis);
          if (!Object.keys(fields).length) continue;
          if (await applyRef.current({ type: "track.update", id: track.id, expectedRevision: track.revision, input: { ...trackInputFrom(track), ...fields } })) filled += 1;
        } catch { /* a missing or undecodable preview just leaves the fields empty */ }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      running.current = false;
      if (filled && mounted.current) toast.success(translateUi(`${filled} parçanın BPM / key bilgisi önizlemeden tahmin edildi. Kulağınla doğrula.`, latest.current?.profile.language ?? "tr"));
    })();
  }, [owner, pending, offline]);
}
