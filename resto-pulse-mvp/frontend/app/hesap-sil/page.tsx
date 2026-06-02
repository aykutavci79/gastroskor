import { LegalDocument } from '@/components/LegalDocument';

export const metadata = {
  title: 'Hesap ve Veri Silme | GastroSkor',
  description: 'GastroSkor hesabınızı ve ilişkili verilerinizi silme talebi',
};

export default function AccountDeletionPage() {
  return (
    <LegalDocument title="Hesap ve veri silme" updated="2 Haziran 2026">
      <p>
        Bu sayfa, <strong>GastroSkor</strong> mobil uygulaması ve{' '}
        <strong>gastroskor.com.tr</strong> web hizmeti için geçerlidir (geliştirici: GastroSkor /
        destek: destek@gastroskor.com.tr). Kişisel verilerinizin silinmesini burada anlatılan
        yollarla talep edebilirsiniz.
      </p>
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
      <h2 className="text-lg font-semibold text-content">Hesap ve tüm verileri silme</h2>
      <p>Hesabınızı ve hesaba bağlı tüm verileri kaldırmak için:</p>
      <h2 className="text-lg font-semibold text-content">Nasıl talep edilir?</h2>
      <ol className="list-decimal space-y-2 pl-5">
        <li>
          Kayıtlı e-posta adresinizden{' '}
          <a href="mailto:destek@gastroskor.com.tr?subject=Hesap%20silme%20talebi" className="text-accent hover:underline">
            destek@gastroskor.com.tr
          </a>{' '}
          adresine <strong>Hesap silme talebi</strong> konulu e-posta gönderin.
        </li>
        <li>E-postada GastroSkor&apos;a giriş yaptığınız adresi (Google hesabı) belirtin.</li>
        <li>Talebinizi en geç <strong>30 gün</strong> içinde işleme alırız; tamamlandığında e-posta ile bilgi veririz.</li>
      </ol>
      <h2 className="text-lg font-semibold text-content">Silinen veriler</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Hesap bilgileri (ad, e-posta, Google kimliği)</li>
        <li>Yazdığınız GastroSkor yorumları ve yüklediğiniz yorum fotoğrafları</li>
        <li>Oturum ve uygulama içi tercih kayıtları</li>
      </ul>
      <h2 className="text-lg font-semibold text-content">Saklanabilecek veriler ve süreler</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong>Silme talepleri:</strong> En geç <strong>30 gün</strong> içinde işlenir; tamamlanınca
          e-posta ile bilgilendirilirsiniz.
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
      <h2 className="text-lg font-semibold text-content">Uygulamadan çıkış</h2>
      <p>
        Silme talebi göndermeden önce mobil uygulamada <strong>Hesap → Çıkış</strong> ile oturumu
        kapatabilirsiniz. Talep onaylandığında hesabınız sunucularımızdan kaldırılır.
      </p>
      <p>
        Genel gizlilik bilgisi için{' '}
        <a href="/gizlilik" className="text-accent hover:underline">
          Gizlilik Politikası
        </a>{' '}
        sayfasına bakın.
      </p>
    </LegalDocument>
  );
}
