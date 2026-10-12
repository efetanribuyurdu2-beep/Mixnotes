import type { AuditionSettings } from "./transition-audio";
export type LinkMetadata = { provider: string; url: string; title: string; artist: string; artworkUrl: string; album: string; releaseDate: string; genre: string; durationSeconds: number | null; previewUrl: string; creator: string };

export type WorkspaceView = "home" | "discover" | "library" | "crates" | "sets" | "transitions" | "practice" | "transfer" | "plans" | "tools";

export type TrackOrigin = "discovery" | "library";

export type TrackSource = {
  id: string;
  provider: string;
  externalId: string;
  externalUrl: string;
  availability: string;
  purchaseUrl: string;
};

export type Track = {
  linkMetadata?: LinkMetadata | null;
  id: string;
  title: string;
  artist: string;
  version: string;
  bpm: number | null;
  musicalKey: string;
  genre: string;
  subgenre: string;
  energy: number | null;
  rating: number;
  tags: string[];
  origin: TrackOrigin;
  notes: string;
  cueNotes: string;
  introNotes: string;
  outroNotes: string;
  durationSeconds: number | null;
  label: string;
  dateAdded: string;
  updatedAt: string;
  revision: number;
  sources: TrackSource[];
};

export type SmartRule = { genre: string; tag: string; bpmMin: number | null; bpmMax: number | null; energyMin: number | null; ratingMin: number; origin: "all" | TrackOrigin };

export type Session = { id: string; kind: "practice" | "performance"; date: string; durationMinutes: number; setId: string | null; transitionId: string | null; rating: number; notes: string; setTitle: string; transitionLabel: string; createdAt: string };

export type Crate = {
  rules?: SmartRule | null;
  id: string;
  name: string;
  description: string;
  trackIds: string[];
  createdAt: string;
  updatedAt: string;
  revision: number;
};

export type SetTrack = {
  trackId: string;
  position: number;
  notes: string;
};

export type MixSet = {
  id: string;
  title: string;
  genre: string;
  eventDate: string;
  notes: string;
  status: "draft" | "ready" | "performed";
  tracks: SetTrack[];
  createdAt: string;
  updatedAt: string;
  revision: number;
};

export type Transition = {
  audioSettings?: AuditionSettings | null;
  id: string;
  fromTrackId: string | null;
  toTrackId: string | null;
  fromLabel: string;
  toLabel: string;
  transitionType: string;
  mixOutPoint: string;
  mixInPoint: string;
  eqTechnique: string;
  fxNotes: string;
  timingNotes: string;
  notes: string;
  rating: number;
  difficulty: number;
  practiceStatus: "idea" | "practice" | "ready";
  lastPracticed: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
};

export type WorkspaceData = {
  profile: {
    membership?: {plan:"free"|"pro"|"academy"|"founder";fullAccess:boolean};
    storageKey?: string;
    avatarId?: import("./avatars").AvatarId | null;
    language?: "tr" | "en";
    displayName: string;
  };
  tracks: Track[];
  crates: Crate[];
  sets: MixSet[];
  transitions: Transition[];
  sessions: Session[];
  meta: {
    migratedLegacySets: number;
    schemaVersion: number;
  };
};

export type TrackInput = Omit<
  Track,
  "id" | "dateAdded" | "updatedAt" | "revision" | "sources"
> & {
  sourceProvider: string;
  sourceUrl: string;
};

export type SetInput = Pick<MixSet, "title" | "genre" | "eventDate" | "notes" | "status">;

export type CrateInput = Pick<Crate, "name" | "description" | "rules">;

export type TransitionInput = Pick<
  Transition,
  | "audioSettings"
  | "fromTrackId"
  | "toTrackId"
  | "transitionType"
  | "mixOutPoint"
  | "mixInPoint"
  | "eqTechnique"
  | "fxNotes"
  | "timingNotes"
  | "notes"
  | "rating"
  | "difficulty"
  | "practiceStatus"
  | "lastPracticed"
>;
