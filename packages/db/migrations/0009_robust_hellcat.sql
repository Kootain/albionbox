CREATE TABLE `replay_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`highlight_id` text NOT NULL,
	`username` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`highlight_id`) REFERENCES `replay_highlights`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `replay_comments_highlight_id_idx` ON `replay_comments` (`highlight_id`);--> statement-breakpoint
CREATE TABLE `replay_highlights` (
	`id` text PRIMARY KEY NOT NULL,
	`video_id` text NOT NULL,
	`timestamp` integer NOT NULL,
	`absolute_time` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`video_id`) REFERENCES `replay_videos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `replay_highlights_video_id_idx` ON `replay_highlights` (`video_id`);--> statement-breakpoint
CREATE TABLE `replay_videos` (
	`id` text PRIMARY KEY NOT NULL,
	`vid` text NOT NULL,
	`duration` integer,
	`username` text NOT NULL,
	`date` text NOT NULL,
	`role` text NOT NULL,
	`absolute_start_time` integer,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `replay_videos_username_idx` ON `replay_videos` (`username`);--> statement-breakpoint
CREATE INDEX `replay_videos_date_idx` ON `replay_videos` (`date`);