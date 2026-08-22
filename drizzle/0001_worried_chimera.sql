CREATE TABLE `adminActivity` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminUserId` int NOT NULL,
	`action` varchar(160) NOT NULL,
	`targetType` varchar(80) NOT NULL,
	`targetId` varchar(80) NOT NULL,
	`details` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adminActivity_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `buildings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`address` text NOT NULL,
	`shiftSchedule` varchar(80) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `buildings_id` PRIMARY KEY(`id`),
	CONSTRAINT `buildings_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `checkpoints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`buildingId` int NOT NULL,
	`label` varchar(160) NOT NULL,
	`location` varchar(220) NOT NULL,
	`nfcTag` varchar(160) NOT NULL,
	`floor` varchar(80) NOT NULL DEFAULT 'Level 1',
	`xPosition` int NOT NULL DEFAULT 50,
	`yPosition` int NOT NULL DEFAULT 50,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `checkpoints_id` PRIMARY KEY(`id`),
	CONSTRAINT `checkpoints_nfc_unique` UNIQUE(`nfcTag`)
);
--> statement-breakpoint
CREATE TABLE `cleaningLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`buildingId` int NOT NULL,
	`checkpointId` int NOT NULL,
	`assignedUserId` int,
	`status` enum('waiting','flagged','approved','verified') NOT NULL DEFAULT 'waiting',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cleaningLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `operationalSettings` (
	`id` int NOT NULL,
	`evidenceThreshold` int NOT NULL DEFAULT 80,
	`defaultShiftHours` varchar(80) NOT NULL DEFAULT '06:00 — 14:00',
	`notificationRules` json NOT NULL,
	`retentionDays` int NOT NULL DEFAULT 365,
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `operationalSettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `proofRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cleaningLogId` int NOT NULL,
	`presence` enum('nfc','nfc_gps','missing') NOT NULL DEFAULT 'missing',
	`qualityScore` int,
	`evidenceKey` varchar(512),
	`evidenceUrl` varchar(1024),
	`decision` enum('pending','approved','sent_back','escalated') NOT NULL DEFAULT 'pending',
	`reviewerId` int,
	`capturedAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	CONSTRAINT `proofRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shiftHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`buildingId` int NOT NULL,
	`shiftLabel` varchar(80) NOT NULL,
	`startedAt` timestamp NOT NULL,
	`endedAt` timestamp,
	`status` enum('active','completed','cancelled') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shiftHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teamAssignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`buildingId` int NOT NULL,
	`assignmentRole` enum('operator','supervisor','manager') NOT NULL DEFAULT 'operator',
	`active` boolean NOT NULL DEFAULT true,
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	`deactivatedAt` timestamp,
	CONSTRAINT `teamAssignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `team_assignment_unique` UNIQUE(`userId`,`buildingId`)
);
--> statement-breakpoint
CREATE TABLE `teamInvites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`buildingId` int NOT NULL,
	`assignmentRole` enum('operator','supervisor','manager') NOT NULL DEFAULT 'operator',
	`status` enum('pending','accepted','cancelled') NOT NULL DEFAULT 'pending',
	`invitedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `teamInvites_id` PRIMARY KEY(`id`)
);
