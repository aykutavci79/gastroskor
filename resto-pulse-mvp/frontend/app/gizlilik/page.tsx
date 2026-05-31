import { LegalDocument } from '@/components/LegalDocument';

export const metadata = {
  title: 'Gizlilik Politikası | GastroSkor',
};

export default function PrivacyPage() {
  return (
    <LegalDocument title="Gizlilik Politikası" updated="30 Mayıs 2026">
      <p>
        GastroSkor (&quot;biz&quot;), mobil uygulama ve web sitesi üzerinden restoran keşfi, yorum ve işletme
        paneli hizmetleri sunar. Bu metin, kişisel verilerinizi nasıl işlediğimizi açıklar.
      </p>
      <h2 className="text-lg font-semibold text-content">Topladığımız veriler</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Google ile giriş yaptığınızda: ad, e-posta, profil fotoğrafı URL&apos;si ve Google hesap kimliği.</li>
        <li>Konum izni verdiğinizde: cihaz konumu (yakındaki restoranları göstermek için).</li>
        <li>Yorum ve fotoğraf paylaştığınızda: puan, metin ve yüklediğiniz görseller.</li>
        <li>İşletme paneli kullanımında: mekan bilgileri, menü ve tanıtım içerikleri.</li>
      </ul>
      <h2 className="text-lg font-semibold text-content">Verileri neden kullanıyoruz</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Hesap oluşturma ve oturum yönetimi</li>
        <li>Restoran arama, listeleme ve mesafe hesaplama</li>
        <li>Yorumların gösterilmesi ve GastroSkor puanı</li>
        <li>İşletme sahiplerine panel ve bildirim hizmetleri</li>
        <li>Hizmet güvenliği ve kötüye kullanımın önlenmesi</li>
      </ul>
      <h2 className="text-lg font-semibold text-content">Üçüncü taraflar</h2>
      <p>
        Google Places API (mekan bilgisi ve fotoğraflar), barındırma sağlayıcıları (Railway, Vercel) ve
        kimlik doğrulama (Google OAuth) kullanıyoruz. Bu sağlayıcılar kendi gizlilik politikalarına tabidir.
      </p>
      <h2 className="text-lg font-semibold text-content">Saklama ve güvenlik</h2>
      <p>
        Verileriniz şifreli bağlantı (HTTPS) ile iletilir. Yorum fotoğrafları sunucuda saklanır. Hesabınızı
        silmek veya verilerinize erişmek için{' '}
        <a href="mailto:destek@gastroskor.com.tr" className="text-accent hover:underline">
          destek@gastroskor.com.tr
        </a>{' '}
        adresine yazabilirsiniz.
      </p>
      <h2 className="text-lg font-semibold text-content">Çocuklar</h2>
      <p>Hizmetimiz 13 yaş altına yönelik değildir.</p>
      <h2 className="text-lg font-semibold text-content">Değişiklikler</h2>
      <p>Bu politikayı güncelleyebiliriz. Önemli değişiklikler uygulama veya sitede duyurulur.</p>
    </LegalDocument>
  );
}
