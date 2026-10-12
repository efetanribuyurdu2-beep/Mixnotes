# MixNotes Preparation Core

## Product boundary

This milestone turns the original set notebook into a preparation workspace built around five connected concepts:

1. Track Library and discovery queue
2. Manual crates for candidate material
3. Ordered sets for performance preparation
4. Persistent track-to-track transition memory
5. Fast retrieval through filters and the command palette

This document describes the original Preparation Core milestone. The current Studio release adds provider search, rule-based recommendations, Smart Crates, session analytics and transfers; see [studio-release.md](studio-release.md) for the authoritative shipped scope. Authenticated paid-provider sync, full-track playback, billing and collaboration remain separate commercial-release work.

## Data ownership

Every V2 record has an `owner_id`. The value is a SHA-256 digest of the authenticated ChatGPT email header, so raw account email addresses are not stored in product tables. Every query and mutation includes this owner key.

The hosting access policy remains owner-only. API routes still enforce identity so widening site access later does not expose a shared global data set.

## Migration and rollback

The migration is additive:

- `dj_sets` remains unchanged.
- `dj_sets_v1_backup` takes an idempotent database-level copy before V2 data is used.
- New tables are created beside the legacy table.
- Each owner receives a one-time `legacy-dj-sets-v1` import marker.
- A global `legacy_import_claims` lock ensures that the private legacy data can be claimed by only one real account. Automated screenshot identities cannot claim it.
- Legacy tracks are kept separate unless they already share an ID. No uncertain title-based deduplication occurs.
- Legacy transition labels are preserved even when they cannot be reliably linked to track IDs.

Rolling back the deployed application version restores the original UI against the untouched `dj_sets` table. The new tables can remain in place safely.

## Runtime shape

- `GET /api/workspace` creates missing additive tables, performs the one-time import, and returns the authenticated user's workspace.
- `POST /api/workspace/action` validates a discriminated action with Zod and applies owner-scoped mutations.
- Revision fields protect edits against stale tabs.
- The last successful workspace response is cached in the browser for read-only access during a network interruption.
- User data can be exported as a versioned JSON backup from the top bar.

## Scale boundary

The current response loads the authenticated user's preparation data as one workspace document. This keeps the beta simple and responsive for an early library. Before broad release to libraries above several thousand tracks, add paginated track search, indexed server filtering, and row virtualization without changing the normalized storage model.
