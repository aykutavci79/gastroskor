import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const stories = await prisma.story.findMany({
    select: {
      id: true,
      title: true,
      content: true,
    }
  });
  
  stories.forEach(story => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Öykü: ${story.title}`);
    console.log(`ID: ${story.id}`);
    console.log(`${'='.repeat(60)}`);
    
    // Son 500 karakteri göster
    const lastChars = story.content.slice(-500);
    console.log('Son 500 karakter:');
    console.log(lastChars);
    
    // "Meltem" veya "Avcı" içeriyor mu kontrol et
    if (story.content.includes('Meltem') || story.content.includes('Avcı')) {
      console.log('\n⚠️ Bu öyküde "Meltem" veya "Avcı" kelimesi bulundu!');
    }
  });
}

main()
  .catch((e) => {
    console.error('Hata:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
