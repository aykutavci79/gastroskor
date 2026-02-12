import HomePage from "@/components/home/HomePage";

export const dynamic = "force-dynamic";

export default async function HomeTr() {
  return (
    <HomePage
      locale="tr"
      dict={{
        brandTitle: "Deri ve Kemik",
        brandSubtitle:
          "Yüzeyi sıyırıp öze ulaşmak. İnsan doğasının en gerçek halini keşfetmek.",
        btnDeri: "Deri'nin Öykülerini Oku",
        btnKemik: "Kemik'in Öykülerini Keşfet",
        btnDeriHref: "/deri",
        btnKemikHref: "/kemik",
        philosophyTitle: "Deri ve Kemik Felsefesi",
        philosophyBody:
          "Deri ve Kemik, yüzeyin altındaki gerçekliği aramak, insani deneyimleri en saf haliyle anlatmak üzerine kurulu bir edebi projedir. Yüzeysel katmanları sıyırıp asıl öze ulaşmak, insanın temel duygularını ve varoluşsal sorularını edebi bir dille keşfetmek amacındayız.",
        philosophyCta: "Yazarlar Hakkında Daha Fazla Bilgi",
        philosophyHref: "/hakkimizda",
        latestTitle: "Son Öyküler",
        emptyStories: "Henüz öykü yayınlanmadı.",
        newsletterTitle: "Yeni Öykülerden Haberdar Olun",
        newsletterBody:
          "Yeni yayınlanan öykülerimizden ilk siz haberdar olun. Bültenimize abone olun.",
        dir: "ltr",
      }}
      take={6}
    />
  );
}
