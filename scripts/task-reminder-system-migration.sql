-- Add new columns to Reminder table
ALTER TABLE `Reminder` ADD COLUMN `isAutomatic` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `Reminder` ADD COLUMN `taskId` VARCHAR(191) NULL;

-- Add foreign key constraint for task relation
ALTER TABLE `Reminder` ADD CONSTRAINT `Reminder_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for taskId
CREATE INDEX `Reminder_taskId_idx` ON `Reminder`(`taskId`);

-- Add new columns to Notification table for better tracking
ALTER TABLE `Notification` ADD COLUMN `taskId` VARCHAR(191) NULL;
ALTER TABLE `Notification` ADD COLUMN `reminderId` VARCHAR(191) NULL;

-- Update existing automatic reminders (if any) to be marked as automatic
UPDATE `Reminder` SET `isAutomatic` = true WHERE `type` = 'TASK_DEADLINE' AND `description` LIKE '%automatic reminder%';
