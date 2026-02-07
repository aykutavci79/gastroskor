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

// Improved JSON parsing with multiple fallback strategies
function parseTranslationJSON(rawText: string): any {
  let text = rawText.trim()
  
  // Strategy 1: Remove markdown code blocks
  if (text.includes('```json')) {
    text = text.split('```json')[1].split('```')[0].trim()
  } else if (text.includes('```')) {
    text = text.split('```')[1].split('```')[0].trim()
  }
  
  // Strategy 2: Extract JSON object from text
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    text = jsonMatch[0]
  }
  
  // Strategy 3: Try to parse
  try {
    return JSON.parse(text)
  } catch (e1) {
    // Strategy 4: Fix common issues
    try {
      // Fix unescaped newlines in strings
      text = text.replace(/([^\\])\n/g, '$1\\n')
      return JSON.parse(text)
    } catch (e2) {
      throw new Error(`JSON parse failed: ${e2}`)
    }
  }
}

async function translateSingleStory(
  story: Story, 
  locale: string, 
  languageName: string,
  attempt: number = 1
): Promise<TranslatedStory | null> {
  const maxAttempts = 3
  const apiKey = process.env.ABACUSAI_API_KEY
  
  if (!apiKey) {
    throw new Error('ABACUSAI_API_KEY not found')
  }

  const prompt = `You are a world-class literary translator specializing in Turkish literature. Translate this Turkish short story to ${languageName} with exceptional literary quality.

CRITICAL JSON FORMATTING RULES:
1. Return ONLY a valid JSON object
2. NO markdown code blocks (no \`\`\`json)
3. NO extra text before or after the JSON
4. Escape ALL special characters in strings (\\n for newlines, \\" for quotes)
5. Use proper JSON syntax throughout

LITERARY TRANSLATION GUIDELINES:
- Preserve emotional depth and poetic resonance
- Maintain the original's atmosphere and tone
- Use sophisticated ${languageName} literary language
- Keep cultural references (explain if needed in parentheses)
- Preserve ALL paragraph breaks and formatting
- DO NOT translate "deri" (author pen name)
- DO NOT translate "Deri ve Kemik" (site name)

STORY TO TRANSLATE:
Title: ${story.title}
Excerpt: ${story.excerpt}
Content Length: ${story.content.length} characters

Full Content:
${story.content}

---

RETURN FORMAT (pure JSON only):
{
  "title": "translated title",
  "excerpt": "translated excerpt (150-200 chars)",
  "content": "translated full content with \\n for line breaks"
}`

  try {
    console.log(`    [Attempt ${attempt}/${maxAttempts}] Calling API...`)
    
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
            content: 'You are a professional literary translator. You ALWAYS return ONLY pure JSON objects without any markdown formatting or explanatory text.'
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
      throw new Error(`API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const rawText = data.choices[0].message.content.trim()
    
    console.log(`    [Attempt ${attempt}] Parsing response...`)
    const translation = parseTranslationJSON(rawText)
    
    // Validate translation
    if (!translation.title || !translation.excerpt || !translation.content) {
      throw new Error('Invalid translation: missing required fields')
    }
    
    console.log(`    ✅ Translation successful`)
    
    return {
      ...story,
      title: translation.title,
      excerpt: translation.excerpt,
      content: translation.content,
      locale
    }
    
  } catch (error) {
    console.error(`    ❌ Attempt ${attempt} failed:`, error instanceof Error ? error.message : error)
    
    // Retry logic
    if (attempt < maxAttempts) {
      console.log(`    🔄 Retrying in 2 seconds...`)
      await new Promise(resolve => setTimeout(resolve, 2000))
      return translateSingleStory(story, locale, languageName, attempt + 1)
    }
    
    console.error(`    ❌ All ${maxAttempts} attempts failed for "${story.title}"`)
    return null
  }
}

async function main() {
  const startTime = Date.now()
  
  try {
    // Load original stories
    const storiesData: Story[] = JSON.parse(
      fs.readFileSync('stories_to_translate.json', 'utf-8')
    )
    
    console.log('\n' + '='.repeat(70))
    console.log('🌍 MULTI-LANGUAGE TRANSLATION PIPELINE')
    console.log('='.repeat(70))
    console.log(`📚 Stories to translate: ${storiesData.length}`)
    console.log(`🗣️  Languages: ${Object.values(LANGUAGES).join(', ')}`)
    console.log(`📊 Total translations: ${storiesData.length * Object.keys(LANGUAGES).length}`)
    console.log('='.repeat(70))
    
    const allResults: Record<string, { success: number; failed: number }> = {}
    
    // Translate to each language
    for (const [locale, languageName] of Object.entries(LANGUAGES)) {
      console.log(`\n${'='.repeat(70)}`)
      console.log(`🌍 TRANSLATING TO ${languageName.toUpperCase()} (${locale})`)
      console.log('='.repeat(70))
      
      const translatedStories: TranslatedStory[] = []
      let successCount = 0
      let failCount = 0
      
      for (let i = 0; i < storiesData.length; i++) {
        const story = storiesData[i]
        console.log(`\n  [${i + 1}/${storiesData.length}] "${story.title}"`)
        console.log(`  Length: ${story.content.length} chars`)
        
        const translated = await translateSingleStory(story, locale, languageName)
        
        if (translated) {
          translatedStories.push(translated)
          successCount++
        } else {
          failCount++
        }
        
        // Small delay between stories
        await new Promise(resolve => setTimeout(resolve, 1500))
      }
      
      // Save translations for this language
      const filename = `translations_${locale}.json`
      fs.writeFileSync(filename, JSON.stringify(translatedStories, null, 2))
      
      allResults[locale] = { success: successCount, failed: failCount }
      
      console.log(`\n  💾 Saved: ${filename}`)
      console.log(`  ✅ Success: ${successCount}/${storiesData.length}`)
      console.log(`  ❌ Failed: ${failCount}/${storiesData.length}`)
    }
    
    // Final summary
    const duration = Math.round((Date.now() - startTime) / 1000 / 60)
    
    console.log('\n' + '='.repeat(70))
    console.log('🎉 TRANSLATION PIPELINE COMPLETED!')
    console.log('='.repeat(70))
    console.log(`⏱️  Duration: ${duration} minutes`)
    console.log('\n📊 Results by Language:')
    
    for (const [locale, results] of Object.entries(allResults)) {
      const lang = LANGUAGES[locale as keyof typeof LANGUAGES]
      console.log(`  ${lang} (${locale}): ${results.success}✅ / ${results.failed}❌`)
    }
    
    console.log('\n📁 Output Files:')
    for (const locale of Object.keys(LANGUAGES)) {
      console.log(`  - translations_${locale}.json`)
    }
    
    console.log('\n' + '='.repeat(70))
    console.log('✨ Ready for next step: Database import and UI integration')
    console.log('='.repeat(70) + '\n')
    
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error)
    process.exit(1)
  }
}

main()
