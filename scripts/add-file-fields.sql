-- Add file-related fields to the Message table
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "fileUrl" TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "fileName" TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "fileType" TEXT;

-- Add messageId field to Notification table
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "messageId" TEXT;

-- Add CHANNEL_MESSAGE to NotificationType enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType' AND 
                  'CHANNEL_MESSAGE' = ANY(enum_range(NULL::NotificationType)::text[])) THEN
        ALTER TYPE "NotificationType" ADD VALUE 'CHANNEL_MESSAGE';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        -- Type already exists, do nothing
END$$;
