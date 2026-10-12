CREATE TABLE `spotify_connections` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `spotify_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL
);
