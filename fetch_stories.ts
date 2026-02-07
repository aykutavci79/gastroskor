import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fetchStories() {
  try {
    const stories = await prisma.story.findMany({
      where: {
        author: 'deri'
      },
      orderBy: {
        publishedAt: 'desc'
      }
    })
    
    console.log(`\nFound ${stories.length} stories:\n`)
    stories.forEach((story, index) => {
      console.log(`${index + 1}. ${story.title}`)
      console.log(`   Slug: ${story.slug}`)
      console.log(`   Date: ${story.publishedAt}`)
      console.log(`   Content length: ${story.content.length} chars\n`)
    })
  } catch (error) {
    console.error('Error fetching stories:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fetchStories()
