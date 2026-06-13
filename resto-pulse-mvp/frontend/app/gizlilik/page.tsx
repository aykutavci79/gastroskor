import { LegalDocument } from '@/components/LegalDocument';

export const metadata = {
  title: 'Gizlilik Politikası | GastroSkor',
  alternates: { canonical: '/gizlilik' },
};

export default function PrivacyPage() {
  return (
    <LegalDocument title="Gizlilik Politikası" updated="10 Haziran 2026">
      <p>
        GastroSkor (&quot;biz&quot;), mobil uygulama ve web sitesi üzerinden restoran keşfi, yorum, sosyal
        özellikler, online sipariş iletimi ve işletme paneli hizmetleri sunar. Bu metin özet bilgilendirme
        içindir; ayrıntılı hukuki metin için{' '}
        <a href="/kvkk" className="text-accent hover:underline">
          KVKK Politikası
        </a>
        &apos;na bakın.
      </p>
      <h2 className="text-lg font-semibold text-content">Topladığımız veriler</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Google ile giriş yaptığınızda: ad, e-posta, profil fotoğrafı URL&apos;si ve Google hesap kimliği.</li>
        <li>Konum izni verdiğinizde: cihaz konumu (yakındaki restoranları göstermek için).</li>
        <li>Yorum ve fotoğraf paylaştığınızda: puan, metin ve yüklediğiniz görseller.</li>
        <li>Takma ad, takip, arkadaşlık, özel mesaj ve gurme sohbet odalarında yazdıklarınız.</li>
        <li>Online siparişte: doğrulanmış telefon numarası ve teslimat adresi (restorana iletilir).</li>
        <li>Bildirim izni verdiğinizde: push bildirim token&apos;ı (yalnızca hizmet bildirimleri).</li>
        <li>İşletme paneli kullanımında: mekan bilgileri, menü ve tanıtım içerikleri.</li>
      </ul>
      <h2 className="text-lg font-semibold text-content">Verileri neden kullanıyoruz</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Hesap oluşturma ve oturum yönetimi</li>
        <li>Restoran arama, listeleme ve mesafe hesaplama</li>
        <li>Yorumların gösterilmesi ve GastroSkor puanı</li>
        <li>İşletme sahiplerine panel ve bildirim hizmetleri</li>
        <li>Online sipariş talebinin ilgili restorana iletilmesi</li>
        <li>Hizmet güvenliği ve kötüye kullanımın önlenmesi</li>
      </ul>
      <p>
        Ticari pazarlama amaçlı e-posta veya kampanya bildirimi göndermiyoruz; push bildirimleri yalnızca
        hizmetle ilgilidir (sipariş, yorum, panel vb.).
      </p>
      <h2 className="text-lg font-semibold text-content">Üçüncü taraflar</h2>
      <p>
        Google (OAuth, Places API), barındırma (Railway, Vercel), push altyapısı (Expo), sipariş telefon
        doğrulama için SMS sağlayıcısı ve sipariş verdiğiniz restoran. Yurt dışı aktarım ve ayrıntılar{' '}
        <a href="/kvkk" className="text-accent hover:underline">
          KVKK Politikası
        </a>
        &apos;nda açıklanmıştır.
      </p>
      <h2 className="text-lg font-semibold text-content">Saklama ve güvenlik</h2>
      <p>
        Verileriniz şifreli bağlantı (HTTPS) ile iletilir. Yorum fotoğrafları sunucuda saklanır. Hesabınızı
        silmek veya verilerinize erişmek için{' '}
        <a href="/hesap-sil" className="text-accent hover:underline">
          Hesap ve veri silme
        </a>{' '}
        sayfasındaki adımları izleyin veya{' '}
        <a href="mailto:destek@gastroskor.com.tr" className="text-accent hover:underline">
          destek@gastroskor.com.tr
        </a>{' '}
        adresine yazın.
      </p>
      <h2 className="text-lg font-semibold text-content">Çocuklar</h2>
      <p>Hizmetimiz 13 yaş altına yönelik değildir.</p>
      <h2 className="text-lg font-semibold text-content">Değişiklikler</h2>
      <p>Bu politikayı güncelleyebiliriz. Önemli değişiklikler uygulama veya sitede duyurulur.</p>
    </LegalDocument>
  );
}
