import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Yazar isimlerini küçük harfe çeviriyoruz...\n');
  
  // Tüm 'Deri' olan öyküleri 'deri' yap
  const updatedDeri = await prisma.story.updateMany({
    where: { author: 'Deri' },
    data: { author: 'deri' }
  });
  
  console.log(`✅ ${updatedDeri.count} öykünün yazarı 'Deri' → 'deri' olarak güncellendi`);
  
  // Tüm 'Kemik' olan öyküleri 'kemik' yap (gelecekte eklenecekler için)
  const updatedKemik = await prisma.story.updateMany({
    where: { author: 'Kemik' },
    data: { author: 'kemik' }
  });
  
  console.log(`✅ ${updatedKemik.count} öykünün yazarı 'Kemik' → 'kemik' olarak güncellendi`);
  
  console.log('\n🎉 Tüm yazar isimleri başarıyla güncellendi!');
}

main()
  .catch((e) => {
    console.error('❌ Hata:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
