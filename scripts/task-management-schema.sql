-- Add task management tables to existing schema

-- Task Stages table
CREATE TABLE IF NOT EXISTS "TaskStage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'bg-gray-100',
    "order" INTEGER NOT NULL DEFAULT 1,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "nextStageId" TEXT,
    "assignedTeam" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Task Tags table
CREATE TABLE IF NOT EXISTS "TaskTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "color" TEXT NOT NULL DEFAULT 'bg-blue-100 text-blue-800',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Task Activity Log table
CREATE TABLE IF NOT EXISTS "TaskActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT,
    "metadata" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
    FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE
);

-- Update existing Task table to include new fields
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "stageId" TEXT DEFAULT 'todo';
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "tags" TEXT DEFAULT '[]';
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "comments" TEXT DEFAULT '[]';
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "attachments" TEXT DEFAULT '[]';

-- Task-Tag junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS "TaskTagRelation" (
    "taskId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    PRIMARY KEY ("taskId", "tagId"),
    FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE,
    FOREIGN KEY ("tagId") REFERENCES "TaskTag"("id") ON DELETE CASCADE
);

-- Insert default stages
INSERT OR IGNORE INTO "TaskStage" ("id", "name", "color", "order", "assignedTeam") VALUES
('todo', 'To Do', 'bg-gray-100', 1, 'Development'),
('in-progress', 'In Progress', 'bg-blue-100', 2, 'Development'),
('review', 'Review', 'bg-yellow-100', 3, 'QA'),
('done', 'Done', 'bg-green-100', 4, 'Product');

-- Insert default tags
INSERT OR IGNORE INTO "TaskTag" ("id", "name", "color") VALUES
('bug', 'Bug', 'bg-red-100 text-red-800'),
('feature', 'Feature', 'bg-blue-100 text-blue-800'),
('urgent', 'Urgent', 'bg-orange-100 text-orange-800'),
('enhancement', 'Enhancement', 'bg-purple-100 text-purple-800'),
('documentation', 'Documentation', 'bg-green-100 text-green-800'),
('testing', 'Testing', 'bg-yellow-100 text-yellow-800');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "TaskStage_order_idx" ON "TaskStage"("order");
CREATE INDEX IF NOT EXISTS "TaskActivity_timestamp_idx" ON "TaskActivity"("timestamp");
CREATE INDEX IF NOT EXISTS "TaskActivity_userId_idx" ON "TaskActivity"("userId");
CREATE INDEX IF NOT EXISTS "TaskActivity_taskId_idx" ON "TaskActivity"("taskId");
CREATE INDEX IF NOT EXISTS "Task_stageId_idx" ON "Task"("stageId");
