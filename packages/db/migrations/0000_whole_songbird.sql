CREATE TABLE `guild_binding_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guild_binding_tokens_token_unique` ON `guild_binding_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `guild_members` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`user_id` text,
	`game_account_id` text,
	`chest_x` integer,
	`chest_y` integer,
	`joined_at` text NOT NULL,
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`game_account_id`) REFERENCES `game_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "guild_members_at_least_one_identity" CHECK("guild_members"."user_id" IS NOT NULL OR "guild_members"."game_account_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE `guilds` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`albion_guild_id` text,
	`server` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`review_note` text,
	`owner_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `binding_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`username` text NOT NULL,
	`server` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`review_note` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `binding_tokens_token_unique` ON `binding_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `binding_tokens_user_id_idx` ON `binding_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `binding_tokens_username_server_userId_idx` ON `binding_tokens` (`username`,`server`,`user_id`);--> statement-breakpoint
CREATE TABLE `email_verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` text NOT NULL,
	`verified_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_verifications_token_unique` ON `email_verifications` (`token`);--> statement-breakpoint
CREATE TABLE `game_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`username` text NOT NULL,
	`albion_player_id` text DEFAULT '',
	`server` text NOT NULL,
	`status` text DEFAULT 'idle' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `game_accounts_user_id_idx` ON `game_accounts` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `game_accounts_username_server_idx` ON `game_accounts` (`username`,`server`);--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `password_reset_tokens_token_unique` ON `password_reset_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `third_party_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`provider_username` text NOT NULL,
	`provider_avatar` text,
	`access_token` text,
	`refresh_token` text,
	`expires_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `third_party_provider_account_id_idx` ON `third_party_accounts` (`provider`,`provider_account_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `third_party_user_provider_idx` ON `third_party_accounts` (`user_id`,`provider`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`email_verified` integer DEFAULT false NOT NULL,
	`password_hash` text,
	`password_salt` text,
	`active_game_account_id` text,
	`sessions_version` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `guild_member_roles` (
	`guild_member_id` text NOT NULL,
	`role_id` text NOT NULL,
	FOREIGN KEY (`guild_member_id`) REFERENCES `guild_members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`module` text NOT NULL,
	`action` text NOT NULL,
	`identity_type` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `permissions_key_unique` ON `permissions` (`key`);--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`role_id` text NOT NULL,
	`permission_id` text NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`guild_id` text,
	`name` text NOT NULL,
	`is_system` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_platform_roles` (
	`user_id` text NOT NULL,
	`role_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `regear_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`regear_id` text NOT NULL,
	`action` text NOT NULL,
	`operator_id` text NOT NULL,
	`comment` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`regear_id`) REFERENCES `regears`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`operator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `regear_logs_regear_id_idx` ON `regear_logs` (`regear_id`);--> statement-breakpoint
CREATE TABLE `regear_ticket_battles` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_id` text NOT NULL,
	`guild_id` text NOT NULL,
	`battle_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `regear_tickets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `regear_ticket_battles_ticket_id_idx` ON `regear_ticket_battles` (`ticket_id`);--> statement-breakpoint
CREATE INDEX `regear_ticket_battles_guild_id_idx` ON `regear_ticket_battles` (`guild_id`);--> statement-breakpoint
CREATE INDEX `regear_ticket_battles_battle_id_idx` ON `regear_ticket_battles` (`battle_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `regear_ticket_battles_ticket_battle_idx` ON `regear_ticket_battles` (`ticket_id`,`battle_id`);--> statement-breakpoint
CREATE TABLE `regear_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`config` text NOT NULL,
	`server` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `regear_tickets_guild_id_idx` ON `regear_tickets` (`guild_id`);--> statement-breakpoint
CREATE TABLE `regears` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_id` text NOT NULL,
	`event_id` text NOT NULL,
	`status` text DEFAULT 'pending_review' NOT NULL,
	`comment` text,
	`server` text NOT NULL,
	`player_name` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `regear_tickets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `regears_ticket_id_idx` ON `regears` (`ticket_id`);--> statement-breakpoint
CREATE INDEX `regears_player_server_idx` ON `regears` (`player_name`,`server`);