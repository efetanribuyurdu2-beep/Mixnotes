import { database } from "@/db/raw";

export const shareSchemaStatements = [
  `CREATE TABLE IF NOT EXISTS set_shares (token TEXT PRIMARY KEY NOT NULL, owner_id TEXT NOT NULL, set_id TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS set_shares_owner_set_idx ON set_shares (owner_id, set_id)`,
];

export class ShareError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function shareSet(ownerId: string, setId: string) {
  const db = database();
  const owned = await db.prepare("SELECT id FROM mix_sets WHERE owner_id=? AND id=?").bind(ownerId, setId).first();
  if (!owned) throw new ShareError("Set bulunamadı.", 404);
  // One live link per set; sharing again keeps the existing link working.
  await db.prepare("INSERT OR IGNORE INTO set_shares (token,owner_id,set_id,created_at) VALUES (?,?,?,?)").bind(newToken(), ownerId, setId, new Date().toISOString()).run();
}

export async function unshareSet(ownerId: string, setId: string) {
  await database().prepare("DELETE FROM set_shares WHERE owner_id=? AND set_id=?").bind(ownerId, setId).run();
}

export async function shareTokens(ownerId: string) {
  const rows = await database().prepare("SELECT set_id, token FROM set_shares WHERE owner_id=?").bind(ownerId).all<{ set_id: string; token: string }>();
  return new Map(rows.results.map((row) => [row.set_id, row.token]));
}

export type SharedSet = {
  title: string;
  genre: string;
  eventDate: string;
  status: string;
  tracks: { title: string; artist: string; version: string; bpm: number | null; musicalKey: string; durationSeconds: number | null; energy: number | null }[];
};

// Public read: only titles and musical metadata. Notes, cues, ratings and sources stay private.
export async function readSharedSet(token: string): Promise<SharedSet | null> {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const db = database();
  const share = await db.prepare("SELECT owner_id, set_id FROM set_shares WHERE token=?").bind(token).first<{ owner_id: string; set_id: string }>();
  if (!share) return null;
  const set = await db.prepare("SELECT title, genre, event_date, status FROM mix_sets WHERE owner_id=? AND id=?").bind(share.owner_id, share.set_id).first<{ title: string; genre: string; event_date: string; status: string }>();
  if (!set) return null;
  const tracks = await db
    .prepare(`SELECT t.title, t.artist, t.version, t.bpm, t.musical_key, t.duration_seconds, t.energy FROM set_tracks s
      JOIN tracks t ON t.owner_id = s.owner_id AND t.id = s.track_id
      WHERE s.owner_id=? AND s.set_id=? ORDER BY s.position ASC, s.added_at ASC`)
    .bind(share.owner_id, share.set_id)
    .all<{ title: string; artist: string; version: string; bpm: number | null; musical_key: string; duration_seconds: number | null; energy: number | null }>();
  return {
    title: set.title,
    genre: set.genre,
    eventDate: set.event_date,
    status: set.status,
    tracks: tracks.results.map((row) => ({ title: row.title, artist: row.artist, version: row.version, bpm: row.bpm === null ? null : Number(row.bpm), musicalKey: row.musical_key, durationSeconds: row.duration_seconds === null ? null : Number(row.duration_seconds), energy: row.energy === null ? null : Number(row.energy) })),
  };
}
