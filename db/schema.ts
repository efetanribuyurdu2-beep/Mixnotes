import { integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const legacySets = sqliteTable("dj_sets", {
  id: text("id").primaryKey(),
  payload: text("payload").notNull(),
  revision: integer("revision").notNull().default(1),
  updated: text("updated").notNull(),
});

export const legacyImportClaims = sqliteTable("legacy_import_claims", {
  sourceKey: text("source_key").primaryKey(),
  ownerId: text("owner_id").notNull(),
  claimedAt: text("claimed_at").notNull(),
});

export const tracks = sqliteTable(
  "tracks",
  {
    ownerId: text("owner_id").notNull(),
    id: text("id").notNull(),
    title: text("title").notNull(),
    artist: text("artist").notNull().default(""),
    version: text("version").notNull().default(""),
    bpm: real("bpm"),
    musicalKey: text("musical_key").notNull().default(""),
    genre: text("genre").notNull().default(""),
    subgenre: text("subgenre").notNull().default(""),
    energy: integer("energy"),
    rating: integer("rating").notNull().default(0),
    tags: text("tags").notNull().default("[]"),
    origin: text("origin").notNull().default("discovery"),
    notes: text("notes").notNull().default(""),
    cueNotes: text("cue_notes").notNull().default(""),
    introNotes: text("intro_notes").notNull().default(""),
    outroNotes: text("outro_notes").notNull().default(""),
    durationSeconds: integer("duration_seconds"),
    label: text("label").notNull().default(""),
    dateAdded: text("date_added").notNull(),
    updatedAt: text("updated_at").notNull(),
    revision: integer("revision").notNull().default(1),
  },
  (table) => [primaryKey({ columns: [table.ownerId, table.id] })],
);

export const trackSources = sqliteTable(
  "track_sources",
  {
    ownerId: text("owner_id").notNull(),
    id: text("id").notNull(),
    trackId: text("track_id").notNull(),
    provider: text("provider").notNull(),
    externalId: text("external_id").notNull().default(""),
    externalUrl: text("external_url").notNull().default(""),
    availability: text("availability").notNull().default("reference"),
    purchaseUrl: text("purchase_url").notNull().default(""),
    createdAt: text("created_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.ownerId, table.id] })],
);

export const crates = sqliteTable(
  "crates",
  {
    ownerId: text("owner_id").notNull(),
    id: text("id").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    revision: integer("revision").notNull().default(1),
  },
  (table) => [primaryKey({ columns: [table.ownerId, table.id] })],
);

export const crateTracks = sqliteTable(
  "crate_tracks",
  {
    ownerId: text("owner_id").notNull(),
    crateId: text("crate_id").notNull(),
    trackId: text("track_id").notNull(),
    position: integer("position").notNull().default(0),
    addedAt: text("added_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.ownerId, table.crateId, table.trackId] })],
);

export const mixSets = sqliteTable(
  "mix_sets",
  {
    ownerId: text("owner_id").notNull(),
    id: text("id").notNull(),
    title: text("title").notNull(),
    genre: text("genre").notNull().default(""),
    eventDate: text("event_date").notNull().default(""),
    notes: text("notes").notNull().default(""),
    status: text("status").notNull().default("draft"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    revision: integer("revision").notNull().default(1),
  },
  (table) => [primaryKey({ columns: [table.ownerId, table.id] })],
);

export const setTracks = sqliteTable(
  "set_tracks",
  {
    ownerId: text("owner_id").notNull(),
    setId: text("set_id").notNull(),
    trackId: text("track_id").notNull(),
    position: integer("position").notNull(),
    notes: text("notes").notNull().default(""),
    addedAt: text("added_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.ownerId, table.setId, table.trackId] })],
);

export const transitions = sqliteTable(
  "transitions",
  {
    ownerId: text("owner_id").notNull(),
    id: text("id").notNull(),
    fromTrackId: text("from_track_id"),
    toTrackId: text("to_track_id"),
    fromLabel: text("from_label").notNull().default(""),
    toLabel: text("to_label").notNull().default(""),
    transitionType: text("transition_type").notNull().default(""),
    mixOutPoint: text("mix_out_point").notNull().default(""),
    mixInPoint: text("mix_in_point").notNull().default(""),
    eqTechnique: text("eq_technique").notNull().default(""),
    fxNotes: text("fx_notes").notNull().default(""),
    timingNotes: text("timing_notes").notNull().default(""),
    notes: text("notes").notNull().default(""),
    rating: integer("rating").notNull().default(0),
    difficulty: integer("difficulty").notNull().default(0),
    practiceStatus: text("practice_status").notNull().default("idea"),
    lastPracticed: text("last_practiced").notNull().default(""),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    revision: integer("revision").notNull().default(1),
  },
  (table) => [primaryKey({ columns: [table.ownerId, table.id] })],
);

export const smartCrateRules = sqliteTable("smart_crate_rules", {
  ownerId:text("owner_id").notNull(),crateId:text("crate_id").notNull(),payload:text("payload").notNull(),
},table=>[primaryKey({columns:[table.ownerId,table.crateId]})]);
export const practiceSessions = sqliteTable("practice_sessions", {
  ownerId:text("owner_id").notNull(),id:text("id").notNull(),payload:text("payload").notNull(),createdAt:text("created_at").notNull(),
},table=>[primaryKey({columns:[table.ownerId,table.id]})]);
export const workspaceImports = sqliteTable("workspace_imports", {
  ownerId:text("owner_id").notNull(),digest:text("digest").notNull(),
},table=>[primaryKey({columns:[table.ownerId,table.digest]})]);

export const studioNotebooks=sqliteTable('studio_notebooks',{ownerId:text('owner_id').primaryKey(),payload:text('payload').notNull(),revision:integer('revision').notNull().default(1)});
export const stemJobs=sqliteTable('stem_jobs',{id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),createdAt:text('created_at').notNull()});
export const cloudAudio=sqliteTable('cloud_audio',{ownerId:text('owner_id').notNull(),trackId:text('track_id').notNull(),size:integer('size').notNull(),name:text('name').notNull(),status:text('status').notNull().default('pending')},t=>[primaryKey({columns:[t.ownerId,t.trackId]})]);

export const planSettings=sqliteTable('plan_settings',{id:text('id').primaryKey(),payload:text('payload').notNull(),revision:integer('revision').notNull().default(1)});
export const spotifySettings=sqliteTable('spotify_settings',{id:text('id').primaryKey(),clientId:text('client_id').notNull()});
export const spotifyConnections=sqliteTable('spotify_connections',{ownerId:text('owner_id').primaryKey(),payload:text('payload').notNull(),updatedAt:text('updated_at').notNull()});
export const setShares=sqliteTable('set_shares',{token:text('token').primaryKey(),ownerId:text('owner_id').notNull(),setId:text('set_id').notNull(),createdAt:text('created_at').notNull()},t=>[uniqueIndex('set_shares_owner_set_idx').on(t.ownerId,t.setId)]);
export const subscriptions=sqliteTable('subscriptions',{ownerId:text('owner_id').primaryKey(),customerId:text('customer_id').notNull(),subscriptionId:text('subscription_id').notNull().default(''),status:text('status').notNull().default('incomplete'),interval:text('interval').notNull().default(''),currentPeriodEnd:integer('current_period_end').notNull().default(0),updatedAt:text('updated_at').notNull()},t=>[uniqueIndex('subscriptions_customer_idx').on(t.customerId)]);
