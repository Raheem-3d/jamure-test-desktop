-- Add new tables for task detail functionality

-- Task stages for custom workflows per task
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

-- Subtasks that belong to stages
CREATE TABLE IF NOT EXISTS "Subtask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "order" INTEGER NOT NULL DEFAULT 0,
    "taskId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subtask_pkey" PRIMARY KEY ("id")
);

-- Tags for categorizing tasks
CREATE TABLE IF NOT EXISTS "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- Many-to-many relationship between tasks and tags
CREATE TABLE IF NOT EXISTS "TaskTagRelation" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "TaskTagRelation_pkey" PRIMARY KEY ("id")
);

-- Activity log for tasks
CREATE TABLE IF NOT EXISTS "TaskActivity" (
    "id" TEXT NOT NULL,
    "type" "TaskActivityType" NOT NULL,
    "description" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskActivity_pkey" PRIMARY KEY ("id")
);

-- Activity log for subtasks
CREATE TABLE IF NOT EXISTS "SubtaskActivity" (
    "id" TEXT NOT NULL,
    "type" "SubtaskActivityType" NOT NULL,
    "description" TEXT NOT NULL,
    "subtaskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubtaskActivity_pkey" PRIMARY KEY ("id")
);

-- Create enums for activity types
CREATE TYPE "TaskActivityType" AS ENUM (
    'TASK_CREATED',
    'TASK_UPDATED',
    'TASK_DELETED',
    'TASK_ASSIGNED',
    'TASK_UNASSIGNED',
    'TASK_TAGGED',
    'TASK_UNTAGGED',
    'TASK_COMMENTED',
    'STAGE_CREATED',
    'STAGE_UPDATED',
    'STAGE_DELETED'
);

CREATE TYPE "SubtaskActivityType" AS ENUM (
    'SUBTASK_CREATED',
    'SUBTASK_UPDATED',
    'SUBTASK_DELETED',
    'SUBTASK_MOVED',
    'SUBTASK_ASSIGNED',
    'SUBTASK_UNASSIGNED'
);

-- Add parentId to TaskComment for replies
ALTER TABLE "TaskComment" ADD COLUMN IF NOT EXISTS "parentId" TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "TaskStage_taskId_order_idx" ON "TaskStage"("taskId", "order");
CREATE INDEX IF NOT EXISTS "Subtask_stageId_order_idx" ON "Subtask"("stageId", "order");
CREATE INDEX IF NOT EXISTS "TaskTagRelation_taskId_idx" ON "TaskTagRelation"("taskId");
CREATE INDEX IF NOT EXISTS "TaskTagRelation_tagId_idx" ON "TaskTagRelation"("tagId");
CREATE INDEX IF NOT EXISTS "TaskActivity_taskId_timestamp_idx" ON "TaskActivity"("taskId", "timestamp");
CREATE INDEX IF NOT EXISTS "SubtaskActivity_subtaskId_timestamp_idx" ON "SubtaskActivity"("subtaskId", "timestamp");

-- Create unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "TaskStage_taskId_order_key" ON "TaskStage"("taskId", "order");
CREATE UNIQUE INDEX IF NOT EXISTS "Tag_name_key" ON "Tag"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "TaskTagRelation_taskId_tagId_key" ON "TaskTagRelation"("taskId", "tagId");

-- Add foreign key constraints
ALTER TABLE "TaskStage" ADD CONSTRAINT "TaskStage_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subtask" ADD CONSTRAINT "Subtask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subtask" ADD CONSTRAINT "Subtask_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "TaskStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subtask" ADD CONSTRAINT "Subtask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaskTagRelation" ADD CONSTRAINT "TaskTagRelation_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskTagRelation" ADD CONSTRAINT "TaskTagRelation_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskActivity" ADD CONSTRAINT "TaskActivity_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskActivity" ADD CONSTRAINT "TaskActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubtaskActivity" ADD CONSTRAINT "SubtaskActivity_subtaskId_fkey" FOREIGN KEY ("subtaskId") REFERENCES "Subtask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubtaskActivity" ADD CONSTRAINT "SubtaskActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TaskComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert some default tags
INSERT INTO "Tag" ("id", "name", "color") VALUES 
    ('tag_1', 'Bug', '#ef4444'),
    ('tag_2', 'Feature', '#3b82f6'),
    ('tag_3', 'Enhancement', '#10b981'),
    ('tag_4', 'Documentation', '#f59e0b'),
    ('tag_5', 'Testing', '#8b5cf6'),
    ('tag_6', 'Urgent', '#dc2626'),
    ('tag_7', 'Backend', '#6b7280'),
    ('tag_8', 'Frontend', '#ec4899')
ON CONFLICT ("name") DO NOTHING;

-- Insert default stages for existing tasks
INSERT INTO "TaskStage" ("id", "name", "color", "order", "taskId")
SELECT 
    'stage_' || t.id || '_1',
    'To Do',
    '#fef3c7',
    1,
    t.id
FROM "Task" t
WHERE NOT EXISTS (
    SELECT 1 FROM "TaskStage" ts WHERE ts."taskId" = t.id
);

INSERT INTO "TaskStage" ("id", "name", "color", "order", "taskId")
SELECT 
    'stage_' || t.id || '_2',
    'In Progress',
    '#dbeafe',
    2,
    t.id
FROM "Task" t
WHERE NOT EXISTS (
    SELECT 1 FROM "TaskStage" ts WHERE ts."taskId" = t.id AND ts."order" = 2
);

INSERT INTO "TaskStage" ("id", "name", "color", "order", "taskId")
SELECT 
    'stage_' || t.id || '_3',
    'Review',
    '#fde68a',
    3,
    t.id
FROM "Task" t
WHERE NOT EXISTS (
    SELECT 1 FROM "TaskStage" ts WHERE ts."taskId" = t.id AND ts."order" = 3
);

INSERT INTO "TaskStage" ("id", "name", "color", "order", "taskId")
SELECT 
    'stage_' || t.id || '_4',
    'Done',
    '#d1fae5',
    4,
    t.id
FROM "Task" t
WHERE NOT EXISTS (
    SELECT 1 FROM "TaskStage" ts WHERE ts."taskId" = t.id AND ts."order" = 4
);
