-- Add language and originalStoryId columns to Story table
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "language" TEXT DEFAULT 'tr';
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "originalStoryId" TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS "Story_language_idx" ON "Story"("language");
CREATE INDEX IF NOT EXISTS "Story_originalStoryId_idx" ON "Story"("originalStoryId");
