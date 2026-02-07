import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Öykü imzalarını değiştiriyoruz...\n');
  
  // Tüm öyküleri al
  const stories = await prisma.story.findMany();
  
  for (const story of stories) {
    // İçerikte "Meltem AVCI" veya "Meltem Avcı" varsa değiştir
    let updatedContent = story.content;
    
    if (updatedContent.includes('Meltem AVCI') || updatedContent.includes('Meltem Avcı') || updatedContent.includes('Meltem AVC') || updatedContent.includes('MELTEM AVCI')) {
      // Tüm varyasyonları değiştir
      updatedContent = updatedContent
        .replace(/Meltem AVCI/g, 'deri')
        .replace(/Meltem Avcı/g, 'deri')
        .replace(/Meltem AVC/g, 'deri')
        .replace(/MELTEM AVCI/g, 'deri')
        .replace(/Meltem AVCI/gi, 'deri');  // case insensitive
      
      // Veritabanında güncelle
      await prisma.story.update({
        where: { id: story.id },
        data: { content: updatedContent }
      });
      
      console.log(`✅ "${story.title}" - imza güncellendi`);
    } else {
      console.log(`ℹ️ "${story.title}" - imza zaten doğru veya bulunamadı`);
    }
  }
  
  console.log('\n🎉 Tüm öykü imzaları başarıyla kontrol edildi ve güncellendi!');
}

main()
  .catch((e) => {
    console.error('❌ Hata:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
