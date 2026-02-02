CREATE TABLE `areas` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`icon` text NOT NULL,
	`sort_order` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`area_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text,
	`sort_order` integer NOT NULL,
	FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` integer NOT NULL,
	`label` text NOT NULL,
	`note` text,
	`price` integer,
	`is_checked` integer DEFAULT false NOT NULL,
	`sort_order` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
