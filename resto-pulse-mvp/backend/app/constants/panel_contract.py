"""Restoran paneli hizmet sozlesmesi — basvuru ekraninda gosterilir."""

from __future__ import annotations

PANEL_CONTRACT_VERSION = "2026-06-v1"
SUPPORT_EMAIL = "destek@gastroskor.com.tr"
CONTRACT_POSTAL_ADDRESS = (
    "GastroSkor — İşletme Başvuruları\n"
    "(Adres bilgisi başvuru onayı e-postasında paylaşılır; "
    f"öncesinde {SUPPORT_EMAIL} üzerinden yazabilirsiniz.)"
)

PANEL_CONTRACT_TITLE = "GastroSkor Restoran Paneli Hizmet Sözleşmesi"
PANEL_CONTRACT_UPDATED = "6 Haziran 2026"


def panel_contract_text() -> str:
    return f"""{PANEL_CONTRACT_TITLE}
Sürüm: {PANEL_CONTRACT_VERSION} — {PANEL_CONTRACT_UPDATED}

TARAFLAR
1) Hizmet Sağlayıcı: GastroSkor (“Platform”)
2) İşletme: Başvuru formunda bilgileri verilen restoran / işletme (“İşletme”)

1. KONU
Platform; restoran keşfi, kullanıcı yorumları, canlı arama, işletme paneli, menü ve tanıtım araçları,
takipçi kampanyaları ve telefon/WhatsApp üzerinden yönlendirilen çevrimiçi sipariş bildirimleri sunar.
Uygulama içinde ödeme alınmaz; siparişler İşletme ile müşteri arasında tamamlanır.

2. ELEKTRONİK KABUL VE İMZALI NÜSHA
Başvuru sırasında bu metni okuyup onaylamanız, sözleşmenin elektronik ortamda kurulmasına ilişkin ön kabul
sayılır. Deneme süresi boyunca panel kullanımına devam edebilmeniz için, İşletme imzalı nüshayı posta veya
kargo ile Platforma iletmeyi taahhüt eder. İmzalı nüsha ulaşmadan deneme süresi sona ererse panel erişimi
kapatılabilir.

3. DENEME VE ÜCRETLENDİRME
Panel erişimi, Platformun duyurduğu deneme süresi ile başlar. Deneme sonrası ücretli abonelik koşulları
panel içinde ve fiyat listesinde gösterilir. Ücret ödenmediğinde veya sözleşme yükümlülükleri yerine
getirilmediğinde erişim kısıtlanabilir.

4. İŞLETME YÜKÜMLÜLÜKLERİ
İşletme; vergi levhası ve kimlik bilgilerinin doğruluğundan, menü ve fiyat bilgilerinin güncelliğinden,
müşteri siparişlerine makul sürede dönüşten ve mevzuata uygun faaliyetten sorumludur. Yanıltıcı tanıtım,
sahte yorum veya üçüncü kişi haklarını ihlal eden içerik yasaktır.

5. KİŞİSEL VERİLER (KVKK)
Müşteri telefonu, adresi ve sipariş notları gibi veriler İşletme adına işlenir. İşletme veri sorumlusu,
Platform ise 6698 sayılı Kanun kapsamında veri işleyen konumundadır. Taraflar, müşteri verilerini yalnızca
sipariş ve hizmet sunumu amacıyla, güvenli şekilde ve mevzuata uygun işleyeceklerini kabul eder.
Ayrıntılar Gizlilik Politikası ve KVKK Aydınlatma Metni’nde yer alır.

6. FİKRİ MÜLKİYET VE İÇERİK
İşletmenin yüklediği görseller ve metinler İşletmeye aittir; Platform’a bu içerikleri hizmet kapsamında
gösterme ve saklama için sınırlı lisans verilir. Platform yazılımı ve markası Platforma aittir.

7. SORUMLULUK SINIRI
Platform “olduğu gibi” sunulur. Google Places vb. üçüncü taraf veri kaynaklarındaki hatalardan,
müşteri–işletme arasındaki anlaşmazlıklardan veya İşletmenin siparişi yerine getirmemesinden Platform
doğrudan sorumlu tutulamaz. Mücbir sebep hallerinde hizmet askıya alınabilir.

8. SÜRE VE FESİH
Sözleşme elektronik kabul ile başlar. Taraflardan biri yazılı bildirimle (e-posta yeterli) feshedebilir.
Fesih halinde veriler, yasal saklama süreleri saklı kalmak üzere silinir veya anonimleştirilir.

9. UYUŞMAZLIK
Türk hukuku uygulanır. Tüketici olmayan işletme başvurularında Bursa Mahkemeleri ve İcra Daireleri yetkilidir.

10. İLETİŞİM
{SUPPORT_EMAIL}

İşletme, başvuru formundaki bilgilerin doğru olduğunu, bu sözleşmeyi okuduğunu ve elektronik ortamda
kabul ettiğini; imzalı nüshayı deneme süresi içinde ileteceğini beyan eder.
"""
