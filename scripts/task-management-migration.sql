-- Create TaskStage table if it doesn't exist
CREATE TABLE IF NOT EXISTS "TaskStage" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#e5e7eb',
  "order" INTEGER NOT NULL,
  "taskId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaskStage_pkey" PRIMARY KEY ("id")
);

-- Create Subtask table if it doesn't exist
CREATE TABLE IF NOT EXISTS "Subtask" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "order" INTEGER NOT NULL,
  "taskId" TEXT NOT NULL,
  "stageId" TEXT NOT NULL,
  "creatorId" TEXT NOT NULL,
  "assigneeId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subtask_pkey" PRIMARY KEY ("id")
);

-- Create Tag table if it doesn't exist
CREATE TABLE IF NOT EXISTS "Tag" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- Create TaskTag table if it doesn't exist
CREATE TABLE IF NOT EXISTS "TaskTag" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskTag_pkey" PRIMARY KEY ("id")
);

-- Create TaskActivity table if it doesn't exist
CREATE TABLE IF NOT EXISTS "TaskActivity" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "details" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskActivity_pkey" PRIMARY KEY ("id")
);

-- Add parentId to TaskComment if it doesn't exist
ALTER TABLE "TaskComment" ADD COLUMN IF NOT EXISTS "parentId" TEXT;

-- Add foreign key constraints
ALTER TABLE "TaskStage" ADD CONSTRAINT "TaskStage_taskId_fkey" 
  FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Subtask" ADD CONSTRAINT "Subtask_taskId_fkey" 
  FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Subtask" ADD CONSTRAINT "Subtask_stageId_fkey" 
  FOREIGN KEY ("stageId") REFERENCES "TaskStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Subtask" ADD CONSTRAINT "Subtask_creatorId_fkey" 
  FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Subtask" ADD CONSTRAINT "Subtask_assigneeId_fkey" 
  FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TaskTag" ADD CONSTRAINT "TaskTag_taskId_fkey" 
  FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskTag" ADD CONSTRAINT "TaskTag_tagId_fkey" 
  FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskActivity" ADD CONSTRAINT "TaskActivity_taskId_fkey" 
  FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskActivity" ADD CONSTRAINT "TaskActivity_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_parentId_fkey" 
  FOREIGN KEY ("parentId") REFERENCES "TaskComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "TaskStage_taskId_order_key" ON "TaskStage"("taskId", "order");
CREATE UNIQUE INDEX IF NOT EXISTS "Tag_name_key" ON "Tag"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "TaskTag_taskId_tagId_key" ON "TaskTag"("taskId", "tagId");

-- Create default tags
INSERT INTO "Tag" ("id", "name", "color", "createdAt", "updatedAt")
VALUES 
  ('tag_1', 'Bug', '#ef4444', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tag_2', 'Feature', '#3b82f6', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tag_3', 'Enhancement', '#10b981', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tag_4', 'Documentation', '#f59e0b', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tag_5', 'Design', '#8b5cf6', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tag_6', 'Urgent', '#dc2626', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

-- Create default stages for existing tasks
INSERT INTO "TaskStage" ("id", "name", "color", "order", "taskId", "createdAt", "updatedAt")
SELECT 
  'stage_todo_' || t.id, 
  'To Do', 
  '#f3f4f6', 
  1, 
  t.id, 
  CURRENT_TIMESTAMP, 
  CURRENT_TIMESTAMP
FROM "Task" t
WHERE NOT EXISTS (
  SELECT 1 FROM "TaskStage" ts WHERE ts."taskId" = t.id AND ts."order" = 1
);

INSERT INTO "TaskStage" ("id", "name", "color", "order", "taskId", "createdAt", "updatedAt")
SELECT 
  'stage_progress_' || t.id, 
  'In Progress', 
  '#dbeafe', 
  2, 
  t.id, 
  CURRENT_TIMESTAMP, 
  CURRENT_TIMESTAMP
FROM "Task" t
WHERE NOT EXISTS (
  SELECT 1 FROM "TaskStage" ts WHERE ts."taskId" = t.id AND ts."order" = 2
);

INSERT INTO "TaskStage" ("id", "name", "color", "order", "taskId", "createdAt", "updatedAt")
SELECT 
  'stage_review_' || t.id, 
  'Review', 
  '#fef3c7', 
  3, 
  t.id, 
  CURRENT_TIMESTAMP, 
  CURRENT_TIMESTAMP
FROM "Task" t
WHERE NOT EXISTS (
  SELECT 1 FROM "TaskStage" ts WHERE ts."taskId" = t.id AND ts."order" = 3
);

INSERT INTO "TaskStage" ("id", "name", "color", "order", "taskId", "createdAt", "updatedAt")
SELECT 
  'stage_done_' || t.id, 
  'Done', 
  '#d1fae5', 
  4, 
  t.id, 
  CURRENT_TIMESTAMP, 
  CURRENT_TIMESTAMP
FROM "Task" t
WHERE NOT EXISTS (
  SELECT 1 FROM "TaskStage" ts WHERE ts."taskId" = t.id AND ts."order" = 4
);
