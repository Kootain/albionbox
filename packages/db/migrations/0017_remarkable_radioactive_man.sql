ALTER TABLE `guild_members` ADD `provider` text;--> statement-breakpoint
ALTER TABLE `guild_members` ADD `provider_id` text;--> statement-breakpoint
ALTER TABLE `guild_members` ADD `provider_name` text;--> statement-breakpoint
CREATE INDEX `guild_members_guild_id_idx` ON `guild_members` (`guild_id`);--> statement-breakpoint
CREATE INDEX `guild_members_guild_game_account_id_idx` ON `guild_members` (`guild_id`,`game_account_id`);--> statement-breakpoint
CREATE INDEX `guild_members_guild_provider_id_idx` ON `guild_members` (`guild_id`,`provider`,`provider_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `guild_members_guild_provider_identity_unique` ON `guild_members` (`guild_id`,`provider`,`provider_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `guild_members_guild_game_account_unique` ON `guild_members` (`guild_id`,`game_account_id`);