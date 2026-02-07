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

async function translateSingleStory(story: Story, locale: string, languageName: string): Promise<TranslatedStory | null> {
  const apiKey = process.env.ABACUSAI_API_KEY
  if (!apiKey) {
    throw new Error('ABACUSAI_API_KEY not found')
  }

  const prompt = `You are a professional literary translator specializing in Turkish literature. Translate this Turkish short story to ${languageName} with exceptional literary quality.

CRITICAL INSTRUCTIONS:
- Maintain the literary and artistic tone
- Keep the emotional impact and atmosphere
- Preserve cultural references
- Use sophisticated ${languageName} literary language
- Keep ALL formatting (line breaks, paragraphs, spacing)
- DO NOT translate "deri" (author name) - keep as is
- DO NOT translate "Deri ve Kemik" - keep as is

STORY TO TRANSLATE:
Title: ${story.title}
Excerpt: ${story.excerpt}

Content:
${story.content}

---

Return ONLY a valid JSON object (no markdown, no code blocks) with this exact structure:
{
  "title": "translated title here",
  "excerpt": "translated excerpt here (150-200 characters)",
  "content": "translated full content here"
}`

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
            content: 'You are a professional literary translator. You ALWAYS return valid JSON only, without markdown code blocks or any other formatting.'
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
      const errorText = await response.text()
      console.error(`API error: ${response.status} ${response.statusText}`, errorText)
      return null
    }

    const data = await response.json()
    let translatedText = data.choices[0].message.content.trim()
    
    // Remove markdown code blocks if present
    if (translatedText.includes('```json')) {
      translatedText = translatedText.split('```json')[1].split('```')[0].trim()
    } else if (translatedText.includes('```')) {
      translatedText = translatedText.split('```')[1].split('```')[0].trim()
    }
    
    const translation = JSON.parse(translatedText)
    
    return {
      ...story,
      title: translation.title,
      excerpt: translation.excerpt,
      content: translation.content,
      locale
    }
    
  } catch (error) {
    console.error(`Error translating "${story.title}":`, error)
    return null
  }
}

async function main() {
  try {
    // Load original stories
    const storiesData: Story[] = JSON.parse(fs.readFileSync('stories_to_translate.json', 'utf-8'))
    console.log(`\n📚 Loaded ${storiesData.length} stories to translate\n`)
    
    // Translate to each language
    for (const [locale, languageName] of Object.entries(LANGUAGES)) {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`🌍 TRANSLATING TO ${languageName.toUpperCase()} (${locale})`)
      console.log('='.repeat(60))
      
      const translatedStories: TranslatedStory[] = []
      
      for (let i = 0; i < storiesData.length; i++) {
        const story = storiesData[i]
        console.log(`\n[${i + 1}/${storiesData.length}] Translating: "${story.title}"`)
        console.log(`  Length: ${story.content.length} chars`)
        
        const translated = await translateSingleStory(story, locale, languageName)
        
        if (translated) {
          translatedStories.push(translated)
          console.log(`  ✅ SUCCESS`)
        } else {
          console.log(`  ❌ FAILED`)
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      // Save translations for this language
      const filename = `translations_${locale}.json`
      fs.writeFileSync(filename, JSON.stringify(translatedStories, null, 2))
      console.log(`\n💾 Saved ${translatedStories.length}/${storiesData.length} translations to ${filename}`)
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('🎉 ALL TRANSLATIONS COMPLETED!')
    console.log('='.repeat(60))
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  }
}

main()
