-- Create Reminder table
CREATE TABLE IF NOT EXISTS `Reminder` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `remindAt` DATETIME(3) NOT NULL,
    `isMuted` BOOLEAN NOT NULL DEFAULT false,
    `isSent` BOOLEAN NOT NULL DEFAULT false,
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
    `type` ENUM('GENERAL', 'TASK_DEADLINE', 'MEETING', 'FOLLOW_UP', 'PERSONAL') NOT NULL DEFAULT 'GENERAL',
    `creatorId` VARCHAR(191) NOT NULL,
    `assigneeId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `sentAt` DATETIME(3) NULL,

    INDEX `Reminder_remindAt_isSent_isMuted_idx`(`remindAt`, `isSent`, `isMuted`),
    INDEX `Reminder_assigneeId_idx`(`assigneeId`),
    INDEX `Reminder_creatorId_idx`(`creatorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add foreign key constraints
ALTER TABLE `Reminder` ADD CONSTRAINT `Reminder_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Reminder` ADD CONSTRAINT `Reminder_assigneeId_fkey` FOREIGN KEY (`assigneeId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Update NotificationType enum to include REMINDER
ALTER TABLE `Notification` MODIFY `type` ENUM('TASK_ASSIGNED', 'TASK_UPDATED', 'TASK_COMMENT', 'CHANNEL_INVITE', 'DIRECT_MESSAGE', 'CHANNEL_MESSAGE', 'REMINDER') NOT NULL;
