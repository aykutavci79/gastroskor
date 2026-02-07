import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

const prisma = new PrismaClient()

interface EnglishStory {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  publishedAt: string
  locale: string
}

async function importEnglishStories() {
  try {
    console.log('\n🌍 Starting English stories import...')

    // Read translations file
    const translationsData = fs.readFileSync('translations_en.json', 'utf-8')
    const englishStories: EnglishStory[] = JSON.parse(translationsData)

    console.log(`📚 Found ${englishStories.length} English translations`)

    // Get Turkish stories to match with
    const turkishStories = await prisma.story.findMany({
      where: { language: 'tr' },
      select: { id: true, slug: true, illustrationUrl: true, author: true },
    })

    console.log(`🇹🇷 Found ${turkishStories.length} Turkish stories in database`)

    let importedCount = 0

    for (const enStory of englishStories) {
      try {
        // Find matching Turkish story by ID
        const turkishStory = turkishStories.find((ts) => ts.id === enStory.id)

        if (!turkishStory) {
          console.log(
            `⚠️  Skipping "${enStory.title}" - Turkish story not found (ID: ${enStory.id})`
          )
          continue
        }

        // Create English slug
        const englishSlug = `${enStory.slug}-en`

        // Check if English version already exists (compound unique: language + slug)
        const existing = await prisma.story.findUnique({
          where: {
            language_slug: {
              language: 'en',
              slug: englishSlug,
            },
          },
          select: { id: true },
        })

        if (existing) {
          console.log(`⏭️  Skipping "${enStory.title}" - already exists`)
          continue
        }

        // Import English story
        await prisma.story.create({
          data: {
            title: enStory.title,
            slug: englishSlug,
            content: enStory.content,
            excerpt: enStory.excerpt,
            author: turkishStory.author,
            illustrationUrl: turkishStory.illustrationUrl,
            publishedAt: new Date(enStory.publishedAt),
            language: 'en',
            originalStoryId: enStory.id,
          },
        })

        importedCount++
        console.log(`✅ Imported: "${enStory.title}" (${englishSlug})`)
      } catch (error) {
        console.error(`❌ Error importing "${enStory.title}":`, error)
      }
    }

    console.log(
      `\n🎉 Import complete! ${importedCount}/${englishStories.length} stories imported`
    )

    // Verify imported stories
    const allEnglishStories = await prisma.story.findMany({
      where: { language: 'en' },
      select: { title: true, slug: true, language: true },
    })

    console.log('\n📊 English stories in database:')
    allEnglishStories.forEach((story, index) => {
      console.log(`${index + 1}. ${story.title} (${story.slug})`)
    })
  } catch (error) {
    console.error('\n❌ Fatal error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

importEnglishStories()
