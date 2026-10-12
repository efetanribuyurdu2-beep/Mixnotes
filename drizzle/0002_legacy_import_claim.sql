CREATE TABLE IF NOT EXISTS `legacy_import_claims` (
	`source_key` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`claimed_at` text NOT NULL
);
