CREATE TABLE `battles` (
	`id` integer NOT NULL,
	`server` text NOT NULL,
	`guild_id` text NOT NULL,
	`types` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`id`, `server`, `guild_id`),
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `battles_id_server_guild_idx` ON `battles` (`id`,`server`,`guild_id`);--> statement-breakpoint
CREATE TABLE `regear_applies` (
	`id` text PRIMARY KEY NOT NULL,
	`msg_id` text NOT NULL,
	`msg_username` text,
	`msg_userid` text,
	`msg_guild` text,
	`msg_channel` text,
	`create_time` text NOT NULL,
	`last_status_time` text NOT NULL,
	`regear_id` text,
	`apply_meta` text,
	`status` text DEFAULT 'binding' NOT NULL,
	`victim_name` text,
	`victim_guild` text,
	`apply_detail` text
);
--> statement-breakpoint
ALTER TABLE `regears` ADD `battle_id` text;