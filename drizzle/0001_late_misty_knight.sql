CREATE TABLE `admissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`bedId` int NOT NULL,
	`admittedAt` timestamp NOT NULL DEFAULT (now()),
	`dischargedAt` timestamp,
	`status` enum('admitted','discharged') NOT NULL DEFAULT 'admitted',
	`notes` text,
	CONSTRAINT `admissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`doctorId` int,
	`departmentId` int,
	`appointmentDate` timestamp NOT NULL,
	`reason` varchar(240),
	`status` enum('scheduled','checked_in','completed','cancelled') NOT NULL DEFAULT 'scheduled',
	`priority` enum('routine','urgent','emergency') NOT NULL DEFAULT 'routine',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`action` varchar(80) NOT NULL,
	`entity` varchar(80) NOT NULL,
	`entityId` int,
	`actor` varchar(160) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `beds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bedNumber` varchar(30) NOT NULL,
	`ward` varchar(100) NOT NULL,
	`type` enum('general','icu','private','emergency') NOT NULL DEFAULT 'general',
	`status` enum('available','occupied','maintenance') NOT NULL DEFAULT 'available',
	`currentPatientId` int,
	CONSTRAINT `beds_id` PRIMARY KEY(`id`),
	CONSTRAINT `beds_bedNumber_unique` UNIQUE(`bedNumber`)
);
--> statement-breakpoint
CREATE TABLE `bills` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL DEFAULT '0',
	`status` enum('pending','paid','overdue') NOT NULL DEFAULT 'pending',
	`description` varchar(240),
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bills_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`location` varchar(160),
	`contact` varchar(40),
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `departments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `doctors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`specialization` varchar(120) NOT NULL,
	`departmentId` int,
	`qualification` varchar(160),
	`experience` int NOT NULL DEFAULT 0,
	`phone` varchar(40),
	`email` varchar(320),
	`consultationFee` decimal(10,2) DEFAULT '0',
	`availability` enum('available','on_leave','busy') NOT NULL DEFAULT 'available',
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `doctors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `laboratory_tests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`testName` varchar(160) NOT NULL,
	`status` enum('ordered','in_progress','completed') NOT NULL DEFAULT 'ordered',
	`result` text,
	`orderedAt` timestamp NOT NULL DEFAULT (now()),
	`resultDate` timestamp,
	CONSTRAINT `laboratory_tests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `medical_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`doctorId` int,
	`diagnosis` varchar(240),
	`symptoms` text,
	`notes` text,
	`recordDate` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `medical_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `medicines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`category` varchar(100),
	`stock` int NOT NULL DEFAULT 0,
	`reorderLevel` int NOT NULL DEFAULT 10,
	`unit` varchar(30) NOT NULL DEFAULT 'packs',
	`expiryDate` varchar(12),
	`status` enum('in_stock','low_stock','out_of_stock') NOT NULL DEFAULT 'in_stock',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medicines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`message` text NOT NULL,
	`severity` enum('info','warning','critical') NOT NULL DEFAULT 'info',
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientCode` varchar(32) NOT NULL,
	`fullName` varchar(180) NOT NULL,
	`dob` varchar(12),
	`age` int,
	`gender` enum('female','male','non_binary','prefer_not_to_say'),
	`bloodGroup` varchar(8),
	`phone` varchar(40),
	`email` varchar(320),
	`address` text,
	`emergencyContact` varchar(160),
	`emergencyPhone` varchar(40),
	`medicalHistory` text,
	`allergies` text,
	`status` enum('active','admitted','discharged','inactive') NOT NULL DEFAULT 'active',
	`registrationDate` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `patients_id` PRIMARY KEY(`id`),
	CONSTRAINT `patients_patientCode_unique` UNIQUE(`patientCode`)
);
--> statement-breakpoint
CREATE TABLE `prescriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`doctorId` int,
	`medicineName` varchar(160) NOT NULL,
	`dosage` varchar(80),
	`frequency` varchar(80),
	`duration` varchar(80),
	`status` enum('active','completed','cancelled') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prescriptions_id` PRIMARY KEY(`id`)
);
