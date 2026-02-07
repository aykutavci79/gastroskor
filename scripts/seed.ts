import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin2024', 10)
  await prisma.user.upsert({
    where: { email: 'admin@derivekemik.com' },
    update: {},
    create: {
      email: 'admin@derivekemik.com',
      password: hashedPassword,
      name: 'Admin',
      role: 'admin',
    },
  })

  // Create test admin user
  const testHashedPassword = await bcrypt.hash('johndoe123', 10)
  await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: {
      email: 'john@doe.com',
      password: testHashedPassword,
      name: 'John Doe',
      role: 'admin',
    },
  })

  console.log('Admin users created')

  // Story 1: Sessizliğin Rengi
  const story1 = await prisma.story.upsert({
    where: {
      language_slug: { language: 'tr', slug: 'sessizligin-rengi' },
    },
    update: {},
    create: {
      title: 'Sessizliğin Rengi',
      slug: 'sessizligin-rengi',
      language: 'tr',
      author: 'deri',
      illustrationUrl: 'https://cdn.abacus.ai/images/76277e85-db73-4816-905c-be343c2d995d.png',
      excerpt:
        'Pencere kenarındaki sandalye, yıllardır aynı yerde duruyordu. Üzerinde kimse oturmuyordu artık, ama sessizliğin rengi onda belirginleşiyordu.',
      content: `Pencere kenarındaki sandalye, yıllardır aynı yerde duruyordu. Üzerinde kimse oturmuyordu artık, ama sessizliğin rengi onda belirginleşiyordu. Sarımsı bir ışık, öğleden sonraları pencerenin camlarından sızıp tahta arkasını ısıtıyordu. İlknur, mutfaktan baktığında sandalyeyi görüyordu. Her seferinde içi burkuluyordu.

Annesi orda oturmuştu en son. Bir kitap elinde, bir kahve fincandı yanında. O gün ne kitabı bitirmişti ne de kahvesini. Kalp krizi, doktorlar öyle demişlerdi. Sessizce, sanki ölüm de o sessizliğe saygı duymuşcasına, gitmişti annesi.

İlknur sandalyeyi kaldırmayı düşünmüştü defalarca. Ama her seferinde vazgeçmişti. Sandalye, sadece bir mobilya değildi artık. O, annesinin varlığının son iziydi. Onun sessiz çağrısıydı.

Bir gün, kış güneşinin solgun ışıkları pencereden içeri sızarken, İlknur cesaretini topladı. Sandalyeye oturdu. İlk defa oturuyordu annesinin öldüğü günden beri. Tahtanın soğukluğunu hissetti önce. Sonra, annesinin kokusunu andı. Lavanta ve kitap sağaları. Gözyaşları geldi.

Dışarıda, kar yağmaya başladı. Taneler yavaşça, sessizce indiğinde, İlknur annesinin sesini duyar gibi oldu. "Yaşam, sevgilim, sessizlikten öğrenilir. Gürültü sadece yüzeydedir. Asıl derinlik, suskunluktadır."

O an anladı. Annesi gitmemişti. Sessizlikte yaşıyordu. Her sabah açılan pencerenin ışığında, her akham kararan gökyüzünün maviliğinde, her anının derinliğinde. Sessizliğin rengi, belki de bu yuzden bu kadar belirgin görünüyordu sandalyede.

İlknur gülpmsedi. Artık biliyordu. Annesi her zaman oradaydı. Sessizlikle konuşmayı öğrenmeliydi sadece.`,
      publishedAt: new Date('2025-01-15'),
      viewCount: 0,
    },
  })

  // Story 2: Kayıp Mektuplar
  const story2 = await prisma.story.upsert({
    where: {
      language_slug: { language: 'tr', slug: 'kayip-mektuplar' },
    },
    update: {},
    create: {
      title: 'Kayıp Mektuplar',
      slug: 'kayip-mektuplar',
      language: 'tr',
      author: 'deri',
      illustrationUrl: 'https://cdn.abacus.ai/images/745d9222-ac63-4ff5-8b27-154b3cb936e5.png',
      excerpt:
        'Çatlanın derinliklerinde, tozlu bir kutu buldu Kerem. İçinde sararmış kağıtlar vardı. Mektuplar. Hiç gönderilmemiş aşk mektupları.',
      content: `Çatlanın derinliklerinde, tozlu bir kutu buldu Kerem. İçinde sararmış kağıtlar vardı. Mektuplar. Hiç gönderilmemiş aşk mektupları. Dedesinin elinden çıkma yazılar bunlar. Okudukça, hiç tanımadığı bir insanı tanımaya başladı.

Dedesi, ailenin ciddi, az konuşan, disiplinli adamıydı. Ama bu mektuplarda başka birisiydi. Genç, tutkulu, hayalperest. Sevdiği kadına yazmıştı bunları. "Elif" diyordu mektuplarda. Kerem'in ninesi değildi bu isim. Yani dedesi, ninesiyle evlenmeden önce başkasını sevmişti.

İlk mektup 1968 tarihini taşıyordu. Dedesi o zamanlar üniversite öğrencisiydi. Elif de aynı okulda okuyormuş. "Seni gördüğüm ilk gün, hayatımın anlamını buldum," diye yazmış dedesi. "Sen, benim şiirimsin, müziğimsin, nefesimsin."

Kerem okumaya devam etti. Onlarca mektup vardı. Hepsi aynı yoğunluktaydı, aynı tutkuyla yazılmıştı. Ama hiçbiri gönderilmemişti. Neden? Son mektup cevabı içeriyordu.

"Elif'im, yarın ailem seni istemek için gelecek. Ama biliyorum, kabul etmeyecekler. Sen başka şehirdensin, başka kültürden. Ailem bunu anlamıyor. Ben de yeterince güçlü değilim onlara karşı çıkmaya. Bu mektupları yazdım ama hiçbirini gönderemedim. Korktum. Sana açık eder, sonra ailem ters düşür, sen acı çekersin diye."

Kerem gözyaşlarını tutamadı. Dedesi, kendi mutluluğunu fıda etmişti. Korku içinde yaşamıştı. Ninesiyle evlenmiş, yıllar geçmiş, ama içinde hep o kayıp aşk varmış.

O akham, Kerem dedesinin mezarına gitti. Mektupları yanına aldı. "Dede," dedi sessizce. "Senin hikayeni öğrendim. Elif'i sevmişsin ama cesaret edememişsin. Ben senin hatanı yapmayacağım. Ben, kalbimin sesini dinleyeceğim."

Mektupları mezarın başına bıraktı. Rüzgar sayfaları hafifçe kaldırdı. Sanki dedesi, nihayet rahatlıyordu.`,
      publishedAt: new Date('2024-12-20'),
      viewCount: 0,
    },
  })

  // Story 3: Son Sonbahar
  const story3 = await prisma.story.upsert({
    where: {
      language_slug: { language: 'tr', slug: 'son-sonbahar' },
    },
    update: {},
    create: {
      title: 'Son Sonbahar',
      slug: 'son-sonbahar',
      language: 'tr',
      author: 'deri',
      illustrationUrl: 'https://cdn.abacus.ai/images/06edc9e9-6cb1-42be-b14e-c751a666c8c8.png',
      excerpt:
        'Yapraklar dökülüyordu. Her yıl dökülüyorlardı ama bu sonbahar farklıydı. Ayşe biliyordu. Bu, onun son sonbaharıydı.',
      content: `Yapraklar dökülüyordu. Her yıl dökülüyorlardı ama bu sonbahar farklıydı. Ayşe biliyordu. Bu, onun son sonbaharıydı. Doktorlar altı ay demìlerdi. Şimdi o altı ay dolmak üzereydi.

Parkta oturmuş, çocuğunu izliyordu. Beş yaşında, minnak, gülümsemesi tatlc. Yaprakları topluyordu, havaya atıyordu, gülüyordu. Ayşe'nin gözyaşları geldi. Oğlunu büyürken göremeyecekti.

Ne kadar hakzızlıktı bu. Otuz beş yaşındaydı sadece. Daha çok yaşamak istiyordu. Oğluna okumayı öğretmek, bisiklete binmeyi öğretmek, hayat dersleri vermek istiyordu. Ama zaman tükeniyordu.

"Anne, bak!" diye bağırdı oğlu. Elinde kırmızı bir yaprak vardı. "Bu senin için!"

Ayşe gülpmsedi. Yaprağı aldı. Kırmızı, turuncu, sarı tonlardı iç içe. Güzeldi. Ama soluyor, kuruyordu. Tıpkı kendisi gibi.

"Teşekkür ederim, oğlum," dedi. "Biliyor musun, yapraklar dökülür ama ağaç ölmez. Bahar gelince, yeni yapraklar çıkar. Hayat, böyle devam eder."

Oğlu başıyla onaylandı. "O zaman sen de baharda geri gelecek misin anne?"

Ayşe'nin kalbi sıkıştı. Ne söyleyebilirdi? Yalan mı söylemeli, gerçeği mi? Karar verdi. Gerçek, her zaman daha iyiydi.

"Hayır oğlum," dedi yavaşça. "Ben geri gelmeyeceğim. Ama sen, benim yeni yaprağımsın. Sen, benim devamımsın. Her baharda, sen büyüyeceksin. Ben de içinde yaşayacam."

Oğlu kafasını eğdi. "Anlamadım anne."

"Anlamak zorunda değilsin şimdi," dedi Ayşe. "Zamanla anlayacaksın. Bak, şu yaprak gibi. Düştü ama topraga karışacak. Topraga besin verecek. Bahar gelince, ağaç o besinden güç alacak, yeni yapraklar çıkaracak. Her şey bağlantılı. Hiçbir şey kaybolmuyor, sadece dönüşüyor."

O akham, Ayşe bir mektup yazdı oğluna. On sekiz yaşına girdiğinde okuması için. Mektupta, hayatın, ölümün, aşkın ve kaybm anlamını anlattı. Son sonbaharında öğrendiklerini, hissettiklerini paylaştı. Ve bitirdi: "Sen, benim ilkbaharımsın, oğlum. Her zaman unutma."`,
      publishedAt: new Date('2024-11-05'),
      viewCount: 0,
    },
  })

  // Story 4: Cam Evler
  const story4 = await prisma.story.upsert({
    where: {
      language_slug: { language: 'tr', slug: 'cam-evler' },
    },
    update: {},
    create: {
      title: 'Cam Evler',
      slug: 'cam-evler',
      language: 'tr',
      author: 'deri',
      illustrationUrl: 'https://cdn.abacus.ai/images/02ff088c-7097-4bad-bf6d-4d79336a465b.png',
      excerpt:
        'Murat, mükemmel bir hayat kurmuştu. Güzel bir eşi, başarılı bir kariyeri, lüks bir evi vardı. Ama her şey camdan gibiydi. Kırılgan.',
      content: `Murat, mükemmel bir hayat kurmuştu. Güzel bir eşi, başarılı bir kariyeri, lüks bir evi vardı. Dışarıdan bakan herkes onu mutlu sanıyordu. Ama Murat biliyordu gerçeği. Her şey camdan gibiydi. Kırılgan.

Eşi Leyla, mükemmel bir eş gibi görünüyordu. Ama aralarında mesafe vardı. Fiziksel yakınlık ama duygusal uzaklık. Konuşuyorlardı ama gerçekten konuşmuyorlardı. Gülümsediler ama gerçekten gülmüyorlardı.

İşi de öyleydi. Başarılıydı, para kazanıyordu. Ama sevmiyordu yaptığı işi. Her sabah zorla kalkıyordu, ofise gidiyordu. Gerçek tutku, içinde bir yerlerde gömülüydü. Ressam olmak istemişti gençliğinde. Ama "pratik değil" demişlerdi. Mühendis olmuştu.

Bir gün, deprem oldu. Çok büyük değil, orta şiddette. Ev hasar görmedi. Ama o gün, Murat içindeki depremi hissetti. Dayanamadı artık.

Akşam, Leyla'ya oturdu. "Mutlu değilim," dedi. "Sen de değilsin. Bunu biliyorum. Neden devam ediyoruz?"

Leyla şaşırmıştı. Ama sonra rahatladı. "Ben de aynı şeyi düşünüyordum," dedi. "Ama söyleyemedim. Korktum."

"Neden korktun?"

"Cam evi kırmaktan. Dışarıdan güzel görünüyor. İçeride boşluk var ama kimse görmüyor."

Murat gülümsedi. "Belki de cam evi kırmalıyız. Belki de gerçek bir ev yapmalıyız. Taştan, ağaçtan, sevgiden."

Leyla düşündü. "Ama her şeyi kaybedeceğiz. Bu ev, bu hayat tarzı, bu statü..."

"Ama kendimizi bulacağız," dedi Murat. "Bence bu daha değerli."

O gece, uzun uzun konuştular. İlk defa gerçekten konuştular. Korkularını, hayallerini, pişmanlıklarını paylaştılar. Ve anladılar. Cam ev, güvenli vermiyordu aslında. Sadece bir yanılsama yaratıyordu.

Ertesi gün, Murat işten istifa etti. Resim yapmaya başladı. Para azaldı ama mutluluğu arttı. Leyla da işini değiştirdi, hep istediği ama "uygun olmayan" bir mesleğe geçti.

Cam evi kırdılar. Evet, parçalar savruldu. Evet, bazı insanlar anlamadı. Ama onlar, nihayet nefes alabiliyorlardı. Gerçek bir hayat yaşıyorlardı.`,
      publishedAt: new Date('2024-10-10'),
      viewCount: 0,
    },
  })

  // Story 5: Unutulan Şarkı
  const story5 = await prisma.story.upsert({
    where: {
      language_slug: { language: 'tr', slug: 'unutulan-sarki' },
    },
    update: {},
    create: {
      title: 'Unutulan Şarkı',
      slug: 'unutulan-sarki',
      language: 'tr',
      author: 'deri',
      illustrationUrl: 'https://cdn.abacus.ai/images/a28f81e8-842c-4965-8535-89f4cb91218b.png',
      excerpt:
        'Radyodan bir melodi duydu. Eski, unutulmuş bir şarkı. Mehmet durdu. Bu şarkıyı biliyordu. Ama nereden?',
      content: `Radyodan bir melodi duydu. Eski, unutulmuş bir şarkı. Mehmet durdu. Bu şarkıyı biliyordu. Ama nereden? Bellek, bulanıktı. Yıllar öncesinden bir anı, sanki sisin içinden çıkmaya çalışıyordu.

Sonra hatırladı. Ayşe. Lise aşkı. On dokuz yaşlarında, genç, tutkulu, hayalperestler. Bu şarkıyı birlikte dinlemişlerdi. Sahilde, gün batımında. "Bizim şarkımız," demişti Ayşe.

Ama sonra ayrılmışlardı. Mehmet başka şehre taşınmıştı eğitim için. Ayşe kalmıştı. "Uzaktan sevgiler yürümez," demişlerdi birbirlerine. Ama gerçekte, korkularındı. Uzaklık bahane olmuştu.

Yıllar geçmişti. Mehmet evlenmiş, boşanmış, yeni bir hayat kurmuştu. Ayşe'yi düşünmüyordu artık. En azından öyle sanıyordu. Ama şimdi, o şarkıyla birlikte, tüm anılar geri geliyordu.

Bir ara kendini sosyal medyada Ayşe'yi ararken buldu. Buldu. Profil fotoğrafına baktı. Kırk beş yaşındaydı artık ama hâlâ güzeldi.

Mesaj yaz... butonu önündeydi. Ne yazmalıydı? Sonunda basit bir mesaj yazdı: "Merhaba Ayşe, yıllar sonra seni bulmak güzel. Nasılsın?"

Gönder'e bastı. Kalbi hızlı atıyordu. Belki de Ayşe cevap vermeyecekti.

Ama bir saat sonra, telefonu titreşti. Mesaj gelmişti. "Mehmet! Seni de bulmak güzel. Yıllardır merak ediyordum ne yaptığını. Nasıl buldun beni?"

Mehmet gülümsedi. Uzun bir mesaj yazdı. Şarkıyı anlattı, anıları paylaştı. Ayşe de uzun bir cevap yazdı. O da aynı şeyi yaşamış.

O günden sonra, sık sık mesajlaştılar. Görüşmeye karar verdiler. Kahve içmeye. Eskiden oldukları sahilde buluştular.

Karşılaştıklarında, sessiz kaldılar. Sonra ikisi de güldü. "Yıllar geçmiş," dedi Ayşe.

"Ama bazı şeyler unutulmuyor," dedi Mehmet.

Kahvelerini içerken, o unutulan şarkı radyodan bir daha çaldı. İkisi de gülümsedi. Belki de unutulmamıştı o şarkı. Sadece sabırla, doğru anı bekliyordu.`,
      publishedAt: new Date('2024-09-01'),
      viewCount: 0,
    },
  })

  console.log('Stories created:', {
    story1: story1?.title,
    story2: story2?.title,
    story3: story3?.title,
    story4: story4?.title,
    story5: story5?.title,
  })

  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
