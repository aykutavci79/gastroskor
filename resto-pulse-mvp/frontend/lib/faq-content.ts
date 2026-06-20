export type FaqItem = {
  question: string;
  answer: string;
};

/** Ürün / uygulama SSS — JSON-LD ve /sss sayfasında ortak kullanılır. */
export const GASTRO_FAQ_ITEMS: FaqItem[] = [
  {
    question: 'GastroSkor nedir?',
    answer:
      'GastroSkor, restoran keşfi, kullanıcı yorumları ve GastroSkor (GS) puanı sunan bir platformdur. Mobil uygulama ve web sitesi üzerinden restoran arayabilir, yorum okuyup yazabilir, yakındaki mekanları keşfedebilirsiniz. İşletmeler için panel, online sipariş iletimi ve tanıtım araçları da sunulur.',
  },
  {
    question: 'GastroSkor (GS) puanı ile Google puanı arasındaki fark nedir?',
    answer:
      'Google puanı, Google Haritalar yorumlarından gelir. GS puanı ise GastroSkor kullanıcılarının uygulama içinde bıraktığı yorum ve puanlardan oluşur. İki skoru yan yana görerek hem genel hem topluluk deneyimini karşılaştırabilirsiniz.',
  },
  {
    question: 'Restoran yorumu ve puanı nasıl yazılır?',
    answer:
      'GastroSkor uygulamasında Google hesabınızla giriş yapın, restoran sayfasını açın ve yorum bırakın. Metin, puan ve isterseniz fotoğraf ekleyebilirsiniz. Yorumunuz onaylandıktan sonra restoranın GS puanına yansır.',
  },
  {
    question: 'Hangi şehirlerde aktif?',
    answer:
      'Platform Türkiye genelinde kullanılabilir; içerik yoğunluğu şehirden şehre değişir. Bursa ve çevresinde restoran listesi, yöresel lezzet rehberi ve yerel arama özellikleri özellikle gelişmiştir. Yeni şehirler düzenli olarak eklenir.',
  },
  {
    question: 'İşletme sahibiyim; restoranımı nasıl ekler veya yönetirim?',
    answer:
      'Web sitesindeki İşletme Başvuru sayfasından talep oluşturabilir veya uygulama içinden mekan sahipliği (claim) sürecini başlatabilirsiniz. Onay sonrası panelden menü, fotoğraf, kupon ve sipariş bildirimlerini yönetebilirsiniz. Sorularınız için destek@gastroskor.com.tr adresine yazın.',
  },
  {
    question: 'Online sipariş GastroSkor üzerinden nasıl çalışır?',
    answer:
      'Sipariş destekleyen restoranlarda menüden seçim yaparsınız; talep doğrudan restorana iletilir. Telefon doğrulaması ve teslimat adresi istenebilir. Ödeme ve teslimat koşulları restoranın kendi politikasına göre belirlenir; GastroSkor ödeme altyapısı sunmaz.',
  },
  {
    question: 'Eğlence bölümü ve Kelime Sofrası nedir?',
    answer:
      'Eğlence sekmesinde günlük mini oyunlar (Kelime Sofrası, klasik 9×9 Sudoku vb.) bulunur. Kelime Sofrası, harf çarkından kelime bularak ızgara ve bonus kelimeleri tamamlama oyunudur. Kısa kelimeler ipucu kazandırabilir; oyunlar eğlence amaçlıdır, restoran puanını etkilemez.',
  },
  {
    question: 'Jeton nedir?',
    answer:
      'Jeton, uygulama içi eğlence ve ipucu gibi özelliklerde kullanılan sanal birimdir. Günlük görevler ve oyunlarla jeton kazanabilirsiniz. Jeton gerçek para ile satın alınamaz ve dışarıya devredilemez.',
  },
  {
    question: 'Hesabımı ve verilerimi nasıl silerim?',
    answer:
      'Hesap silme ve kişisel veri talepleri için gastroskor.com.tr/hesap-sil sayfasındaki adımları izleyin veya destek@gastroskor.com.tr adresine “Hesap silme” konulu e-posta gönderin. Talebiniz KVKK kapsamında değerlendirilir.',
  },
  {
    question: 'Kişisel verilerim güvende mi?',
    answer:
      'Veriler şifreli bağlantı (HTTPS) ile iletilir. Gizlilik politikası ve KVKK metinlerinde hangi verilerin toplandığı, neden kullanıldığı ve haklarınız açıklanmıştır. Ayrıntılar için gastroskor.com.tr/gizlilik ve gastroskor.com.tr/kvkk sayfalarına bakın.',
  },
  {
    question: 'Uygulamayı nereden indirebilirim?',
    answer:
      'GastroSkor mobil uygulaması Google Play ve App Store üzerinden indirilebilir (yayın durumuna göre mağaza adları güncellenir). Web sürümü gastroskor.com.tr adresinden tarayıcıda da kullanılabilir.',
  },
  {
    question: 'Destek ekibine nasıl ulaşırım?',
    answer:
      'Teknik sorun, işletme başvurusu veya hesap talepleri için destek@gastroskor.com.tr adresine yazın. Mümkün olduğunca ekran görüntüsü ve kullandığınız cihaz bilgisini ekleyin; genelde birkaç iş günü içinde dönüş yapılır.',
  },
];
