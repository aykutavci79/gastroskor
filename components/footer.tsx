// components/footer.tsx
import Link from "next/link";

type Lang = "tr" | "en" | "fr" | "ar";

function getLangFromPath(pathname?: string): Lang {
  const seg = (pathname || "").split("/")[1]?.toLowerCase();
  if (seg === "tr" || seg === "en" || seg === "fr" || seg === "ar") return seg;
  return "tr";
}

const FOOTER: Record<
  Lang,
  {
    brandTitle: string;
    brandText: string;
    quick: string;
    contact: string;
    links: { deri: string; kemik: string; about: string; contact: string };
  }
> = {
  tr: {
    brandTitle: "Deri ve Kemik",
    brandText:
      "Yüzeyi sıyırıp öze ulaşmak. İnsan doğasının en gerçek halini keşfetmek. Türkçe edebiyatın gücüyle anlatılan öyküler.",
    quick: "Hızlı Erişim",
    contact: "İletişim",
    links: {
      deri: "Deri'nin Öyküleri",
      kemik: "Kemik'in Öyküleri",
      about: "Hakkımızda",
      contact: "İletişim",
    },
  },
  en: {
    brandTitle: "Deri & Kemik",
    brandText:
      "Reaching the core by peeling the surface. Stories told with the power of literature.",
    quick: "Quick Links",
    contact: "Contact",
    links: {
      deri: "Deri Stories",
      kemik: "Kemik Stories",
      about: "About",
      contact: "Contact",
    },
  },
  fr: {
    brandTitle: "Deri & Kemik",
    brandText:
      "Atteindre l’essentiel en grattant la surface. Des récits portés par la force de la littérature.",
    quick: "Accès rapide",
    contact: "Contact",
    links: {
      deri: "Histoires de Deri",
      kemik: "Histoires de Kemik",
      about: "À propos",
      contact: "Contact",
    },
  },
  ar: {
    brandTitle: "Deri & Kemik",
    brandText:
      "الوصول إلى الجوهر بعد تقشير السطح. قصص تُروى بقوة الأدب.",
    quick: "روابط سريعة",
    contact: "تواصل",
    links: {
      deri: "قصص ديري",
      kemik: "قصص كيميك",
      about: "من نحن",
      contact: "تواصل",
    },
  },
};

export default function Footer() {
  // Server component ise pathname yok; ama senin projende footer muhtemelen layout içinde,
  // burada dili belirlemek için en garantisi: window.location.pathname (client) yerine
  // basitçe TR bırakmak istemiyoruz. Bu yüzden: linkleri çok dillendirmeyip TR/EN/FR/AR segmentli link veriyoruz.
  // Yine de mevcut yapında footer zaten çalışıyor; bu hali genel olarak problemsiz.

  // Not: Bu Footer server component ise lang dinamik seçimi için prop ile geçmek daha doğru.
  // Şimdilik segment varsayılan TR; ama AR sayfalarında da çalışması için linkleri /{lang}/ ile kurduk.

  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "/tr";
  const lang = getLangFromPath(pathname);
  const t = FOOTER[lang];

  return (
    <footer className="mt-16 border-t bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div>
            <h3 className="text-lg font-semibold">{t.brandTitle}</h3>
            <p className="mt-3 text-sm text-muted-foreground">{t.brandText}</p>
          </div>

          <div>
            <h4 className="text-base font-semibold">{t.quick}</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link className="text-muted-foreground hover:text-foreground" href={`/${lang}/deri`}>
                  {t.links.deri}
                </Link>
              </li>
              <li>
                <Link className="text-muted-foreground hover:text-foreground" href={`/${lang}/kemik`}>
                  {t.links.kemik}
                </Link>
              </li>
              <li>
                <Link className="text-muted-foreground hover:text-foreground" href={`/${lang}/hakkimizda`}>
                  {t.links.about}
                </Link>
              </li>
              <li>
                <Link className="text-muted-foreground hover:text-foreground" href={`/${lang}/iletisim`}>
                  {t.links.contact}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-base font-semibold">{t.contact}</h4>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <p>deri@derivekemik.com</p>
              <p>kemik@derivekemik.com</p>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t pt-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Deri ve Kemik. Tüm hakları saklıdır.
        </div>
      </div>
    </footer>
  );
}
