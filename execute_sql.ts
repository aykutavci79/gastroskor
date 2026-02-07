import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Adding language fields...')
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "language" TEXT DEFAULT 'tr';
    `)
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "originalStoryId" TEXT;
    `)
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Story_language_idx" ON "Story"("language");
    `)
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Story_originalStoryId_idx" ON "Story"("originalStoryId");
    `)
    
    console.log('✅ Language fields added successfully!')
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
