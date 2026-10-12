CREATE TABLE IF NOT EXISTS `subscriptions` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`subscription_id` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'incomplete' NOT NULL,
	`interval` text DEFAULT '' NOT NULL,
	`current_period_end` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `subscriptions_customer_idx` ON `subscriptions` (`customer_id`);