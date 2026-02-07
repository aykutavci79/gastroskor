import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

const prisma = new PrismaClient()

async function exportStories() {
  try {
    const stories = await prisma.story.findMany({
      where: {
        author: 'deri'
      },
      orderBy: {
        publishedAt: 'desc'
      }
    })
    
    const storiesData = stories.map(story => ({
      id: story.id,
      title: story.title,
      slug: story.slug,
      excerpt: story.excerpt,
      content: story.content,
      illustration: story.illustrationUrl,
      publishedAt: story.publishedAt.toISOString()
    }))
    
    fs.writeFileSync('stories_to_translate.json', JSON.stringify(storiesData, null, 2))
    console.log(`Exported ${stories.length} stories to stories_to_translate.json`)
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

exportStories()
