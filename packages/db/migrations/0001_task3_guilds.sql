CREATE TABLE `guild_registration_applications` (
	`id` text PRIMARY KEY NOT NULL,
	`applicant_user_id` text NOT NULL,
	`guild_name` text NOT NULL,
	`server` text NOT NULL,
	`binding_token` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewed_by` text,
	`review_note` text,
	`reviewed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`applicant_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unq_guild_application` ON `guild_registration_applications` (`applicant_user_id`,`server`,`guild_name`);
--> statement-breakpoint
CREATE UNIQUE INDEX `unq_guild_application_token` ON `guild_registration_applications` (`binding_token`);
--> statement-breakpoint
CREATE TABLE `guilds` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`owner_user_id` text NOT NULL,
	`guild_name` text NOT NULL,
	`server` text NOT NULL,
	`binding_token` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `guild_registration_applications`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unq_guild_application_id` ON `guilds` (`application_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `unq_guild_name_server` ON `guilds` (`server`,`guild_name`);
--> statement-breakpoint
CREATE UNIQUE INDEX `unq_guild_binding_token` ON `guilds` (`binding_token`);
--> statement-breakpoint
CREATE TABLE `guild_permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`permission_key` text NOT NULL,
	`permission_name` text NOT NULL,
	`description` text,
	`is_system` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unq_guild_permission_key` ON `guild_permissions` (`guild_id`,`permission_key`);
--> statement-breakpoint
CREATE TABLE `guild_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`role_name` text NOT NULL,
	`is_system` integer DEFAULT false NOT NULL,
	`is_default_admin` integer DEFAULT false NOT NULL,
	`can_delete` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unq_guild_role_name` ON `guild_roles` (`guild_id`,`role_name`);
--> statement-breakpoint
CREATE TABLE `guild_role_permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`role_id` text NOT NULL,
	`permission_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `guild_roles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`permission_id`) REFERENCES `guild_permissions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unq_guild_role_permission` ON `guild_role_permissions` (`role_id`,`permission_id`);
--> statement-breakpoint
CREATE TABLE `guild_members` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`binding_type` text NOT NULL,
	`platform_user_id` text,
	`game_character_id` text,
	`invited_by_user_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`joined_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`platform_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`game_character_id`) REFERENCES `game_characters`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`invited_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unq_guild_member_platform_user` ON `guild_members` (`guild_id`,`platform_user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `unq_guild_member_game_character` ON `guild_members` (`guild_id`,`game_character_id`);
--> statement-breakpoint
CREATE TABLE `guild_member_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`role_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `guild_members`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`role_id`) REFERENCES `guild_roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unq_guild_member_role` ON `guild_member_roles` (`member_id`,`role_id`);
--> statement-breakpoint
CREATE TABLE `guild_member_boxes` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_member_id` text NOT NULL,
	`coordinate_x` integer NOT NULL,
	`coordinate_y` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`guild_member_id`) REFERENCES `guild_members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unq_guild_member_box` ON `guild_member_boxes` (`guild_member_id`);
