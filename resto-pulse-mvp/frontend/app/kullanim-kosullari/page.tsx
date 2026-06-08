import { LegalDocument } from '@/components/LegalDocument';

export const metadata = {
  title: 'Kullanım Koşulları | GastroSkor',
};

export default function TermsPage() {
  return (
    <LegalDocument title="Kullanım Koşulları" updated="30 Mayıs 2026">
      <p>
        GastroSkor mobil uygulamasını ve web sitesini kullanarak bu koşulları kabul etmiş sayılırsınız.
      </p>
      <h2 className="text-lg font-semibold text-content">Hizmet</h2>
      <p>
        GastroSkor; restoran keşfi, kullanıcı yorumları, Google Places verileri ve işletme paneli sunar.
        Puanlar bilgilendirme amaçlıdır; kesin tavsiye niteliği taşımaz.
      </p>
      <h2 className="text-lg font-semibold text-content">Hesap</h2>
      <p>
        Google hesabınızla giriş yapabilirsiniz. Hesabınızın güvenliğinden siz sorumlusunuz. Sahte veya
        başkasına ait kimlikle yorum yapmak yasaktır.
      </p>
      <h2 className="text-lg font-semibold text-content">Kullanıcı içeriği</h2>
      <p>
        Yorum ve fotoğraflarınızdan siz sorumlusunuz. Hakaret, yanıltıcı veya yasa dışı içerik kaldırılabilir.
        Yüklediğiniz içeriği hizmeti sunmak için saklama ve gösterme hakkını bize verirsiniz.
      </p>
      <h2 className="text-lg font-semibold text-content">İşletme paneli</h2>
      <p>
        Mekan sahipleri doğru bilgi vermekle yükümlüdür. Abonelik ve tanıtım koşulları panel sözleşmesinde
        ayrıca belirtilir. Başvuru için{' '}
        <a href="/isletme-basvuru" className="text-accent hover:underline">
          işletme başvuru formu
        </a>{' '}
        kullanılabilir.
      </p>
      <h2 className="text-lg font-semibold text-content">Sorumluluk sınırı</h2>
      <p>
        Hizmet &quot;olduğu gibi&quot; sunulur. Üçüncü taraf (Google vb.) veri hatalarından doğan zararlardan
        sorumlu tutulamayız.
      </p>
      <h2 className="text-lg font-semibold text-content">İletişim</h2>
      <p>
        <a href="mailto:destek@gastroskor.com.tr" className="text-accent hover:underline">
          destek@gastroskor.com.tr
        </a>
      </p>
    </LegalDocument>
  );
}
