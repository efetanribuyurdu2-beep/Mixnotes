CREATE TABLE IF NOT EXISTS `dj_sets_v1_backup` (
	`id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`revision` integer NOT NULL,
	`updated` text NOT NULL,
	`backed_up_at` text NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO `dj_sets_v1_backup` (`id`,`payload`,`revision`,`updated`,`backed_up_at`)
SELECT `id`,`payload`,`revision`,`updated`,datetime('now') FROM `dj_sets`;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `app_migrations` (`owner_id` text NOT NULL,`migration_key` text NOT NULL,`applied_at` text NOT NULL,`details` text DEFAULT '{}' NOT NULL,PRIMARY KEY(`owner_id`,`migration_key`));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `tracks` (`owner_id` text NOT NULL,`id` text NOT NULL,`title` text NOT NULL,`artist` text DEFAULT '' NOT NULL,`version` text DEFAULT '' NOT NULL,`bpm` real,`musical_key` text DEFAULT '' NOT NULL,`genre` text DEFAULT '' NOT NULL,`subgenre` text DEFAULT '' NOT NULL,`energy` integer,`rating` integer DEFAULT 0 NOT NULL,`tags` text DEFAULT '[]' NOT NULL,`origin` text DEFAULT 'discovery' NOT NULL,`notes` text DEFAULT '' NOT NULL,`cue_notes` text DEFAULT '' NOT NULL,`intro_notes` text DEFAULT '' NOT NULL,`outro_notes` text DEFAULT '' NOT NULL,`duration_seconds` integer,`label` text DEFAULT '' NOT NULL,`date_added` text NOT NULL,`updated_at` text NOT NULL,`revision` integer DEFAULT 1 NOT NULL,PRIMARY KEY(`owner_id`,`id`));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `track_sources` (`owner_id` text NOT NULL,`id` text NOT NULL,`track_id` text NOT NULL,`provider` text NOT NULL,`external_id` text DEFAULT '' NOT NULL,`external_url` text DEFAULT '' NOT NULL,`availability` text DEFAULT 'reference' NOT NULL,`purchase_url` text DEFAULT '' NOT NULL,`created_at` text NOT NULL,PRIMARY KEY(`owner_id`,`id`));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `crates` (`owner_id` text NOT NULL,`id` text NOT NULL,`name` text NOT NULL,`description` text DEFAULT '' NOT NULL,`created_at` text NOT NULL,`updated_at` text NOT NULL,`revision` integer DEFAULT 1 NOT NULL,PRIMARY KEY(`owner_id`,`id`));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `crate_tracks` (`owner_id` text NOT NULL,`crate_id` text NOT NULL,`track_id` text NOT NULL,`position` integer DEFAULT 0 NOT NULL,`added_at` text NOT NULL,PRIMARY KEY(`owner_id`,`crate_id`,`track_id`));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `mix_sets` (`owner_id` text NOT NULL,`id` text NOT NULL,`title` text NOT NULL,`genre` text DEFAULT '' NOT NULL,`event_date` text DEFAULT '' NOT NULL,`notes` text DEFAULT '' NOT NULL,`status` text DEFAULT 'draft' NOT NULL,`created_at` text NOT NULL,`updated_at` text NOT NULL,`revision` integer DEFAULT 1 NOT NULL,PRIMARY KEY(`owner_id`,`id`));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `set_tracks` (`owner_id` text NOT NULL,`set_id` text NOT NULL,`track_id` text NOT NULL,`position` integer NOT NULL,`notes` text DEFAULT '' NOT NULL,`added_at` text NOT NULL,PRIMARY KEY(`owner_id`,`set_id`,`track_id`));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `transitions` (`owner_id` text NOT NULL,`id` text NOT NULL,`from_track_id` text,`to_track_id` text,`from_label` text DEFAULT '' NOT NULL,`to_label` text DEFAULT '' NOT NULL,`transition_type` text DEFAULT '' NOT NULL,`mix_out_point` text DEFAULT '' NOT NULL,`mix_in_point` text DEFAULT '' NOT NULL,`eq_technique` text DEFAULT '' NOT NULL,`fx_notes` text DEFAULT '' NOT NULL,`timing_notes` text DEFAULT '' NOT NULL,`notes` text DEFAULT '' NOT NULL,`rating` integer DEFAULT 0 NOT NULL,`difficulty` integer DEFAULT 0 NOT NULL,`practice_status` text DEFAULT 'idea' NOT NULL,`last_practiced` text DEFAULT '' NOT NULL,`created_at` text NOT NULL,`updated_at` text NOT NULL,`revision` integer DEFAULT 1 NOT NULL,PRIMARY KEY(`owner_id`,`id`));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `tracks_owner_updated_idx` ON `tracks` (`owner_id`,`updated_at`);
CREATE INDEX IF NOT EXISTS `tracks_owner_title_idx` ON `tracks` (`owner_id`,`title`);
CREATE INDEX IF NOT EXISTS `sources_owner_track_idx` ON `track_sources` (`owner_id`,`track_id`);
CREATE INDEX IF NOT EXISTS `crate_tracks_owner_crate_idx` ON `crate_tracks` (`owner_id`,`crate_id`,`position`);
CREATE INDEX IF NOT EXISTS `set_tracks_owner_set_idx` ON `set_tracks` (`owner_id`,`set_id`,`position`);
CREATE INDEX IF NOT EXISTS `transitions_owner_pair_idx` ON `transitions` (`owner_id`,`from_track_id`,`to_track_id`);
