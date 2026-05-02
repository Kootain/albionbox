CREATE TABLE `guild_rankings` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`ranking_type` text NOT NULL,
	`collected_at` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `guild_rankings_type_idx` ON `guild_rankings` (`ranking_type`);--> statement-breakpoint
CREATE INDEX `guild_rankings_composite_idx` ON `guild_rankings` (`guild_id`,`ranking_type`,`collected_at`);