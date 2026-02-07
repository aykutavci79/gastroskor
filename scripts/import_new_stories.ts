import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface StoryData {
  title: string;
  slug: string;
  author: string;
  excerpt: string;
  content: string;
  publishedAt: Date;
  illustrationUrl: string;
}

const stories: StoryData[] = [
  {
    title: 'Kargalar ve Martilar',
    slug: 'kargalar-ve-martilar',
    author: 'deri',
    excerpt: 'İbrahim ile köprü üzerinde yapılan bir sohbet, çocukluk travmaları, hayatın anlam arayışı ve karanlık yanlarımızla yüzleşme üzerine derin bir öykü.',
    content: fs.readFileSync(path.join(__dirname, 'imported_stories/Kargalar ve Martilar.txt'), 'utf-8'),
    publishedAt: new Date('2024-11-15'),
    illustrationUrl: '/illustrations/kargalar_ve_martilar.jpg'
  },
  {
    title: 'Kuşlar',
    slug: 'kuslar',
    author: 'deri',
    excerpt: 'Dünyanın insanlara ait olmadığını düşünen bir anlatıcının, kuşların büyük eylemi ve sonrasında yaşadığı pişmanlık ve içsel hesaplaşma.',
    content: fs.readFileSync(path.join(__dirname, 'imported_stories/Kuslar.txt'), 'utf-8'),
    publishedAt: new Date('2024-12-01'),
    illustrationUrl: '/illustrations/kuslar.jpg'
  },
  {
    title: 'Ölü Adam',
    slug: 'olu-adam',
    author: 'deri',
    excerpt: 'Bir hastanenin yoğun bakım ünitesinde yaşanan gizemli olaylar ve Ölü Adam ile kurulan sıra dışı bir dostluk üzerine gerilim dolu bir anlatı.',
    content: fs.readFileSync(path.join(__dirname, 'imported_stories/olu Adam.txt'), 'utf-8'),
    publishedAt: new Date('2024-12-10'),
    illustrationUrl: '/illustrations/olu_adam.jpg'
  },
  {
    title: 'Zevahir Yokuşu',
    slug: 'zevahir-yokusu',
    author: 'deri',
    excerpt: 'Bir mahallenin değişimi, kaybolmuş arkadaşlıklar ve geçmişin hayaletleriyle hesaplaşan bir anlatıcının hüzünlü öyküsü.',
    content: fs.readFileSync(path.join(__dirname, 'imported_stories/Zevahir Yokusu.txt'), 'utf-8'),
    publishedAt: new Date('2024-12-20'),
    illustrationUrl: '/illustrations/zevahir_yokusu.jpg'
  },
  {
    title: 'Düşüş',
    slug: 'dusus',
    author: 'deri',
    excerpt: 'Bir düşme sonrası hafızasını kaybeden bir kadının, geçmişindeki şiddet ve aldatmalarla dolu evliliğini yeniden keşfetmesi.',
    content: fs.readFileSync(path.join(__dirname, 'imported_stories/dusus.txt'), 'utf-8'),
    publishedAt: new Date('2025-01-05'),
    illustrationUrl: '/illustrations/dusus.jpg'
  },
  {
    title: 'Öldür Onu',
    slug: 'oldur-onu',
    author: 'deri',
    excerpt: 'Yazar tıkanmasıyla boğuşan bir yazarın, zihnindeki sesin etkisiyle girdiği karanlık ve gerilimli bir yolculuk.',
    content: fs.readFileSync(path.join(__dirname, 'imported_stories/oldur Onu.txt'), 'utf-8'),
    publishedAt: new Date('2025-01-15'),
    illustrationUrl: '/illustrations/oldur_onu.jpg'
  },
  {
    title: 'Son Gösteri',
    slug: 'son-gosteri',
    author: 'deri',
    excerpt: 'Emekli bir tiyatro oyuncusunun, hayallerinin peşinden giderek unutulmuş bir mahallede başlattığı umut dolu son gösterisi.',
    content: fs.readFileSync(path.join(__dirname, 'imported_stories/Son Gosteri.txt'), 'utf-8'),
    publishedAt: new Date('2025-01-25'),
    illustrationUrl: '/illustrations/son_gosteri.jpg'
  }
];

async function main() {
  console.log('📚 Yeni öyküleri içe aktarıyoruz...\n');

  for (const storyData of stories) {
    // Aynı slug ile öykü var mı kontrol et
    const existing = await prisma.story.findFirst({
      where: { slug: storyData.slug }
    });

    if (existing) {
      console.log(`⏭️  "${storyData.title}" zaten mevcut, atlanıyor...`);
      continue;
    }

    // Yeni öykü oluştur
    const story = await prisma.story.create({
      data: storyData
    });

    console.log(`✅ "${story.title}" başarıyla eklendi (${story.publishedAt.toLocaleDateString('tr-TR')})`);
  }

  console.log('\n🎉 Tüm yeni öyküler başarıyla içe aktarıldı!');
  
  // Toplam öykü sayısını göster
  const totalStories = await prisma.story.count();
  console.log(`\n📖 Toplam öykü sayısı: ${totalStories}`);
}

main()
  .catch((e) => {
    console.error('❌ Hata:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
