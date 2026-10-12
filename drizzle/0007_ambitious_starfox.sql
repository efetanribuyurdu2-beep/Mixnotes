CREATE TABLE IF NOT EXISTS `set_shares` (
	`token` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`set_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `set_shares_owner_set_idx` ON `set_shares` (`owner_id`,`set_id`);