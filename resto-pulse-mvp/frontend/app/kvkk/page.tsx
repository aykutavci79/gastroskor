import { LegalDocument } from '@/components/LegalDocument';

export const metadata = {
  title: 'KVKK Aydınlatma Metni | GastroSkor',
};

export default function KvkkPage() {
  return (
    <LegalDocument title="KVKK Aydınlatma Metni" updated="30 Mayıs 2026">
      <p>
        6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) kapsamında veri sorumlusu sıfatıyla
        GastroSkor olarak kişisel verileriniz hakkında sizi bilgilendiriyoruz.
      </p>
      <h2 className="text-lg font-semibold text-content">Veri sorumlusu</h2>
      <p>
        GastroSkor — İletişim:{' '}
        <a href="mailto:destek@gastroskor.com.tr" className="text-accent hover:underline">
          destek@gastroskor.com.tr
        </a>
      </p>
      <h2 className="text-lg font-semibold text-content">İşlenen kişisel veriler</h2>
      <p>Kimlik (ad), iletişim (e-posta), konum, müşteri işlem (yorum, puan), görsel kayıtlar (fotoğraf).</p>
      <h2 className="text-lg font-semibold text-content">Hukuki sebep ve amaç</h2>
      <p>
        Hizmet sözleşmesinin kurulması ve ifası, meşru menfaat (platform güvenliği) ve açık rızanız (konum,
        fotoğraf) kapsamında veriler işlenir.
      </p>
      <h2 className="text-lg font-semibold text-content">Aktarım</h2>
      <p>
        Barındırma ve altyapı hizmeti sağlayıcılarına, yasal zorunluluk halinde yetkili kurumlara aktarım
        yapılabilir. Yurt dışına aktarım söz konusu olursa KVKK&apos;ya uygun güvenceler sağlanır.
      </p>
      <h2 className="text-lg font-semibold text-content">Haklarınız</h2>
      <p>
        KVKK md. 11 kapsamında; verilerinizin işlenip işlenmediğini öğrenme, düzeltme, silme, itiraz ve
        şikâyet hakkına sahipsiniz. Taleplerinizi{' '}
        <a href="mailto:destek@gastroskor.com.tr" className="text-accent hover:underline">
          destek@gastroskor.com.tr
        </a>{' '}
        üzerinden iletebilirsiniz.
      </p>
    </LegalDocument>
  );
}
