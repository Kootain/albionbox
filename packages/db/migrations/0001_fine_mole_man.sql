PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_regear_session_battles` (
	`session_id` text NOT NULL,
	`battle_record_id` text NOT NULL,
	PRIMARY KEY(`session_id`, `battle_record_id`),
	FOREIGN KEY (`session_id`) REFERENCES `regear_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`battle_record_id`) REFERENCES `battle_records`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_regear_session_battles`("session_id", "battle_record_id") SELECT "session_id", "battle_record_id" FROM `regear_session_battles`;--> statement-breakpoint
DROP TABLE `regear_session_battles`;--> statement-breakpoint
ALTER TABLE `__new_regear_session_battles` RENAME TO `regear_session_battles`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_guild_member_roles` (
	`guild_member_id` text NOT NULL,
	`role_id` text NOT NULL,
	FOREIGN KEY (`guild_member_id`) REFERENCES `guild_members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_guild_member_roles`("guild_member_id", "role_id") SELECT "guild_member_id", "role_id" FROM `guild_member_roles`;--> statement-breakpoint
DROP TABLE `guild_member_roles`;--> statement-breakpoint
ALTER TABLE `__new_guild_member_roles` RENAME TO `guild_member_roles`;