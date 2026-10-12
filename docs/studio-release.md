# MixNotes Studio — shipped scope

This release extends the existing owner-private Site and normalized D1 model. Existing track, set, crate and transition records remain intact. Schema version 4 adds smart_crate_rules, practice_sessions and workspace_imports. The additive SQL migration also runs through the idempotent runtime schema preparation.

## User workflows

- Discover: explicit iTunes catalog search (24 results, Turkish storefront), save metadata to the discovery queue, promote to Library without losing identity or notes. Provider timeouts and errors are visible, and missing BPM/key are never fabricated.
- Music sources: Beatport, Bandcamp, SoundCloud search links and BPM Supreme/DJcity account destinations. These are external links, not authenticated pool integrations. Multiple source references per track can be added with reference/owned/purchase/pool status.
- Smart Crates: conjunction of genre, tag, BPM range, minimum energy/rating and lifecycle rules, dynamically computed on workspace reads. Missing numeric metadata does not satisfy numeric rules. Manual membership is disabled for smart collections.
- Set Builder: explainable next-track suggestions from the personal Library, based on directed transition memory, BPM distance, Camelot adjacency, genre and energy. No claim of AI/audio analysis. Suggestions exclude discovery candidates and tracks already in the set. Printable text notes include order, BPM/key, cue notes and transition technique.
- Practice and Performance: persistent dated sessions, duration, rating, notes and optional set/transition association; summary statistics and filters. Transition last-practiced dates advance on sessions; a linked performance marks its set performed. Historical labels survive later record deletion.
- Import/Export: previewed CSV/TSV metadata import (200 rows); Rekordbox text-export column aliases; complete version-3/version-4 JSON backups including rules and sessions; Library CSV; individual set notes. File transfers do not include audio, beatgrids or proprietary cue formats.
- JSON restore: adds copies with remapped relationships, never overwrites existing data. A content receipt prevents repeat imports. D1 batch commits all records and receipt transactionally. Maximum 4 MB and 2000 generated SQL statements per restore. Older backups without sessions remain valid.

## Verification

TypeScript and production build; Node tests with real in-memory SQLite exercising owner isolation, rule recomputation, stale revision rejection, performance updates, reference remapping, transactional rollback and repeat import handling; provider route tests for authentication, metadata mapping and unavailable upstream. Real iTunes endpoint was reachable from the execution environment and returned valid metadata.

Browser UI verification is unavailable in this environment because the required control-browser skill is not installed. Responsive CSS and server-rendered checks are used; they do not substitute for touchscreen visual QA.

## External work still required

Direct pool account sync, authorized audio playback/download, Spotify/Beatport OAuth and proprietary DJ-library imports need the corresponding provider access/credentials and format work. No credentials are invented and no account access is simulated. Public signup independent of ChatGPT, payments, subscription enforcement, enterprise collaboration and a native mobile release remain commercial-release work, outside this functional Studio update.
