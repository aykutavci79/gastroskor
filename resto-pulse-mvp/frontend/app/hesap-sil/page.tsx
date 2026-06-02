import { LegalDocument } from '@/components/LegalDocument';

export const metadata = {
  title: 'Hesap ve Veri Silme | GastroSkor',
  description: 'GastroSkor hesabınızı ve ilişkili verilerinizi silme talebi',
};

export default function AccountDeletionPage() {
  return (
    <LegalDocument title="Hesap ve veri silme" updated="2 Haziran 2026">
      <p>
        GastroSkor hesabınızı ve hesabınıza bağlı kişisel verileri silmek için aşağıdaki adımları
        izleyebilirsiniz.
      </p>
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
      <h2 className="text-lg font-semibold text-content">Saklanabilecek veriler</h2>
      <p>
        Yasal yükümlülük veya güvenlik (kö abuse kayıtları) için sınırlı loglar anonimleştirilmiş veya
        kısa süreli saklanabilir. Google Places üzerinden gösterilen restoran bilgileri üçüncü taraf
        veridir; bunlar hesap silme ile kaldırılmaz.
      </p>
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
