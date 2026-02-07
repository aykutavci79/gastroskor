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
    
    console.log(`Found ${stories.length} stories to export`)
    
    let wordContent = ''
    
    // Add header
    wordContent += '='.repeat(80) + '\n'
    wordContent += 'DERİ VE KEMİK - TÜM ÖYKÜLER\n'
    wordContent += 'Yazar: deri\n'
    wordContent += `Toplam Öykü Sayısı: ${stories.length}\n`
    wordContent += `Dışa Aktarım Tarihi: ${new Date().toLocaleDateString('tr-TR')}\n`
    wordContent += '='.repeat(80) + '\n\n\n'
    
    // Add each story
    stories.forEach((story, index) => {
      wordContent += '\n' + '='.repeat(80) + '\n'
      wordContent += `ÖYKÜ ${index + 1} / ${stories.length}\n`
      wordContent += '='.repeat(80) + '\n\n'
      
      wordContent += `Başlık: ${story.title}\n`
      wordContent += `Yazar: deri\n`
      wordContent += `Yayın Tarihi: ${story.publishedAt.toLocaleDateString('tr-TR')}\n`
      wordContent += `Kelime Sayısı: ~${Math.round(story.content.split(/\s+/).length)} kelime\n\n`
      
      wordContent += '-'.repeat(80) + '\n\n'
      
      wordContent += story.content
      
      wordContent += '\n\n' + '-'.repeat(80) + '\n'
      wordContent += `Öykü Sonu\n`
      wordContent += '-'.repeat(80) + '\n\n\n'
    })
    
    // Add footer
    wordContent += '\n\n' + '='.repeat(80) + '\n'
    wordContent += 'DERİ VE KEMİK\n'
    wordContent += 'www.derivekemik.com\n'
    wordContent += 'İletişim: deri@derivekemik.com\n'
    wordContent += '='.repeat(80) + '\n'
    
    // Save to file
    const filename = 'Deri_ve_Kemik_Tum_Oykuler.txt'
    fs.writeFileSync(filename, wordContent, 'utf-8')
    
    console.log(`\n✅ Başarıyla dışa aktarıldı: ${filename}`)
    console.log(`📊 Toplam ${stories.length} öykü`)
    console.log(`📄 Dosya boyutu: ${(fs.statSync(filename).size / 1024).toFixed(2)} KB`)
    
  } catch (error) {
    console.error('Hata:', error)
  } finally {
    await prisma.$disconnect()
  }
}

exportStories()
