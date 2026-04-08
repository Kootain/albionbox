CREATE TABLE `battle_deaths` (
	`id` text PRIMARY KEY NOT NULL,
	`battle_record_id` text NOT NULL,
	`albion_player_id` text NOT NULL,
	`player_name` text NOT NULL,
	`equipment` text NOT NULL,
	`killed_at` text NOT NULL,
	FOREIGN KEY (`battle_record_id`) REFERENCES `battle_records`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `battle_records` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`external_id` text NOT NULL,
	`battle_at` text NOT NULL,
	`participants` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
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
	`owner_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `binding_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`game_account_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	FOREIGN KEY (`game_account_id`) REFERENCES `game_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `binding_tokens_token_unique` ON `binding_tokens` (`token`);--> statement-breakpoint
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
	`user_id` text NOT NULL,
	`game_id` text NOT NULL,
	`albion_player_id` text,
	`server` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
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
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`active_game_account_id` text,
	`sessions_version` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `guild_member_roles` (
	`guild_member_id` text NOT NULL,
	`role_id` text NOT NULL,
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
CREATE TABLE `regear_approval_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`regear_record_id` text NOT NULL,
	`from_status` text NOT NULL,
	`to_status` text NOT NULL,
	`operator_id` text,
	`is_system` integer DEFAULT false NOT NULL,
	`note` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`regear_record_id`) REFERENCES `regear_records`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `regear_approval_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`name` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`condition` text NOT NULL,
	`action` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `regear_records` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`battle_death_id` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `regear_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`battle_death_id`) REFERENCES `battle_deaths`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `regear_session_battles` (
	`session_id` text NOT NULL,
	`battle_record_id` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `regear_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`battle_record_id`) REFERENCES `battle_records`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `regear_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
