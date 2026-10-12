"use client";

import { createContext, useContext } from "react";
import type { Crate, MixSet, Track, Transition, WorkspaceData, WorkspaceView } from "@/lib/workspace-types";

export type EditorState =
  | { kind: "track"; item?: Track; origin?: "discovery" | "library" }
  | { kind: "crate"; item?: Crate }
  | { kind: "set"; item?: MixSet }
  | { kind: "transition"; item?: Transition; fromTrackId?: string; toTrackId?: string }
  | { kind: "picker"; target: "crate" | "set"; targetId: string }
  | null;

export type DeleteState =
  | { kind: "track"; item: Track }
  | { kind: "crate"; item: Crate }
  | { kind: "set"; item: MixSet }
  | { kind: "transition"; item: Transition }
  | null;

export type WorkspaceAction = Record<string, unknown> & { type: string };

type WorkspaceContextValue = {
  data: WorkspaceData;
  view: WorkspaceView;
  setView: (view: WorkspaceView) => void;
  busy: boolean;
  selectedTrackId: string;
  setSelectedTrackId: (id: string) => void;
  selectedCrateId: string;
  setSelectedCrateId: (id: string) => void;
  selectedSetId: string;
  setSelectedSetId: (id: string) => void;
  openEditor: (editor: EditorState) => void;
  requestDelete: (target: DeleteState) => void;
  mutate: (action: WorkspaceAction, message?: string, onSuccess?: (data: WorkspaceData) => void) => Promise<boolean>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export const WorkspaceProvider = WorkspaceContext.Provider;

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return value;
}
