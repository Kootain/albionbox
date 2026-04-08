PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `game_character_binding_applications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`server` text NOT NULL,
	`game_account_id` text NOT NULL,
	`game_character_name` text,
	`binding_token` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewed_by` text,
	`review_note` text,
	`reviewed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unq_game_account_binding` ON `game_character_binding_applications` (`user_id`,`server`,`game_account_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_game_binding_token` ON `game_character_binding_applications` (`binding_token`);--> statement-breakpoint
CREATE TABLE `__new_game_characters` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`user_id` text NOT NULL,
	`server` text NOT NULL,
	`game_account_id` text NOT NULL,
	`character_name` text,
	`approved_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `game_character_binding_applications`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `game_character_binding_applications`("id", "user_id", "server", "game_account_id", "game_character_name", "binding_token", "status", "reviewed_by", "review_note", "reviewed_at", "created_at", "updated_at")
SELECT
	'legacy_game_app_' || "id",
	"user_id",
	'asia',
	"character_id",
	"character_name",
	'legacy_bind_' || "id",
	'approved',
	NULL,
	'legacy migrated record',
	COALESCE("created_at", CAST(unixepoch() AS integer)),
	COALESCE("created_at", CAST(unixepoch() AS integer)),
	COALESCE("created_at", CAST(unixepoch() AS integer))
FROM `game_characters`;--> statement-breakpoint
INSERT INTO `__new_game_characters`("id", "application_id", "user_id", "server", "game_account_id", "character_name", "approved_at", "created_at")
SELECT
	"id",
	'legacy_game_app_' || "id",
	"user_id",
	'asia',
	"character_id",
	"character_name",
	COALESCE("created_at", CAST(unixepoch() AS integer)),
	COALESCE("created_at", CAST(unixepoch() AS integer))
FROM `game_characters`;--> statement-breakpoint
DROP TABLE `game_characters`;--> statement-breakpoint
ALTER TABLE `__new_game_characters` RENAME TO `game_characters`;--> statement-breakpoint
CREATE UNIQUE INDEX `unq_game_character_application` ON `game_characters` (`application_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_game_character_account` ON `game_characters` (`server`,`game_account_id`);--> statement-breakpoint
CREATE TABLE `__new_oauth_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text,
	`provider_account_name` text,
	`status` text DEFAULT 'active' NOT NULL,
	`last_bound_at` integer NOT NULL,
	`unbound_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_oauth_accounts`("id", "user_id", "provider", "provider_account_id", "provider_account_name", "status", "last_bound_at", "unbound_at", "created_at", "updated_at")
SELECT
	"id",
	"user_id",
	"provider",
	"provider_account_id",
	NULL,
	'active',
	COALESCE("created_at", CAST(unixepoch() AS integer)),
	NULL,
	COALESCE("created_at", CAST(unixepoch() AS integer)),
	COALESCE("created_at", CAST(unixepoch() AS integer))
FROM `oauth_accounts`;--> statement-breakpoint
DROP TABLE `oauth_accounts`;--> statement-breakpoint
ALTER TABLE `__new_oauth_accounts` RENAME TO `oauth_accounts`;--> statement-breakpoint
CREATE UNIQUE INDEX `unq_oauth_user_provider` ON `oauth_accounts` (`user_id`,`provider`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_oauth_provider_account` ON `oauth_accounts` (`provider`,`provider_account_id`);--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`email_verified` integer DEFAULT false NOT NULL,
	`password_hash` text,
	`password_salt` text,
	`password_updated_at` integer,
	`current_game_character_id` text,
	`is_admin` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "email", "email_verified", "password_hash", "password_salt", "password_updated_at", "current_game_character_id", "is_admin", "created_at", "updated_at")
SELECT
	"id",
	"email",
	COALESCE("email_verified", false),
	NULL,
	NULL,
	NULL,
	NULL,
	false,
	COALESCE("created_at", CAST(unixepoch() AS integer)),
	COALESCE("created_at", CAST(unixepoch() AS integer))
FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
PRAGMA foreign_keys=ON;
