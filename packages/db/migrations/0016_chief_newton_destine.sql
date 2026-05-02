CREATE TABLE `settlement_cycles` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`ranking_ids` text NOT NULL,
	`config` text NOT NULL,
	`created_at` text NOT NULL,
	`created_by_user_id` text,
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `settlement_cycles_guild_id_idx` ON `settlement_cycles` (`guild_id`);--> statement-breakpoint
CREATE INDEX `settlement_cycles_guild_date_idx` ON `settlement_cycles` (`guild_id`,`start_date`,`end_date`);--> statement-breakpoint
CREATE TABLE `settlement_details` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`settlement_id` text NOT NULL,
	`recipient_key` text NOT NULL,
	`reward_type` text NOT NULL,
	`sub_type` text NOT NULL,
	`username` text,
	`platform_id` text,
	`platform_type` text,
	`coin_amount` integer NOT NULL,
	`is_paid` integer DEFAULT false NOT NULL,
	`paid_at` text,
	`paid_by_user_id` text,
	`detail` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`settlement_id`) REFERENCES `settlement_cycles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`paid_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `settlement_details_guild_id_idx` ON `settlement_details` (`guild_id`);--> statement-breakpoint
CREATE INDEX `settlement_details_settlement_id_idx` ON `settlement_details` (`settlement_id`);--> statement-breakpoint
CREATE INDEX `settlement_details_recipient_idx` ON `settlement_details` (`settlement_id`,`recipient_key`);--> statement-breakpoint
CREATE INDEX `settlement_details_reward_idx` ON `settlement_details` (`settlement_id`,`reward_type`,`sub_type`);--> statement-breakpoint
CREATE INDEX `settlement_details_paid_idx` ON `settlement_details` (`settlement_id`,`is_paid`);