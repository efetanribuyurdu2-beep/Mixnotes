import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

test("packages the Preparation Core client and D1 binding", async () => {
  const manifest = JSON.parse(
    await readFile(path.join(root, "dist/client/.vite/manifest.json"), "utf8"),
  );
  const hosting = JSON.parse(
    await readFile(path.join(root, "dist/.openai/hosting.json"), "utf8"),
  );

  assert.ok(manifest["components/mixnotes/workspace-app.tsx"]);
  assert.equal(hosting.d1, "DB");
  assert.match(hosting.project_id, /^appgprj_/);
});

test("ships a reversible migration that preserves the legacy set table", async () => {
  const migration = await readFile(
    path.join(root, "dist/.openai/drizzle/0001_preparation_core_beta.sql"),
    "utf8",
  );

  assert.match(migration, /CREATE TABLE IF NOT EXISTS `dj_sets_v1_backup`/);
  assert.match(migration, /SELECT `id`,`payload`,`revision`,`updated`,datetime\('now'\) FROM `dj_sets`/);
  assert.match(migration, /PRIMARY KEY\(`owner_id`,`id`\)/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS `tracks`/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS `transitions`/);
  assert.doesNotMatch(migration, /\bDROP\s+TABLE\b/i);
  assert.doesNotMatch(migration, /\bDELETE\s+FROM\s+`?dj_sets`?\b/i);
});

test("ships a single-owner claim for legacy private data", async () => {
  const migration = await readFile(
    path.join(root, "dist/.openai/drizzle/0002_legacy_import_claim.sql"),
    "utf8",
  );

  assert.match(migration, /CREATE TABLE IF NOT EXISTS `legacy_import_claims`/);
  assert.match(migration, /`source_key` text PRIMARY KEY NOT NULL/);
  assert.match(migration, /`owner_id` text NOT NULL/);
});
