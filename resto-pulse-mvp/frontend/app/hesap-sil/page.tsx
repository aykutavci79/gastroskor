import { LegalDocument } from '@/components/LegalDocument';

export const metadata = {
  title: 'Hesap ve Veri Silme | GastroSkor',
  description: 'GastroSkor hesabınızı ve ilişkili verilerinizi silme ve indirme',
  alternates: { canonical: '/hesap-sil' },
};

export default function AccountDeletionPage() {
  return (
    <LegalDocument title="Hesap ve veri silme" updated="21 Haziran 2026">
      <p>
        Bu sayfa, <strong>GastroSkor</strong> mobil uygulaması ve{' '}
        <strong>gastroskor.com.tr</strong> web hizmeti için geçerlidir (geliştirici: GastroSkor /
        destek: destek@gastroskor.com.tr). Kişisel verilerinizi indirmek veya hesabınızı silmek için
        aşağıdaki yolları kullanabilirsiniz.
      </p>

      <h2 className="text-lg font-semibold text-content">Verilerinizi indirme (KVKK taşınabilirlik)</h2>
      <p>
        GastroSkor mobil uygulamasında oturum açtıktan sonra profil/hesap ayarlarından{' '}
        <strong>Verilerimi indir</strong> seçeneği ile kişisel verilerinizi JSON formatında
        indirebilirsiniz. Teknik olarak bu işlem{' '}
        <code className="text-sm">GET /api/v1/users/me/export</code> uç noktası üzerinden yapılır;
        yalnızca kendi hesabınıza ait veriler döner.
      </p>
      <p>İndirme paketinde özetle şunlar yer alır: profil bilgileri, siparişler, yorumlar, GastroCoin
        cüzdanı ve işlem geçmişi, sosyal veriler (arkadaşlık, mesajlar), bildirimler ve benzeri
        hesaba bağlı kayıtlar.</p>

      <h2 className="text-lg font-semibold text-content">Hesabı silmeden veri silme</h2>
      <p>Bazı verileri hesabınızı kapatmadan kaldırabilirsiniz:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong>GastroSkor yorumu veya cevap:</strong> Uygulamada kendi yorumunuzun veya
          cevabınızın yanındaki silme seçeneğini kullanın; işlem anında sunucudan kaldırılır.
        </li>
        <li>
          <strong>Yorum fotoğrafı:</strong> Yorumu sildiğinizde bağlı fotoğraflar da silinir.
        </li>
        <li>
          <strong>Konum:</strong> Cihaz ayarlarından GastroSkor konum iznini kapatabilirsiniz; yeni
          konum verisi gönderilmez.
        </li>
        <li>
          <strong>Diğer veriler:</strong>{' '}
          <a href="mailto:destek@gastroskor.com.tr?subject=Veri%20silme%20talebi" className="text-accent hover:underline">
            destek@gastroskor.com.tr
          </a>{' '}
          adresine <strong>Veri silme talebi</strong> yazın; hangi veriyi istediğinizi belirtin.
        </li>
      </ul>

      <h2 className="text-lg font-semibold text-content">Hesap ve tüm verileri silme (self-service)</h2>
      <p>
        Hesabınızı ve hesaba bağlı kişisel verileri <strong>mobil uygulama üzerinden</strong>{' '}
        kendiniz silebilirsiniz. Web sitesinde ayrı bir hesap silme formu yoktur; işlem mobil
        uygulamada yapılır.
      </p>
      <ol className="list-decimal space-y-2 pl-5">
        <li>GastroSkor mobil uygulamasını açın ve Google hesabınızla giriş yapın.</li>
        <li>
          <strong>Profil → Hesabımı Sil</strong> (veya eşdeğer hesap silme akışı) menüsüne gidin.
        </li>
        <li>
          Uyarıları okuyun; onay kutusuna <strong>EVET SİL</strong> yazın ve silmeyi onaylayın.
        </li>
        <li>
          Bekleyen siparişiniz veya panel/restoran sahipliğiniz varsa silme engellenebilir — ekrandaki
          mesaja göre işlemi tamamlayın veya{' '}
          <a href="mailto:destek@gastroskor.com.tr?subject=Hesap%20silme%20destek" className="text-accent hover:underline">
            destek@gastroskor.com.tr
          </a>{' '}
          ile iletişime geçin.
        </li>
      </ol>

      <h2 className="text-lg font-semibold text-content">Silinen / anonimleştirilen veriler</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Hesap bilgileri (ad, e-posta, profil fotoğrafı, takma ad)</li>
        <li>Arkadaşlıklar, özel mesajlar, bildirimler ve oyun skorları</li>
        <li>GastroCoin cüzdanı (bakiye kaydı silinir; yasal gerektiren işlem logları anonimleştirilebilir)</li>
        <li>Yazdığınız GastroSkor yorumları anonimleştirilir; metin restoran istatistikleri için kalabilir</li>
        <li>Sipariş kayıtları: kişisel iletişim alanları anonimleştirilir; tutar/tarih gibi kayıtlar yasal süre boyunca saklanabilir</li>
      </ul>

      <h2 className="text-lg font-semibold text-content">Saklama süreleri</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong>Sipariş kayıtları:</strong> Kişisel alanlar silme sonrası anonimleştirilir; kayıt en
          fazla <strong>5 yıl</strong> saklanır, ardından sistem tarafından temizlenir.
        </li>
        <li>
          <strong>Yedek / log:</strong> Güvenlik ve yasal yükümlülük için anonimleştirilmiş teknik
          loglar en fazla <strong>90 gün</strong> saklanabilir, sonra silinir.
        </li>
        <li>
          <strong>Üçüncü taraf:</strong> Google Places restoran bilgileri Google&apos;ın verisidir;
          GastroSkor hesap silme ile kaldırılmaz.
        </li>
      </ul>

      <h2 className="text-lg font-semibold text-content">Destek</h2>
      <p>
        Self-service akışı kullanamıyorsanız{' '}
        <a href="mailto:destek@gastroskor.com.tr?subject=Hesap%20silme%20talebi" className="text-accent hover:underline">
          destek@gastroskor.com.tr
        </a>{' '}
        adresinden yardım alabilirsiniz. Genel gizlilik bilgisi için{' '}
        <a href="/gizlilik" className="text-accent hover:underline">
          Gizlilik Politikası
        </a>{' '}
        sayfasına bakın.
      </p>
    </LegalDocument>
  );
}
