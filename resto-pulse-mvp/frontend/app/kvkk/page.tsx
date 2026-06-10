import { LegalDocument } from '@/components/LegalDocument';

export const metadata = {
  title: 'KVKK — Kişisel Verilerin Korunması ve İşlenmesi | GastroSkor',
  description:
    'GastroSkor kişisel verilerin korunması, işlenmesi ve gizlilik politikası — 6698 sayılı KVKK kapsamında aydınlatma metni.',
};

export default function KvkkPage() {
  return (
    <LegalDocument
      title="Kişisel Verilerin Korunması, İşlenmesi ve Gizlilik Politikası"
      updated="10 Haziran 2026"
    >
      <p>
        6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot; veya &quot;Kanun&quot;) kapsamında
        GastroSkor olarak kişisel verilerinizi hukuka uygun şekilde işlemekte ve korumaktayız. Bu politika;
        mobil uygulama, web sitesi (<strong>gastroskor.com.tr</strong>) ve işletme paneli üzerinden sunduğumuz
        hizmetlerde işlenen kişisel verilere ilişkindir.
      </p>
      <p>
        Yürürlükteki mevzuat ile bu politika arasında uyumsuzluk olması halinde öncelikle yürürlükteki mevzuat
        uygulanır. Politika güncellenebilir; güncel sürüm web sitemizde yayımlanır.
      </p>

      <h2 className="text-lg font-semibold text-content">I. Veri sorumlusu</h2>
      <p>
        <strong>Veri sorumlusu:</strong> GastroSkor
        <br />
        <strong>İletişim / KVKK başvuruları:</strong>{' '}
        <a href="mailto:destek@gastroskor.com.tr" className="text-accent hover:underline">
          destek@gastroskor.com.tr
        </a>
      </p>
      <p className="text-xs">
        Şirket tescili tamamlandığında ticari unvan ve açık adres bu bölümde güncellenecektir.
      </p>

      <h2 className="text-lg font-semibold text-content">II. Kişisel verilerin işlenmesi</h2>

      <h3 className="font-semibold text-content">II.I. İşleme ilkeleri</h3>
      <p>Kişisel verileriniz KVKK md. 4 kapsamında aşağıdaki ilkelere uygun işlenir:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>Hukuka ve dürüstlük kurallarına uygunluk</li>
        <li>Doğru ve gerektiğinde güncel olma</li>
        <li>Belirli, açık ve meşru amaçlarla işleme</li>
        <li>İşlendikleri amaçla bağlantılı, sınırlı ve ölçülü olma</li>
        <li>İlgili mevzuatta öngörülen veya işleme amacı için gerekli süre kadar muhafaza</li>
      </ul>

      <h3 className="font-semibold text-content">II.II. Özel nitelikli kişisel veriler</h3>
      <p>
        KVKK md. 6 kapsamındaki özel nitelikli kişisel verileri (ırk, sağlık, biyometrik veri vb.){' '}
        <strong>bilerek işlemiyoruz</strong>. Bu tür verileri gönüllü olarak paylaşmanız halinde ilgili
        içerik moderasyon veya destek süreçleri kapsamında sınırlı şekilde görülebilir; bu durumda veriyi
        silmenizi veya anonimleştirmemizi talep edebilirsiniz.
      </p>

      <h3 className="font-semibold text-content">II.III. İşleme şartları ve amaçları</h3>
      <p>
        Kişisel verileriniz; KVKK md. 5 ve 6&apos;da sayılan şartlardan birine dayanılarak — özellikle
        hizmet sözleşmesinin kurulması ve ifası, hukuki yükümlülük, meşru menfaat ve gerektiğinde açık
        rızanız — aşağıdaki amaçlarla işlenir:
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>Hesap oluşturma, Google ile kimlik doğrulama ve oturum yönetimi</li>
        <li>Restoran keşfi, arama, listeleme ve konumunuza göre mesafe hesaplama</li>
        <li>Yorum, puan, fotoğraf, check-in ve GastroSkor puanının gösterilmesi</li>
        <li>Sosyal özellikler: takip, arkadaşlık, özel mesaj (DM), gurme sohbet odaları</li>
        <li>Online sipariş talebinin doğrulanmış telefon ile restorana iletilmesi</li>
        <li>İşletme paneli, mekan sahipliği başvurusu ve panel bildirimleri</li>
        <li>Telafi / kupon süreçleri (şikâyet sonrası telafi akışı)</li>
        <li>
          Hizmet bildirimleri (push): sipariş durumu, yorum cevabı, takip, panel uyarıları —{' '}
          <strong>ticari pazarlama amaçlı ileti gönderilmez</strong>
        </li>
        <li>Platform güvenliği, kötüye kullanım ve spam önleme, hız sınırlama</li>
        <li>Hukuki uyuşmazlıklarda delil saklama ve yetkili kurumlara yasal bildirim</li>
        <li>Hizmet kalitesinin ölçülmesi ve ürün geliştirme (mümkün olduğunda anonim/istatistiksel)</li>
      </ul>

      <h2 className="text-lg font-semibold text-content">III. Kişisel verilerin aktarılması</h2>

      <h3 className="font-semibold text-content">III.I. Genel ilkeler</h3>
      <p>
        Kişisel verileriniz; KVKK md. 8&apos;deki şartlardan birinin bulunması halinde, işleme amacıyla
        sınırlı ve gerekli güvenlik önlemleri alınarak üçüncü kişilere aktarılabilir.
      </p>

      <h3 className="font-semibold text-content">III.II. Yurt dışına aktarım</h3>
      <p>
        Altyapı ve kimlik doğrulama hizmetleri nedeniyle verileriniz yurt dışındaki sunucularda işlenebilir.
        Örneğin: Google (OAuth, Places API), barındırma sağlayıcıları (Railway, Vercel) ve push bildirim
        altyapısı (Expo). Yurt dışına aktarımda KVKK md. 9&apos;a uygun olarak yeterli koruma, standart
        sözleşme veya Kanun&apos;da öngörülen diğer güvenceler sağlanır.
      </p>

      <h3 className="font-semibold text-content">III.III. Aktarım yapılan üçüncü taraflar</h3>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Google:</strong> hesap girişi (OAuth) ve mekan bilgisi / fotoğraf (Places API) — Google
          gizlilik politikasına tabidir
        </li>
        <li>
          <strong>Barındırma:</strong> Railway (API/sunucu), Vercel (web sitesi), isteğe bağlı bulut depolama
          (ör. Cloudflare R2 / S3 uyumlu) — yorum ve panel görselleri
        </li>
        <li>
          <strong>Expo:</strong> mobil push bildirim token&apos;larının iletimi
        </li>
        <li>
          <strong>SMS sağlayıcısı</strong> (Netgsm, İleti Merkezi vb.): online sipariş telefon doğrulama
          (OTP) — yalnızca doğrulama amacıyla telefon numarası
        </li>
        <li>
          <strong>Restoran / işletme:</strong> online sipariş verdiğinizde sipariş detayı, doğrulanmış telefon
          ve teslimat adresi ilgili restorana iletilir; restoran bu veride veri sorumlusu sıfatıyla ayrıca
          sorumludur
        </li>
        <li>
          <strong>Yetkili kamu kurumları:</strong> kanuni zorunluluk halinde, talep kapsamıyla sınırlı
        </li>
      </ul>

      <h2 className="text-lg font-semibold text-content">IV. Kişisel verilerin korunması</h2>
      <p>Güvenlik için alınan önlemlerden örnekler:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>HTTPS ile şifreli iletişim</li>
        <li>Erişim yetkilendirme ve oturum token&apos;ları (JWT)</li>
        <li>API hız sınırlama ve üretim ortamında geliştirici uçlarının kapatılması</li>
        <li>OTP kodlarının hash&apos;lenerek saklanması ve kısa süreli geçerlilik</li>
        <li>Yetkisiz erişim risklerine karşı barındırma ve veritabanı erişim kontrolleri</li>
        <li>Veri ihlali halinde KVKK md. 12 uyarınca bildirim yükümlülüklerinin yerine getirilmesi</li>
      </ul>

      <h2 className="text-lg font-semibold text-content">
        V. Aydınlatma, haklarınız ve başvuru
      </h2>

      <h3 className="font-semibold text-content">V.I. Aydınlatma</h3>
      <p>
        Kişisel verileriniz elde edilirken KVKK md. 10 uyarınca; veri sorumlusunun kimliği, işleme amaçları,
        aktarım alıcıları, toplama yöntemi ve hukuki sebebi ile md. 11 kapsamındaki haklarınız hakkında
        bilgilendirilirsiniz. Uygulama içi izin ekranları (konum, bildirim, kamera/galeri) bu kapsamdadır.
      </p>

      <h3 className="font-semibold text-content">V.II. Haklarınız (KVKK md. 11)</h3>
      <p>Kanun kapsamında aşağıdaki haklara sahipsiniz:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
        <li>İşlenmişse buna ilişkin bilgi talep etme</li>
        <li>İşlenme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme</li>
        <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme</li>
        <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme</li>
        <li>
          KVKK md. 7 kapsamında silinmesini veya yok edilmesini isteme; aktarıldığı üçüncü kişilere
          bildirilmesini talep etme
        </li>
        <li>
          Münhasıran otomatik sistemlerle analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına
          itiraz etme
        </li>
        <li>Kanuna aykırı işleme sebebiyle zarara uğramanız halinde zararın giderilmesini talep etme</li>
      </ul>
      <p>
        KVKK md. 28 uyarınca belirli istisnai hallerde (ör. resmi istatistik, soruşturma süreçleri) bu
        hakların kullanımı sınırlandırılabilir.
      </p>

      <h3 className="font-semibold text-content">V.III. Başvuru yöntemi</h3>
      <p>
        Haklarınıza ilişkin taleplerinizi{' '}
        <a href="mailto:destek@gastroskor.com.tr?subject=KVKK%20ba%C5%9Fvurusu" className="text-accent hover:underline">
          destek@gastroskor.com.tr
        </a>{' '}
        adresine &quot;KVKK başvurusu&quot; konulu e-posta ile iletebilirsiniz. Başvurunuzda talebinizi açık
        belirtmeniz ve GastroSkor&apos;a kayıtlı e-posta adresinizden yazmanız, kimliğinizin doğrulanması
        açısından gereklidir.
      </p>
      <p>
        Talepler, niteliğine göre en geç <strong>30 gün</strong> içinde ücretsiz olarak yanıtlanır. İşlemin
        ayrıca maliyet gerektirmesi halinde Kişisel Verileri Koruma Kurulu tarifesi uygulanabilir.
      </p>
      <p>
        Hesap ve veri silme adımları için{' '}
        <a href="/hesap-sil" className="text-accent hover:underline">
          Hesap ve veri silme
        </a>{' '}
        sayfasına bakabilirsiniz.
      </p>
      <p>
        Başvurunuzun reddedilmesi, yetersiz bulunması veya süresinde yanıt verilmemesi halinde KVKK md. 14
        uyarınca Kişisel Verileri Koruma Kurulu&apos;na şikâyet hakkınız saklıdır.
      </p>

      <h2 className="text-lg font-semibold text-content">VI. Veri sahibi ve veri kategorileri</h2>

      <h3 className="font-semibold text-content">VI.I. Veri sahibi kategorileri</h3>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Kullanıcı:</strong> uygulama veya web sitesini kullanan gerçek kişiler
        </li>
        <li>
          <strong>İşletme paneli kullanıcısı:</strong> mekan sahibi veya yetkili temsilciler
        </li>
        <li>
          <strong>Potansiyel işletme başvurusu:</strong> işletme başvuru formu dolduranlar
        </li>
        <li>
          <strong>Ziyaretçi:</strong> giriş yapmadan siteyi ziyaret edenler (sınırlı teknik veriler)
        </li>
      </ul>

      <h3 className="font-semibold text-content">VI.II. Kişisel veri kategorileri</h3>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Kimlik / profil:</strong> ad, takma ad (nickname), avatar, Google hesap kimliği
        </li>
        <li>
          <strong>İletişim:</strong> e-posta; online sipariş için doğrulanmış telefon numarası
        </li>
        <li>
          <strong>Konum:</strong> cihaz konumu (izin verdiğinizde); check-in kayıtları
        </li>
        <li>
          <strong>Müşteri işlem:</strong> yorum, puan, sipariş, DM, gurme sohbet mesajları, takip ve arkadaşlık
          kayıtları, telafi kuponları
        </li>
        <li>
          <strong>Görsel kayıtlar:</strong> yorum ve panel yüklemeleri
        </li>
        <li>
          <strong>İşlem güvenliği:</strong> oturum token&apos;ları, push token, teknik loglar, IP (kısa süreli)
        </li>
        <li>
          <strong>İşletme / hukuki işlem:</strong> panel başvurusu, sahiplik talebi ve destek yazışmaları
        </li>
      </ul>
      <p>
        Ödeme kartı bilgisi <strong>işlenmez</strong>; uygulama içi ödeme altyapısı bulunmamaktadır.
      </p>

      <h2 className="text-lg font-semibold text-content">VII. Saklama süreleri</h2>
      <p>
        Kişisel veriler; ilgili mevzuatta öngörülen süreler ve işleme amacının gerektirdiği süre boyunca
        saklanır. Örnekler:
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>Hesap verileri: hesabınız aktif olduğu sürece</li>
        <li>OTP kayıtları: doğrulama sonrası kısa süre; güvenlik amaçlı sınırlı tutulur</li>
        <li>Yorum ve sipariş kayıtları: hizmet sunumu ve olası hukuki talepler için makul süre</li>
        <li>
          İşleme amacı ortadan kalktığında veya silme talebiniz üzerine veriler silinir, yok edilir veya
          anonimleştirilir; yalnızca hukuki uyuşmazlık veya zamanaşımı süreleri için sınırlı saklama
          yapılabilir
        </li>
      </ul>

      <h2 className="text-lg font-semibold text-content">
        VIII. Silinme, yok edilme ve anonimleştirme
      </h2>
      <p>
        KVKK md. 7 ve ilgili mevzuat uyarınca, işlenmesini gerektiren sebeplerin ortadan kalkması halinde
        kişisel verileriniz silinir, yok edilir veya anonim hale getirilir. Talebinizi{' '}
        <a href="/hesap-sil" className="text-accent hover:underline">
          hesap silme sayfası
        </a>{' '}
        veya{' '}
        <a href="mailto:destek@gastroskor.com.tr" className="text-accent hover:underline">
          destek@gastroskor.com.tr
        </a>{' '}
        üzerinden iletebilirsiniz.
      </p>

      <h2 className="text-lg font-semibold text-content">İlgili metinler</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <a href="/gizlilik" className="text-accent hover:underline">
            Gizlilik Politikası
          </a>{' '}
          — özet kullanıcı bilgilendirmesi
        </li>
        <li>
          <a href="/kullanim-kosullari" className="text-accent hover:underline">
            Kullanım Koşulları
          </a>
        </li>
        <li>
          <a href="/hesap-sil" className="text-accent hover:underline">
            Hesap ve veri silme
          </a>
        </li>
      </ul>
    </LegalDocument>
  );
}
