import { membershipFor } from "@/db/membership";
import { matchesRule } from "@/lib/dj-logic";
import { readExtensions } from "@/db/workspace-extensions";
import { database } from "@/db/raw";
import { shareSchemaStatements, shareTokens } from "@/db/set-shares";
import { billingSchemaStatements } from "@/db/billing";
import type {
  CrateInput,
  SetInput,
  TrackInput,
  TransitionInput,
  WorkspaceData,
} from "@/lib/workspace-types";

const SCHEMA_VERSION = 4;

export class WorkspaceError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type Identity = {
  id: string;
  displayName: string;
  isAutomation: boolean;
};

type LegacyTrack = {
  id?: string;
  title?: string;
  artist?: string;
  bpm?: string;
  key?: string;
  cue?: string;
};

type LegacyTransition = {
  id?: string;
  from?: string;
  to?: string;
  note?: string;
};

type LegacySet = {
  id?: string;
  title?: string;
  genre?: string;
  date?: string;
  notes?: string;
  tracks?: LegacyTrack[];
  transitions?: LegacyTransition[];
  revision?: number;
};

export const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS user_preferences (owner_id TEXT PRIMARY KEY NOT NULL, avatar_id TEXT, language TEXT NOT NULL DEFAULT 'tr')`,
  `CREATE TABLE IF NOT EXISTS transition_audio_settings (owner_id TEXT NOT NULL, transition_id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY (owner_id, transition_id))`,
  `CREATE TABLE IF NOT EXISTS track_link_metadata (owner_id TEXT NOT NULL, track_id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY (owner_id, track_id))`,
  `CREATE TABLE IF NOT EXISTS smart_crate_rules (owner_id TEXT NOT NULL, crate_id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY (owner_id, crate_id))`,
  `CREATE TABLE IF NOT EXISTS practice_sessions (owner_id TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY (owner_id, id))`,
  `CREATE INDEX IF NOT EXISTS sessions_owner_created_idx ON practice_sessions(owner_id,created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS workspace_imports (owner_id TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(owner_id,digest))`,
  `CREATE TABLE IF NOT EXISTS dj_sets (
    id TEXT PRIMARY KEY NOT NULL,
    payload TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1,
    updated TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS dj_sets_v1_backup (
    id TEXT PRIMARY KEY NOT NULL,
    payload TEXT NOT NULL,
    revision INTEGER NOT NULL,
    updated TEXT NOT NULL,
    backed_up_at TEXT NOT NULL
  )`,
  `INSERT OR IGNORE INTO dj_sets_v1_backup (id, payload, revision, updated, backed_up_at)
    SELECT id, payload, revision, updated, datetime('now') FROM dj_sets`,
  `CREATE TABLE IF NOT EXISTS app_migrations (
    owner_id TEXT NOT NULL,
    migration_key TEXT NOT NULL,
    applied_at TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '{}',
    PRIMARY KEY (owner_id, migration_key)
  )`,
  `CREATE TABLE IF NOT EXISTS legacy_import_claims (
    source_key TEXT PRIMARY KEY NOT NULL,
    owner_id TEXT NOT NULL,
    claimed_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS tracks (
    owner_id TEXT NOT NULL,
    id TEXT NOT NULL,
    title TEXT NOT NULL,
    artist TEXT NOT NULL DEFAULT '',
    version TEXT NOT NULL DEFAULT '',
    bpm REAL,
    musical_key TEXT NOT NULL DEFAULT '',
    genre TEXT NOT NULL DEFAULT '',
    subgenre TEXT NOT NULL DEFAULT '',
    energy INTEGER,
    rating INTEGER NOT NULL DEFAULT 0,
    tags TEXT NOT NULL DEFAULT '[]',
    origin TEXT NOT NULL DEFAULT 'discovery',
    notes TEXT NOT NULL DEFAULT '',
    cue_notes TEXT NOT NULL DEFAULT '',
    intro_notes TEXT NOT NULL DEFAULT '',
    outro_notes TEXT NOT NULL DEFAULT '',
    duration_seconds INTEGER,
    label TEXT NOT NULL DEFAULT '',
    date_added TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (owner_id, id)
  )`,
  `CREATE TABLE IF NOT EXISTS track_sources (
    owner_id TEXT NOT NULL,
    id TEXT NOT NULL,
    track_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    external_id TEXT NOT NULL DEFAULT '',
    external_url TEXT NOT NULL DEFAULT '',
    availability TEXT NOT NULL DEFAULT 'reference',
    purchase_url TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    PRIMARY KEY (owner_id, id)
  )`,
  `CREATE TABLE IF NOT EXISTS crates (
    owner_id TEXT NOT NULL,
    id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (owner_id, id)
  )`,
  `CREATE TABLE IF NOT EXISTS crate_tracks (
    owner_id TEXT NOT NULL,
    crate_id TEXT NOT NULL,
    track_id TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    added_at TEXT NOT NULL,
    PRIMARY KEY (owner_id, crate_id, track_id)
  )`,
  `CREATE TABLE IF NOT EXISTS mix_sets (
    owner_id TEXT NOT NULL,
    id TEXT NOT NULL,
    title TEXT NOT NULL,
    genre TEXT NOT NULL DEFAULT '',
    event_date TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (owner_id, id)
  )`,
  `CREATE TABLE IF NOT EXISTS set_tracks (
    owner_id TEXT NOT NULL,
    set_id TEXT NOT NULL,
    track_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    added_at TEXT NOT NULL,
    PRIMARY KEY (owner_id, set_id, track_id)
  )`,
  `CREATE TABLE IF NOT EXISTS transitions (
    owner_id TEXT NOT NULL,
    id TEXT NOT NULL,
    from_track_id TEXT,
    to_track_id TEXT,
    from_label TEXT NOT NULL DEFAULT '',
    to_label TEXT NOT NULL DEFAULT '',
    transition_type TEXT NOT NULL DEFAULT '',
    mix_out_point TEXT NOT NULL DEFAULT '',
    mix_in_point TEXT NOT NULL DEFAULT '',
    eq_technique TEXT NOT NULL DEFAULT '',
    fx_notes TEXT NOT NULL DEFAULT '',
    timing_notes TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    rating INTEGER NOT NULL DEFAULT 0,
    difficulty INTEGER NOT NULL DEFAULT 0,
    practice_status TEXT NOT NULL DEFAULT 'idea',
    last_practiced TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (owner_id, id)
  )`,
  `CREATE INDEX IF NOT EXISTS tracks_owner_updated_idx ON tracks (owner_id, updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS tracks_owner_title_idx ON tracks (owner_id, title)`,
  `CREATE INDEX IF NOT EXISTS sources_owner_track_idx ON track_sources (owner_id, track_id)`,
  `CREATE INDEX IF NOT EXISTS crate_tracks_owner_crate_idx ON crate_tracks (owner_id, crate_id, position)`,
  `CREATE INDEX IF NOT EXISTS set_tracks_owner_set_idx ON set_tracks (owner_id, set_id, position)`,
  `CREATE INDEX IF NOT EXISTS transitions_owner_pair_idx ON transitions (owner_id, from_track_id, to_track_id)`,
  // Studio tables from migrations 0004–0006, kept idempotent so fresh databases work without a migration run.
  `CREATE TABLE IF NOT EXISTS cloud_audio (owner_id TEXT NOT NULL, track_id TEXT NOT NULL, size INTEGER NOT NULL, name TEXT NOT NULL, status TEXT DEFAULT 'pending' NOT NULL, PRIMARY KEY (owner_id, track_id))`,
  `CREATE TABLE IF NOT EXISTS stem_jobs (id TEXT PRIMARY KEY NOT NULL, owner_id TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS studio_notebooks (owner_id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, revision INTEGER DEFAULT 1 NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS plan_settings (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, revision INTEGER DEFAULT 1 NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS spotify_connections (owner_id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS spotify_settings (id TEXT PRIMARY KEY NOT NULL, client_id TEXT NOT NULL)`,
  ...shareSchemaStatements,
  ...billingSchemaStatements,
];

export async function identityFromRequest(request: Request): Promise<Identity | null> {
  let email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  const hostname = new URL(request.url).hostname;
  if (!email && process.env.NODE_ENV !== "production" && (hostname === "localhost" || hostname === "127.0.0.1")) {
    email = "local-preview@mixnotes.dev";
  }
  if (!email) return null;

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email));
  const id = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const encodedName = request.headers.get("oai-authenticated-user-full-name");
  const encoding = request.headers.get("oai-authenticated-user-full-name-encoding");
  const signatureAgent = request.headers.get("signature-agent") ?? "";
  let displayName = email.split("@")[0] || "DJ";

  if (encodedName && encoding === "percent-encoded-utf-8") {
    try {
      displayName = decodeURIComponent(encodedName);
    } catch {
      // The email-derived fallback is intentionally retained for malformed headers.
    }
  }

  return { id, displayName, isAutomation: signatureAgent.includes("web-bot-auth") };
}

async function ensureSchema() {
  const db = database();
  await db.batch(schemaStatements.map((sql) => db.prepare(sql)));
}

async function runInChunks(statements: D1PreparedStatement[], size = 50) {
  const db = database();
  for (let index = 0; index < statements.length; index += size) {
    await db.batch(statements.slice(index, index + size));
  }
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numericValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

async function migrateLegacy(ownerId: string, allowClaim: boolean) {
  const db = database();
  const migrationKey = "legacy-dj-sets-v1";
  const existing = await db
    .prepare("SELECT details FROM app_migrations WHERE owner_id = ? AND migration_key = ?")
    .bind(ownerId, migrationKey)
    .first<{ details: string }>();

  if (existing) {
    if (allowClaim) {
      await db
        .prepare(
          "INSERT OR IGNORE INTO legacy_import_claims (source_key, owner_id, claimed_at) VALUES (?, ?, ?)",
        )
        .bind(migrationKey, ownerId, new Date().toISOString())
        .run();
    }
    try {
      return Number((JSON.parse(existing.details) as { importedSets?: number }).importedSets ?? 0);
    } catch {
      return 0;
    }
  }

  if (!allowClaim) return 0;

  await db
    .prepare(
      "INSERT OR IGNORE INTO legacy_import_claims (source_key, owner_id, claimed_at) VALUES (?, ?, ?)",
    )
    .bind(migrationKey, ownerId, new Date().toISOString())
    .run();
  const claim = await db
    .prepare("SELECT owner_id FROM legacy_import_claims WHERE source_key = ?")
    .bind(migrationKey)
    .first<{ owner_id: string }>();
  if (!claim || claim.owner_id !== ownerId) {
    await db
      .prepare(
        "INSERT INTO app_migrations (owner_id, migration_key, applied_at, details) VALUES (?, ?, ?, ?)",
      )
      .bind(
        ownerId,
        migrationKey,
        new Date().toISOString(),
        JSON.stringify({ importedSets: 0, skipped: "legacy-data-already-claimed" }),
      )
      .run();
    return 0;
  }

  const { results } = await db
    .prepare("SELECT id, payload, revision, updated FROM dj_sets ORDER BY updated ASC")
    .all<{ id: string; payload: string; revision: number; updated: string }>();
  const statements: D1PreparedStatement[] = [];
  let importedSets = 0;

  for (const row of results) {
    let legacy: LegacySet;
    try {
      legacy = JSON.parse(row.payload) as LegacySet;
    } catch {
      continue;
    }

    const setId = stringValue(legacy.id) || row.id;
    const title = stringValue(legacy.title).trim() || "İçe aktarılan set";
    const createdAt = row.updated || new Date().toISOString();
    statements.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO mix_sets
          (owner_id, id, title, genre, event_date, notes, status, created_at, updated_at, revision)
          VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
        )
        .bind(
          ownerId,
          setId,
          title,
          stringValue(legacy.genre),
          stringValue(legacy.date),
          stringValue(legacy.notes),
          createdAt,
          createdAt,
          Math.max(1, Number(legacy.revision ?? row.revision ?? 1)),
        ),
    );

    const titleMatches = new Map<string, string[]>();
    for (const [position, track] of (legacy.tracks ?? []).entries()) {
      const trackTitle = stringValue(track.title).trim();
      if (!trackTitle) continue;
      const trackId = stringValue(track.id) || crypto.randomUUID();
      const normalizedTitle = trackTitle.toLocaleLowerCase("tr-TR");
      titleMatches.set(normalizedTitle, [...(titleMatches.get(normalizedTitle) ?? []), trackId]);
      statements.push(
        db
          .prepare(
            `INSERT OR IGNORE INTO tracks
            (owner_id, id, title, artist, bpm, musical_key, origin, cue_notes, date_added, updated_at, revision)
            VALUES (?, ?, ?, ?, ?, ?, 'library', ?, ?, ?, 1)`,
          )
          .bind(
            ownerId,
            trackId,
            trackTitle,
            stringValue(track.artist),
            numericValue(track.bpm),
            stringValue(track.key),
            stringValue(track.cue),
            createdAt,
            createdAt,
          ),
        db
          .prepare(
            `INSERT OR IGNORE INTO set_tracks
            (owner_id, set_id, track_id, position, notes, added_at)
            VALUES (?, ?, ?, ?, '', ?)`,
          )
          .bind(ownerId, setId, trackId, position, createdAt),
      );
    }

    for (const transition of legacy.transitions ?? []) {
      const fromLabel = stringValue(transition.from);
      const toLabel = stringValue(transition.to);
      const fromMatches = titleMatches.get(fromLabel.toLocaleLowerCase("tr-TR")) ?? [];
      const toMatches = titleMatches.get(toLabel.toLocaleLowerCase("tr-TR")) ?? [];
      statements.push(
        db
          .prepare(
            `INSERT OR IGNORE INTO transitions
            (owner_id, id, from_track_id, to_track_id, from_label, to_label, notes, practice_status, created_at, updated_at, revision)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'idea', ?, ?, 1)`,
          )
          .bind(
            ownerId,
            stringValue(transition.id) || crypto.randomUUID(),
            fromMatches.length === 1 ? fromMatches[0] : null,
            toMatches.length === 1 ? toMatches[0] : null,
            fromLabel,
            toLabel,
            stringValue(transition.note),
            createdAt,
            createdAt,
          ),
      );
    }

    importedSets += 1;
  }

  await runInChunks(statements);
  await db
    .prepare(
      "INSERT INTO app_migrations (owner_id, migration_key, applied_at, details) VALUES (?, ?, ?, ?)",
    )
    .bind(
      ownerId,
      migrationKey,
      new Date().toISOString(),
      JSON.stringify({ importedSets, sourceTable: "dj_sets", backupTable: "dj_sets_v1_backup" }),
    )
    .run();

  return importedSets;
}

export async function prepareWorkspace(ownerId: string, allowLegacyImport = true) {
  await ensureSchema();
  return migrateLegacy(ownerId, allowLegacyImport);
}

function parseTags(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === "string") : [];
  } catch {
    return [];
  }
}

export async function readWorkspace(identity: Identity, importedSets?: number): Promise<WorkspaceData> {
  const db = database();
  const [trackResult, sourceResult, crateResult, crateTrackResult, setResult, setTrackResult, transitionResult] =
    await Promise.all([
      db
        .prepare("SELECT * FROM tracks WHERE owner_id = ? ORDER BY updated_at DESC")
        .bind(identity.id)
        .all<Record<string, string | number | null>>(),
      db
        .prepare("SELECT * FROM track_sources WHERE owner_id = ? ORDER BY created_at ASC")
        .bind(identity.id)
        .all<Record<string, string | number | null>>(),
      db
        .prepare("SELECT * FROM crates WHERE owner_id = ? ORDER BY updated_at DESC")
        .bind(identity.id)
        .all<Record<string, string | number | null>>(),
      db
        .prepare("SELECT * FROM crate_tracks WHERE owner_id = ? ORDER BY position ASC, added_at ASC")
        .bind(identity.id)
        .all<Record<string, string | number | null>>(),
      db
        .prepare("SELECT * FROM mix_sets WHERE owner_id = ? ORDER BY updated_at DESC")
        .bind(identity.id)
        .all<Record<string, string | number | null>>(),
      db
        .prepare("SELECT * FROM set_tracks WHERE owner_id = ? ORDER BY position ASC, added_at ASC")
        .bind(identity.id)
        .all<Record<string, string | number | null>>(),
      db
        .prepare("SELECT * FROM transitions WHERE owner_id = ? ORDER BY updated_at DESC")
        .bind(identity.id)
        .all<Record<string, string | number | null>>(),
    ]);

  const sourcesByTrack = new Map<string, WorkspaceData["tracks"][number]["sources"]>();
  for (const row of sourceResult.results) {
    const trackId = String(row.track_id);
    const sources = sourcesByTrack.get(trackId) ?? [];
    sources.push({
      id: String(row.id),
      provider: String(row.provider),
      externalId: String(row.external_id),
      externalUrl: String(row.external_url),
      availability: String(row.availability),
      purchaseUrl: String(row.purchase_url),
    });
    sourcesByTrack.set(trackId, sources);
  }

  const crateTracks = new Map<string, string[]>();
  for (const row of crateTrackResult.results) {
    const crateId = String(row.crate_id);
    crateTracks.set(crateId, [...(crateTracks.get(crateId) ?? []), String(row.track_id)]);
  }

  const setTracks = new Map<string, WorkspaceData["sets"][number]["tracks"]>();
  for (const row of setTrackResult.results) {
    const setId = String(row.set_id);
    const tracks = setTracks.get(setId) ?? [];
    tracks.push({
      trackId: String(row.track_id),
      position: Number(row.position),
      notes: String(row.notes),
    });
    setTracks.set(setId, tracks);
  }

  const [extensions, shares] = await Promise.all([readExtensions(db, identity.id), shareTokens(identity.id)]);
  const workspace: WorkspaceData = {
    sessions: extensions.sessions,
    profile: { membership: await membershipFor(identity.id), displayName: identity.displayName, storageKey: identity.id, avatarId: extensions.preferences?.avatar_id ?? null, language: extensions.preferences?.language === "en" ? "en" : "tr" },
    tracks: trackResult.results.map((row) => ({
      id: String(row.id),
      linkMetadata: extensions.metadata.get(String(row.id)) ?? null,
      title: String(row.title),
      artist: String(row.artist),
      version: String(row.version),
      bpm: row.bpm === null ? null : Number(row.bpm),
      musicalKey: String(row.musical_key),
      genre: String(row.genre),
      subgenre: String(row.subgenre),
      energy: row.energy === null ? null : Number(row.energy),
      rating: Number(row.rating),
      tags: parseTags(String(row.tags)),
      origin: row.origin === "library" ? "library" : "discovery",
      notes: String(row.notes),
      cueNotes: String(row.cue_notes),
      introNotes: String(row.intro_notes),
      outroNotes: String(row.outro_notes),
      durationSeconds: row.duration_seconds === null ? null : Number(row.duration_seconds),
      label: String(row.label),
      dateAdded: String(row.date_added),
      updatedAt: String(row.updated_at),
      revision: Number(row.revision),
      sources: sourcesByTrack.get(String(row.id)) ?? [],
    })),
    crates: crateResult.results.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      description: String(row.description),
      trackIds: crateTracks.get(String(row.id)) ?? [],
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      revision: Number(row.revision),
    })),
    sets: setResult.results.map((row) => ({
      id: String(row.id),
      title: String(row.title),
      genre: String(row.genre),
      eventDate: String(row.event_date),
      notes: String(row.notes),
      status: row.status === "ready" || row.status === "performed" ? row.status : "draft",
      tracks: setTracks.get(String(row.id)) ?? [],
      shareToken: shares.get(String(row.id)) ?? null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      revision: Number(row.revision),
    })),
    transitions: transitionResult.results.map((row) => ({
      id: String(row.id),
      audioSettings: extensions.audioSettings.get(String(row.id)) ?? null,
      fromTrackId: row.from_track_id === null ? null : String(row.from_track_id),
      toTrackId: row.to_track_id === null ? null : String(row.to_track_id),
      fromLabel: String(row.from_label),
      toLabel: String(row.to_label),
      transitionType: String(row.transition_type),
      mixOutPoint: String(row.mix_out_point),
      mixInPoint: String(row.mix_in_point),
      eqTechnique: String(row.eq_technique),
      fxNotes: String(row.fx_notes),
      timingNotes: String(row.timing_notes),
      notes: String(row.notes),
      rating: Number(row.rating),
      difficulty: Number(row.difficulty),
      practiceStatus:
        row.practice_status === "practice" || row.practice_status === "ready"
          ? row.practice_status
          : "idea",
      lastPracticed: String(row.last_practiced),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      revision: Number(row.revision),
    })),
    meta: {
      migratedLegacySets: importedSets ?? 0,
      schemaVersion: SCHEMA_VERSION,
    },
  };
  for (const crate of workspace.crates) {
    crate.rules = extensions.rules.get(crate.id) ?? null;
    if (crate.rules) crate.trackIds = workspace.tracks.filter((track) => matchesRule(track, crate.rules!)).map((track) => track.id);
  }
  return workspace;
}

async function assertOwned(ownerId: string, table: string, id: string) {
  const allowed = new Set(["tracks", "crates", "mix_sets", "transitions"]);
  if (!allowed.has(table)) throw new WorkspaceError("Geçersiz kayıt türü.", 400);
  const row = await database()
    .prepare(`SELECT id FROM ${table} WHERE owner_id = ? AND id = ?`)
    .bind(ownerId, id)
    .first<{ id: string }>();
  if (!row) throw new WorkspaceError("Kayıt bulunamadı.", 404);
}

function primarySourceId(trackId: string) {
  return `${trackId}:primary`;
}

export async function createTrack(ownerId: string, input: TrackInput) {
  const db = database();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const statements = [
    db
      .prepare(
        `INSERT INTO tracks
        (owner_id, id, title, artist, version, bpm, musical_key, genre, subgenre, energy, rating, tags, origin,
        notes, cue_notes, intro_notes, outro_notes, duration_seconds, label, date_added, updated_at, revision)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      )
      .bind(
        ownerId,
        id,
        input.title,
        input.artist,
        input.version,
        input.bpm,
        input.musicalKey,
        input.genre,
        input.subgenre,
        input.energy,
        input.rating,
        JSON.stringify(input.tags),
        input.origin,
        input.notes,
        input.cueNotes,
        input.introNotes,
        input.outroNotes,
        input.durationSeconds,
        input.label,
        now,
        now,
      ),
  ];

  if (input.sourceProvider || input.sourceUrl) {
    statements.push(
      db
        .prepare(
          `INSERT INTO track_sources
          (owner_id, id, track_id, provider, external_id, external_url, availability, purchase_url, created_at)
          VALUES (?, ?, ?, ?, '', ?, 'reference', '', ?)`,
        )
        .bind(ownerId, primarySourceId(id), id, input.sourceProvider || "Web", input.sourceUrl, now),
    );
  }
  if (input.linkMetadata) statements.push(db.prepare("INSERT INTO track_link_metadata (owner_id,track_id,payload) VALUES (?,?,?)").bind(ownerId,id,JSON.stringify(input.linkMetadata)));
  await db.batch(statements);
}

export async function updateTrack(ownerId: string, id: string, expectedRevision: number, input: TrackInput) {
  const db = database();
  const now = new Date().toISOString();
  const result = await db
    .prepare(
      `UPDATE tracks SET title=?, artist=?, version=?, bpm=?, musical_key=?, genre=?, subgenre=?, energy=?, rating=?,
      tags=?, origin=?, notes=?, cue_notes=?, intro_notes=?, outro_notes=?, duration_seconds=?, label=?, updated_at=?,
      revision=revision+1 WHERE owner_id=? AND id=? AND revision=?`,
    )
    .bind(
      input.title,
      input.artist,
      input.version,
      input.bpm,
      input.musicalKey,
      input.genre,
      input.subgenre,
      input.energy,
      input.rating,
      JSON.stringify(input.tags),
      input.origin,
      input.notes,
      input.cueNotes,
      input.introNotes,
      input.outroNotes,
      input.durationSeconds,
      input.label,
      now,
      ownerId,
      id,
      expectedRevision,
    )
    .run();
  if (!result.meta.changes) throw new WorkspaceError("Parça başka bir sekmede değişti. Sayfayı yenile.", 409);

  if (input.sourceProvider || input.sourceUrl) {
    await db
      .prepare(
        `INSERT INTO track_sources
        (owner_id, id, track_id, provider, external_id, external_url, availability, purchase_url, created_at)
        VALUES (?, ?, ?, ?, '', ?, 'reference', '', ?)
        ON CONFLICT(owner_id, id) DO UPDATE SET provider=excluded.provider, external_url=excluded.external_url`,
      )
      .bind(ownerId, primarySourceId(id), id, input.sourceProvider || "Web", input.sourceUrl, now)
      .run();
  } else {
    await db
      .prepare("DELETE FROM track_sources WHERE owner_id=? AND id=?")
      .bind(ownerId, primarySourceId(id))
      .run();
  }
  if (input.linkMetadata !== undefined) {
    if (input.linkMetadata) await db.prepare("INSERT INTO track_link_metadata (owner_id,track_id,payload) VALUES (?,?,?) ON CONFLICT(owner_id,track_id) DO UPDATE SET payload=excluded.payload").bind(ownerId,id,JSON.stringify(input.linkMetadata)).run();
    else await db.prepare("DELETE FROM track_link_metadata WHERE owner_id=? AND track_id=?").bind(ownerId,id).run();
  }
}

export async function deleteTrack(ownerId: string, id: string, expectedRevision: number) {
  const db = database();
  const result = await db
    .prepare("DELETE FROM tracks WHERE owner_id=? AND id=? AND revision=?")
    .bind(ownerId, id, expectedRevision)
    .run();
  if (!result.meta.changes) throw new WorkspaceError("Parça değişmiş veya silinmiş. Sayfayı yenile.", 409);
  await db.batch([
    db.prepare("DELETE FROM transition_audio_settings WHERE owner_id=? AND transition_id IN (SELECT id FROM transitions WHERE owner_id=? AND (from_track_id=? OR to_track_id=?))").bind(ownerId,ownerId,id,id),
    db.prepare("DELETE FROM track_link_metadata WHERE owner_id=? AND track_id=?").bind(ownerId,id),
    db.prepare("DELETE FROM track_sources WHERE owner_id=? AND track_id=?").bind(ownerId, id),
    db.prepare("DELETE FROM crate_tracks WHERE owner_id=? AND track_id=?").bind(ownerId, id),
    db.prepare("DELETE FROM set_tracks WHERE owner_id=? AND track_id=?").bind(ownerId, id),
    db
      .prepare("DELETE FROM transitions WHERE owner_id=? AND (from_track_id=? OR to_track_id=?)")
      .bind(ownerId, id, id),
  ]);
}

export async function createCrate(ownerId: string, input: CrateInput) {
  const db=database(), id=crypto.randomUUID(), now=new Date().toISOString();
  const statements=[db.prepare("INSERT INTO crates (owner_id,id,name,description,created_at,updated_at,revision) VALUES (?,?,?,?,?,?,1)").bind(ownerId,id,input.name,input.description,now,now)];
  if(input.rules)statements.push(db.prepare("INSERT INTO smart_crate_rules (owner_id,crate_id,payload) VALUES (?,?,?)").bind(ownerId,id,JSON.stringify(input.rules)));
  await db.batch(statements);
}

export async function updateCrate(ownerId:string,id:string,expectedRevision:number,input:CrateInput) {
  const db=database(), now=new Date().toISOString();
  // Guard rule mutations with the same old revision; update the parent last in the atomic batch.
  const guard="EXISTS (SELECT 1 FROM crates WHERE owner_id=? AND id=? AND revision=?)";
  const statements=[db.prepare(`DELETE FROM smart_crate_rules WHERE owner_id=? AND crate_id=? AND ${guard}`).bind(ownerId,id,ownerId,id,expectedRevision)];
  if(input.rules)statements.push(db.prepare(`INSERT INTO smart_crate_rules (owner_id,crate_id,payload) SELECT ?,?,? WHERE ${guard}`).bind(ownerId,id,JSON.stringify(input.rules),ownerId,id,expectedRevision));
  statements.push(db.prepare("UPDATE crates SET name=?,description=?,updated_at=?,revision=revision+1 WHERE owner_id=? AND id=? AND revision=?").bind(input.name,input.description,now,ownerId,id,expectedRevision));
  const results=await db.batch(statements);
  if(!results[results.length-1].meta.changes)throw new WorkspaceError("Crate başka bir sekmede değişti. Sayfayı yenile.",409);
}

export async function deleteCrate(ownerId: string, id: string, expectedRevision: number) {
  const db = database();
  const result = await db
    .prepare("DELETE FROM crates WHERE owner_id=? AND id=? AND revision=?")
    .bind(ownerId, id, expectedRevision)
    .run();
  if (!result.meta.changes) throw new WorkspaceError("Crate değişmiş veya silinmiş.", 409);
  await db.batch([db.prepare("DELETE FROM crate_tracks WHERE owner_id=? AND crate_id=?").bind(ownerId, id), db.prepare("DELETE FROM smart_crate_rules WHERE owner_id=? AND crate_id=?").bind(ownerId, id)]);
}

export async function addTrackToCrate(ownerId: string, crateId: string, trackId: string) {
  if (await database().prepare("SELECT crate_id FROM smart_crate_rules WHERE owner_id=? AND crate_id=?").bind(ownerId,crateId).first()) throw new WorkspaceError("Smart Crate içeriği kurallarla belirlenir.");
  await Promise.all([assertOwned(ownerId, "crates", crateId), assertOwned(ownerId, "tracks", trackId)]);
  const db = database();
  const next = await db
    .prepare("SELECT COALESCE(MAX(position), -1) + 1 AS next FROM crate_tracks WHERE owner_id=? AND crate_id=?")
    .bind(ownerId, crateId)
    .first<{ next: number }>();
  await db
    .prepare(
      "INSERT OR IGNORE INTO crate_tracks (owner_id,crate_id,track_id,position,added_at) VALUES (?,?,?,?,?)",
    )
    .bind(ownerId, crateId, trackId, Number(next?.next ?? 0), new Date().toISOString())
    .run();
}

export async function removeTrackFromCrate(ownerId: string, crateId: string, trackId: string) {
  await database()
    .prepare("DELETE FROM crate_tracks WHERE owner_id=? AND crate_id=? AND track_id=?")
    .bind(ownerId, crateId, trackId)
    .run();
}

export async function createSet(ownerId: string, input: SetInput, trackIds: string[] = []) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const db = database();
  const unique = [...new Set(trackIds)];
  // D1 caps bound parameters per query, so ownership is checked in chunks.
  for (let start = 0; start < unique.length; start += 90) {
    const chunk = unique.slice(start, start + 90);
    const owned = await db
      .prepare(`SELECT id FROM tracks WHERE owner_id=? AND id IN (${chunk.map(() => "?").join(",")})`)
      .bind(ownerId, ...chunk)
      .all<{ id: string }>();
    if (owned.results.length !== chunk.length) throw new WorkspaceError("Parçalardan biri bulunamadı. Sayfayı yenile.", 404);
  }
  await db.batch([
    db
      .prepare(
        `INSERT INTO mix_sets
        (owner_id,id,title,genre,event_date,notes,status,created_at,updated_at,revision)
        VALUES (?,?,?,?,?,?,?,?,?,1)`,
      )
      .bind(ownerId, id, input.title, input.genre, input.eventDate, input.notes, input.status, now, now),
    ...unique.map((trackId, position) =>
      db
        .prepare("INSERT INTO set_tracks (owner_id,set_id,track_id,position,notes,added_at) VALUES (?,?,?,?,?,?)")
        .bind(ownerId, id, trackId, position, "", now),
    ),
  ]);
  return id;
}

export async function updateSet(
  ownerId: string,
  id: string,
  expectedRevision: number,
  input: SetInput,
) {
  const result = await database()
    .prepare(
      `UPDATE mix_sets SET title=?,genre=?,event_date=?,notes=?,status=?,updated_at=?,revision=revision+1
      WHERE owner_id=? AND id=? AND revision=?`,
    )
    .bind(
      input.title,
      input.genre,
      input.eventDate,
      input.notes,
      input.status,
      new Date().toISOString(),
      ownerId,
      id,
      expectedRevision,
    )
    .run();
  if (!result.meta.changes) throw new WorkspaceError("Set başka bir sekmede değişti. Sayfayı yenile.", 409);
}

export async function deleteSet(ownerId: string, id: string, expectedRevision: number) {
  const db = database();
  const result = await db
    .prepare("DELETE FROM mix_sets WHERE owner_id=? AND id=? AND revision=?")
    .bind(ownerId, id, expectedRevision)
    .run();
  if (!result.meta.changes) throw new WorkspaceError("Set değişmiş veya silinmiş.", 409);
  await db.prepare("DELETE FROM set_tracks WHERE owner_id=? AND set_id=?").bind(ownerId, id).run();
  await db.prepare("DELETE FROM set_shares WHERE owner_id=? AND set_id=?").bind(ownerId, id).run();
}

export async function addTrackToSet(ownerId: string, setId: string, trackId: string) {
  await Promise.all([assertOwned(ownerId, "mix_sets", setId), assertOwned(ownerId, "tracks", trackId)]);
  const db = database();
  const next = await db
    .prepare("SELECT COALESCE(MAX(position), -1) + 1 AS next FROM set_tracks WHERE owner_id=? AND set_id=?")
    .bind(ownerId, setId)
    .first<{ next: number }>();
  await db
    .prepare(
      "INSERT OR IGNORE INTO set_tracks (owner_id,set_id,track_id,position,notes,added_at) VALUES (?,?,?,?,?,?)",
    )
    .bind(ownerId, setId, trackId, Number(next?.next ?? 0), "", new Date().toISOString())
    .run();
}

export async function removeTrackFromSet(ownerId: string, setId: string, trackId: string) {
  await database()
    .prepare("DELETE FROM set_tracks WHERE owner_id=? AND set_id=? AND track_id=?")
    .bind(ownerId, setId, trackId)
    .run();
}

export async function reorderSet(ownerId: string, setId: string, trackIds: string[]) {
  await assertOwned(ownerId, "mix_sets", setId);
  const db = database();
  const current = await db
    .prepare("SELECT track_id FROM set_tracks WHERE owner_id=? AND set_id=? ORDER BY position")
    .bind(ownerId, setId)
    .all<{ track_id: string }>();
  const existing = new Set(current.results.map((row) => row.track_id));
  if (trackIds.length !== existing.size || trackIds.some((id) => !existing.has(id))) {
    throw new WorkspaceError("Set sırası güncel değil. Sayfayı yenile.", 409);
  }
  await db.batch(
    trackIds.map((trackId, position) =>
      db
        .prepare("UPDATE set_tracks SET position=? WHERE owner_id=? AND set_id=? AND track_id=?")
        .bind(position, ownerId, setId, trackId),
    ),
  );
  await db
    .prepare("UPDATE mix_sets SET updated_at=?,revision=revision+1 WHERE owner_id=? AND id=?")
    .bind(new Date().toISOString(), ownerId, setId)
    .run();
}

export async function createTransition(ownerId: string, input: TransitionInput) {
  if (!input.fromTrackId || !input.toTrackId || input.fromTrackId === input.toTrackId) {
    throw new WorkspaceError("Geçiş için iki farklı parça seç.", 400);
  }
  await Promise.all([
    assertOwned(ownerId, "tracks", input.fromTrackId),
    assertOwned(ownerId, "tracks", input.toTrackId),
  ]);
  const db = database();
  const [from, to] = await Promise.all([
    db
      .prepare("SELECT title FROM tracks WHERE owner_id=? AND id=?")
      .bind(ownerId, input.fromTrackId)
      .first<{ title: string }>(),
    db
      .prepare("SELECT title FROM tracks WHERE owner_id=? AND id=?")
      .bind(ownerId, input.toTrackId)
      .first<{ title: string }>(),
  ]);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const statement = db
    .prepare(
      `INSERT INTO transitions
      (owner_id,id,from_track_id,to_track_id,from_label,to_label,transition_type,mix_out_point,mix_in_point,
      eq_technique,fx_notes,timing_notes,notes,rating,difficulty,practice_status,last_practiced,created_at,updated_at,revision)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
    )
    .bind(
      ownerId,
      id,
      input.fromTrackId,
      input.toTrackId,
      from?.title ?? "",
      to?.title ?? "",
      input.transitionType,
      input.mixOutPoint,
      input.mixInPoint,
      input.eqTechnique,
      input.fxNotes,
      input.timingNotes,
      input.notes,
      input.rating,
      input.difficulty,
      input.practiceStatus,
      input.lastPracticed,
      now,
      now,
    );
  const statements = [statement];
  if(input.audioSettings) statements.push(db.prepare("INSERT INTO transition_audio_settings (owner_id,transition_id,payload) VALUES (?,?,?)").bind(ownerId,id,JSON.stringify(input.audioSettings)));
  await db.batch(statements);
}

export async function updateTransition(
  ownerId: string,
  id: string,
  expectedRevision: number,
  input: TransitionInput,
) {
  if (!input.fromTrackId || !input.toTrackId || input.fromTrackId === input.toTrackId) {
    throw new WorkspaceError("Geçiş için iki farklı parça seç.", 400);
  }
  await Promise.all([
    assertOwned(ownerId, "tracks", input.fromTrackId),
    assertOwned(ownerId, "tracks", input.toTrackId),
  ]);
  const db = database();
  const [from, to] = await Promise.all([
    db
      .prepare("SELECT title FROM tracks WHERE owner_id=? AND id=?")
      .bind(ownerId, input.fromTrackId)
      .first<{ title: string }>(),
    db
      .prepare("SELECT title FROM tracks WHERE owner_id=? AND id=?")
      .bind(ownerId, input.toTrackId)
      .first<{ title: string }>(),
  ]);
  const parent = db
    .prepare(
      `UPDATE transitions SET from_track_id=?,to_track_id=?,from_label=?,to_label=?,transition_type=?,mix_out_point=?,
      mix_in_point=?,eq_technique=?,fx_notes=?,timing_notes=?,notes=?,rating=?,difficulty=?,practice_status=?,
      last_practiced=?,updated_at=?,revision=revision+1 WHERE owner_id=? AND id=? AND revision=?`,
    )
    .bind(
      input.fromTrackId,
      input.toTrackId,
      from?.title ?? "",
      to?.title ?? "",
      input.transitionType,
      input.mixOutPoint,
      input.mixInPoint,
      input.eqTechnique,
      input.fxNotes,
      input.timingNotes,
      input.notes,
      input.rating,
      input.difficulty,
      input.practiceStatus,
      input.lastPracticed,
      new Date().toISOString(),
      ownerId,
      id,
      expectedRevision,
    );
  const statements: D1PreparedStatement[] = [];
  const guard = "EXISTS (SELECT 1 FROM transitions WHERE owner_id=? AND id=? AND revision=?)";
  if(input.audioSettings !== undefined) {
    statements.push(db.prepare(`DELETE FROM transition_audio_settings WHERE owner_id=? AND transition_id=? AND ${guard}`).bind(ownerId,id,ownerId,id,expectedRevision));
    if(input.audioSettings) statements.push(db.prepare(`INSERT INTO transition_audio_settings (owner_id,transition_id,payload) SELECT ?,?,? WHERE ${guard}`).bind(ownerId,id,JSON.stringify(input.audioSettings),ownerId,id,expectedRevision));
  }
  statements.push(parent);
  const results = await db.batch(statements);
  if(!results[results.length-1].meta.changes) throw new WorkspaceError("Geçiş başka bir sekmede değişti. Sayfayı yenile.",409);
}

export async function deleteTransition(ownerId: string, id: string, expectedRevision: number) {
  const result = await database()
    .prepare("DELETE FROM transitions WHERE owner_id=? AND id=? AND revision=?")
    .bind(ownerId, id, expectedRevision)
    .run();
  if (!result.meta.changes) throw new WorkspaceError("Geçiş değişmiş veya silinmiş.", 409);
  await database().prepare("DELETE FROM transition_audio_settings WHERE owner_id=? AND transition_id=?").bind(ownerId,id).run();
}
