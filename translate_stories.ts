import 'dotenv/config'
import * as fs from 'fs'

interface Story {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  illustration: string
  publishedAt: string
}

interface TranslatedStory extends Story {
  locale: string
}

const LANGUAGES = {
  en: 'English',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
  ru: 'Russian',
  ar: 'Arabic',
  it: 'Italian'
}

async function translateToLanguage(stories: Story[], locale: string, languageName: string) {
  console.log(`\n🌍 Translating to ${languageName} (${locale})...`)
  
  const apiKey = process.env.ABACUSAI_API_KEY
  if (!apiKey) {
    throw new Error('ABACUSAI_API_KEY not found')
  }

  // Translate in smaller batches (2-3 stories at a time to avoid token limits)
  const batchSize = 2
  const translatedStories: TranslatedStory[] = []
  
  for (let i = 0; i < stories.length; i += batchSize) {
    const batch = stories.slice(i, i + batchSize)
    console.log(`  Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(stories.length / batchSize)}: Translating ${batch.map(s => s.title).join(', ')}`)
    
    const prompt = `You are a professional literary translator specializing in Turkish literature. Translate these Turkish short stories to ${languageName} with exceptional literary quality. Preserve the emotional depth, cultural nuances, and poetic style.

IMPORTANT INSTRUCTIONS:
- Maintain the literary and artistic tone
- Keep the emotional impact and atmosphere
- Preserve cultural references (explain if necessary)
- Use sophisticated ${languageName} literary language
- Keep formatting (line breaks, paragraphs)
- DO NOT translate author name "deri" - keep it as is
- DO NOT translate "Deri ve Kemik" - keep as is

Stories to translate:
${batch.map((story, idx) => `
STORY ${idx + 1}:
TITLE: ${story.title}
EXCERPT: ${story.excerpt}
CONTENT:
${story.content}
---
`).join('\n')}

Return ONLY a valid JSON array with this structure:
[
  {
    "title": "Translated title",
    "excerpt": "Translated excerpt (150-200 characters)",
    "content": "Translated full content"
  }
]`

    try {
      const response = await fetch('https://routellm.abacus.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are a professional literary translator with expertise in Turkish literature. You provide high-quality, culturally sensitive translations that preserve the artistic and emotional qualities of the original text.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 16000
        })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const translatedText = data.choices[0].message.content.trim()
      
      // Extract JSON from markdown code blocks if present
      let jsonText = translatedText
      if (translatedText.includes('```json')) {
        jsonText = translatedText.split('```json')[1].split('```')[0].trim()
      } else if (translatedText.includes('```')) {
        jsonText = translatedText.split('```')[1].split('```')[0].trim()
      }
      
      const translations = JSON.parse(jsonText)
      
      // Combine with original story data
      batch.forEach((story, idx) => {
        translatedStories.push({
          ...story,
          title: translations[idx].title,
          excerpt: translations[idx].excerpt,
          content: translations[idx].content,
          locale
        })
      })
      
      console.log(`  ✅ Batch completed`)
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.error(`  ❌ Error translating batch:`, error)
      throw error
    }
  }
  
  console.log(`✅ ${languageName} translation completed: ${translatedStories.length} stories`)
  return translatedStories
}

async function main() {
  try {
    // Load original stories
    const storiesData = JSON.parse(fs.readFileSync('stories_to_translate.json', 'utf-8'))
    console.log(`Loaded ${storiesData.length} stories to translate`)
    
    const allTranslations: Record<string, TranslatedStory[]> = {}
    
    // Translate to each language
    for (const [locale, languageName] of Object.entries(LANGUAGES)) {
      const translations = await translateToLanguage(storiesData, locale, languageName)
      allTranslations[locale] = translations
      
      // Save after each language
      fs.writeFileSync(
        `translations_${locale}.json`,
        JSON.stringify(translations, null, 2)
      )
      console.log(`💾 Saved translations_${locale}.json\n`)
    }
    
    console.log('\n🎉 ALL TRANSLATIONS COMPLETED!')
    console.log(`Total: ${Object.keys(allTranslations).length} languages × ${storiesData.length} stories = ${Object.keys(allTranslations).length * storiesData.length} translations`)
    
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
}

main()
