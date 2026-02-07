import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

// Öykü içeriklerini harici dosyalardan okuyacağız
const anneContent = fs.readFileSync('/tmp/anne_story.txt', 'utf-8');
const beklemeContent = fs.readFileSync('/tmp/bekleme_story.txt', 'utf-8');
const binaContent = fs.readFileSync('/tmp/bina_story.txt', 'utf-8');
const sihirbazContent = fs.readFileSync('/tmp/sihirbaz_story.txt', 'utf-8');

async function main() {
  console.log('🗑️ Mevcut örnek öyküleri siliniyor...');
  
  await prisma.comment.deleteMany({});
  console.log('✅ Yorumlar silindi');
  
  const deleted = await prisma.story.deleteMany({});
  console.log(`✅ ${deleted.count} örnek öykü silindi\n`);
  
  console.log('📝 Gerçek öyküler yükleniyor...\n');
  
  const stories = [
    {
      title: 'Anne',
      slug: 'anne',
      content: anneContent,
      excerpt: 'Bir anne ve kızı arasındaki karmaşık ilişki, travmatik geçmiş ve dissosiyatif bozukluk üzerine derin bir öykü.',
      author: 'deri',
      publishedAt: new Date('2024-07-15'),
      illustrationUrl: '/illustrations/anne.jpg'
    },
    {
      title: 'Bekleme Listesi',
      slug: 'bekleme-listesi',
      content: beklemeContent,
      excerpt: 'Bir otobüs durağının gözünden insanlık halleri, acı ve çaresizlik üzerine sıra dışı bir perspektif.',
      author: 'deri',
      publishedAt: new Date('2024-08-20'),
      illustrationUrl: '/illustrations/bekleme_listesi.jpg'
    },
    {
      title: 'Bina',
      slug: 'bina',
      content: binaContent,
      excerpt: 'Dissosiyatif füg ve travma sonrası hafıza kaybı üzerine psikolojik bir gerilim öyküsü.',
      author: 'deri',
      publishedAt: new Date('2024-09-10'),
      illustrationUrl: '/illustrations/bina.jpg'
    },
    {
      title: 'Sihirbaz',
      slug: 'sihirbaz',
      content: sihirbazContent,
      excerpt: 'Bir sihirbaz asistanının intikamı: arkadaşının ölümünün sırrını ortaya çıkaran muhteşem bir final gösterisi.',
      author: 'deri',
      publishedAt: new Date('2024-10-05'),
      illustrationUrl: '/illustrations/sihirbaz.jpg'
    }
  ];
  
  for (const story of stories) {
    await prisma.story.create({ data: story });
    console.log(`✅ "${story.title}" eklendi`);
  }
  
  console.log('\n🎉 Tüm öyküler başarıyla yüklendi!');
}

main()
  .catch((e) => {
    console.error('❌ Hata:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
