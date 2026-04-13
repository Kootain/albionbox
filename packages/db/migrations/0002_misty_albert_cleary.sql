CREATE TABLE `guild_settings` (
	`guild_id` text PRIMARY KEY NOT NULL,
	`regear_config` text,
	`chest_grid` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON UPDATE no action ON DELETE no action
);
