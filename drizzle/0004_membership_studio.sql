CREATE TABLE `cloud_audio` (
	`owner_id` text NOT NULL,
	`track_id` text NOT NULL,
	`size` integer NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	PRIMARY KEY(`owner_id`, `track_id`)
);
--> statement-breakpoint
CREATE TABLE `stem_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `studio_notebooks` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL
);
