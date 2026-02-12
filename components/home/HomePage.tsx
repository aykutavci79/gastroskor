import StoryCard from "@/components/story-card";
import NewsletterForm from "@/components/newsletter-form";
import Link from "next/link";
import { BookOpen, Users } from "lucide-react";

type Locale = "tr" | "en" | "fr" | "ar";

type Story = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  author: string;
  illustrationUrl?: string | null;
  publishedAt: string; // ISO
  viewCount?: number | null;
};

function hrefFor(locale: Locale, path: string) {
  if (locale === "tr") return path === "/" ? "/" : path;
  if (path === "/") return `/${locale}`;
  return `/${locale}${path}`;
}

const copy: Record<Locale, any> = {
  tr: {
    brand: "Deri ve Kemik",
    tagline: "Yüzeyi sıyırıp öze ulaşmak. İnsan doğasının en gerçek halini keşfetmek.",
    cta1: "Deri'nin Öykülerini Oku",
    cta2: "Kemik'in Öykülerini Keşfet",
    aboutTitle: "Deri ve Kemik Felsefesi",
    aboutBody:
      "Deri ve Kemik, yüzeyin altındaki gerçekliği aramak, insani deneyimleri en saf haliyle anlatmak üzerine kurulu bir edebi projedir. Yüzeysel katmanları sıyırıp asıl öze ulaşmak, insanın temel duygularını ve varoluşsal sorularını edebi bir dille keşfetmek amacındayız.",
    aboutLink: "Yazarlar Hakkında Daha Fazla Bilgi",
    latestTitle: "Son Öyküler",
    empty: "Henüz öykü yayınlanmadı.",
    newsletterTitle: "Yeni Öykülerden Haberdar Olun",
    newsletterBody: "Yeni yayınlanan öykülerimizden ilk siz haberdar olun. Bültenimize abone olun.",
    dir: "ltr" as const,
  },
  en: {
    brand: "Skin and Bone",
    tagline: "Contemporary Turkish Short Stories (Deri & Kemik)",
    cta1: "Read deri’s Stories",
    cta2: "Explore kemik’s Stories",
    aboutTitle: "About the Project",
    aboutBody:
      "A literary journey through the human condition, exploring themes of identity, memory, and transformation through the distinctive voices of two Turkish authors.",
    aboutLink: "Learn more about the authors",
    latestTitle: "Latest Stories",
    empty: "No stories available yet. Check back soon!",
    newsletterTitle: "Stay in the Loop",
    newsletterBody: "Get notified when new stories are published.",
    dir: "ltr" as const,
  },
  fr: {
    brand: "Peau & Os",
    tagline: "Nouvelles turques contemporaines (Deri & Kemik)",
    cta1: "Lire les histoires de deri",
    cta2: "Découvrir les histoires de kemik",
    aboutTitle: "À propos du projet",
    aboutBody:
      "Un voyage littéraire au coeur de la condition humaine, entre identité, mémoire et transformation, porté par les voix distinctes de deux auteurs turcs.",
    aboutLink: "En savoir plus sur les auteurs",
    latestTitle: "Dernières histoires",
    empty: "Aucune histoire pour le moment. Revenez bientôt !",
    newsletterTitle: "Restez informé",
    newsletterBody: "Recevez un message quand une nouvelle histoire est publiée.",
    dir: "ltr" as const,
  },
  ar: {
    brand: "جلد وعظم",
    tagline: "قصصٌ تركيةٌ معاصرةٌ (ديري وكيميك)",
    cta1: "اقرأ قصص ديري",
    cta2: "اكتشف قصص كيميك",
    aboutTitle: "عن المشروع",
    aboutBody:
      "رحلةٌ أدبيةٌ إلى قلبِ التجربةِ الإنسانية، بين الهويةِ والذاكرةِ والتحوّل، بصوتين يكتبان من حافةِ الشعور.",
    aboutLink: "المزيد عن الكاتبين",
    latestTitle: "آخر ما نُشر",
    empty: "لا قصص هنا بعد. عد إلينا قريبًا.",
    newsletterTitle: "كن على اطلاع",
    newsletterBody: "اشترك لتصلك أخبار القصص الجديدة.",
    dir: "rtl" as const,
  },
};

export default function HomePage({
  lang,
  stories,
}: {
  lang: Locale;
  stories: Story[];
}) {
  const t = copy[lang];

  return (
    <div className="min-h-screen" dir={t.dir}>
      {/* Hero */}
      <section className="relative bg-gradient-to-b from-muted/50 to-background py-20 md:py-32">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <h1 className="font-playfair text-4xl font-bold leading-tight text-primary md:text-6xl">
            {t.brand}
          </h1>
          <p className="mt-6 font-crimson text-xl text-muted-foreground md:text-2xl">
            {t.tagline}
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href={hrefFor(lang, "/deri")}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3 font-inter text-sm font-medium text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl"
            >
              <BookOpen className="h-5 w-5" />
              {t.cta1}
            </Link>

            <Link
              href={hrefFor(lang, "/kemik")}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-8 py-3 font-inter text-sm font-medium text-secondary-foreground shadow-lg transition-all hover:bg-secondary/90 hover:shadow-xl"
            >
              <BookOpen className="h-5 w-5" />
              {t.cta2}
            </Link>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="py-16 bg-background">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="text-center">
            <h2 className="font-playfair text-3xl font-bold text-primary">
              {t.aboutTitle}
            </h2>

            <p className="mt-6 font-crimson text-lg leading-relaxed text-foreground/80">
              {t.aboutBody}
            </p>

            <Link
              href={hrefFor(lang, "/hakkimizda")}
              className="mt-8 inline-flex items-center gap-2 font-inter text-sm font-medium text-primary transition-colors hover:text-secondary"
            >
              <Users className="h-5 w-5" />
              {t.aboutLink}
            </Link>
          </div>
        </div>
      </section>

      {/* Stories */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto max-w-6xl px-4">
          <h2 className="font-playfair text-3xl font-bold text-primary text-center mb-12">
            {t.latestTitle}
          </h2>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {stories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>

          {stories.length === 0 && (
            <p className="text-center font-inter text-muted-foreground mt-10">
              {t.empty}
            </p>
          )}
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-16 bg-background">
        <div className="container mx-auto max-w-2xl px-4">
          <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 p-8 md:p-12 text-center shadow-lg">
            <h2 className="font-playfair text-3xl font-bold text-primary">
              {t.newsletterTitle}
            </h2>
            <p className="mt-4 font-inter text-muted-foreground">
              {t.newsletterBody}
            </p>
            <NewsletterForm />
          </div>
        </div>
      </section>
    </div>
  );
}
