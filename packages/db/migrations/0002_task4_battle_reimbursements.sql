CREATE TABLE `reimbursement_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'open' NOT NULL,
	`created_by_user_id` text NOT NULL,
	`closed_by_user_id` text,
	`closed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`closed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `reimbursement_auto_approval_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`rule_name` text NOT NULL,
	`description` text,
	`enabled` integer DEFAULT true NOT NULL,
	`priority` integer DEFAULT 100 NOT NULL,
	`match_mode` text DEFAULT 'all' NOT NULL,
	`action` text NOT NULL,
	`note_template` text,
	`conditions_json` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`updated_by_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unq_guild_auto_approval_rule_name` ON `reimbursement_auto_approval_rules` (`guild_id`,`rule_name`);
--> statement-breakpoint
CREATE TABLE `battle_records` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`imported_by_user_id` text NOT NULL,
	`external_record_id` text NOT NULL,
	`external_battle_id` text,
	`battle_name` text,
	`source` text DEFAULT 'custom' NOT NULL,
	`occurred_at` integer NOT NULL,
	`is_death` integer DEFAULT true NOT NULL,
	`reimbursement_session_id` text,
	`guild_member_id` text,
	`game_character_id` text,
	`victim_game_account_id` text,
	`victim_character_name` text NOT NULL,
	`total_estimated_value` integer DEFAULT 0 NOT NULL,
	`equipment_items_json` text NOT NULL,
	`tags_json` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`imported_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`reimbursement_session_id`) REFERENCES `reimbursement_sessions`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`guild_member_id`) REFERENCES `guild_members`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`game_character_id`) REFERENCES `game_characters`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unq_guild_external_battle_record` ON `battle_records` (`guild_id`,`external_record_id`);
--> statement-breakpoint
CREATE TABLE `reimbursement_records` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`session_id` text NOT NULL,
	`battle_record_id` text NOT NULL,
	`guild_member_id` text,
	`game_character_id` text,
	`applicant_user_id` text,
	`status` text DEFAULT 'pending_submission' NOT NULL,
	`auto_decision` text DEFAULT 'none' NOT NULL,
	`reimbursement_amount` integer,
	`latest_note` text,
	`last_reviewed_by` text,
	`last_reviewed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `reimbursement_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`battle_record_id`) REFERENCES `battle_records`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`guild_member_id`) REFERENCES `guild_members`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`game_character_id`) REFERENCES `game_characters`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`applicant_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`last_reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unq_reimbursement_battle_record` ON `reimbursement_records` (`battle_record_id`);
--> statement-breakpoint
CREATE TABLE `reimbursement_approval_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`reimbursement_record_id` text NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`action_type` text NOT NULL,
	`operated_by_user_id` text,
	`auto_approval_rule_id` text,
	`note` text,
	`metadata_json` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reimbursement_record_id`) REFERENCES `reimbursement_records`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`operated_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`auto_approval_rule_id`) REFERENCES `reimbursement_auto_approval_rules`(`id`) ON UPDATE no action ON DELETE set null
);
