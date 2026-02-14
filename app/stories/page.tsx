import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";

type Lang = "tr" | "en" | "fr";

const SITE_URL = "https://derivekemik.com";

function absoluteUrl(path: string) {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function pageUrl(lang: Lang) {
  // Bu sayfanın canonical'ı query paramlı olmamalı.
  // Canonical = /stories (TR). Dil switch query sadece UX için.
  return absoluteUrl("/stories");
}

function ui(lang: Lang) {
  const dict = {
    tr: {
      title: "Öyküler",
      desc: "Deri & Kemik öykü arşivi.",
    },
    en: {
      title: "Stories",
      desc: "Stories archive on Deri & Kemik.",
    },
    fr: {
      title: "Histoires",
      desc: "Archives des histoires sur Deri & Kemik.",
    },
  } as const;

  return dict[lang];
}

export async function generateMetadata(): Promise<Metadata> {
  // Query param canonical'a girmez, bu sayfa için tek canonical kullanıyoruz.
  const title = "Öyküler | Deri & Kemik";
  const description = "Deri & Kemik öykü arşivi.";

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl("/stories"),
      // İstersen sonra buraya gerçek TR/EN/FR liste URL'lerini koyarız.
      // Şu an EN/FR listelerin ayrı sayfa olarak zaten var:
      // en: /en/stories, fr: /fr/stories
      languages: {
        tr: absoluteUrl("/stories"),
        en: absoluteUrl("/en/stories"),
        fr: absoluteUrl("/fr/stories"),
        ar: absoluteUrl("/ar/deri"),
      } as any,
    },
    openGraph: {
      type: "website",
      url: absoluteUrl("/stories"),
      title,
      description,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function StoriesPage({
  searchParams,
}: {
  searchParams?: { lang?: Lang };
}) {
  const lang: Lang = (searchParams?.lang as Lang) || "tr";

  const stories = await prisma.story.findMany({
    where: { language: lang },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      illustrationUrl: true,
      publishedAt: true,
    },
  });

  const t = ui(lang);

  // JSON-LD: CollectionPage + ItemList
  const canonical = pageUrl(lang);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": canonical,
    url: canonical,
    name: t.title,
    inLanguage: lang,
    mainEntity: {
      "@type": "ItemList",
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      numberOfItems: stories.length,
      itemListElement: stories.map((s, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        // Senin TR slug sayfan /oyku/[slug]. EN/FR zaten ayrı listelerde.
        // Bu /stories route’u “eski/utility” gibi duruyor, o yüzden burada TR slug'a bağlayalım.
        url:
          lang === "tr"
            ? absoluteUrl(`/oyku/${s.slug}`)
            : lang === "en"
              ? absoluteUrl(`/en/story/${s.slug}`)
              : absoluteUrl(`/fr/story/${s.slug}`),
        name: s.title,
        ...(s.illustrationUrl ? { image: s.illustrationUrl } : {}),
      })),
    },
  };

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>{t.title}</h1>
          <p style={{ margin: "6px 0 0", opacity: 0.75 }}>{t.desc}</p>
        </div>

        <nav style={{ display: "flex", gap: 8 }}>
          {(["tr", "en", "fr"] as Lang[]).map((l) => (
            <Link
              key={l}
              href={`/stories?lang=${l}`}
              style={{
                padding: "6px 10px",
                border: "1px solid #333",
                borderRadius: 8,
                textDecoration: "none",
                fontWeight: l === lang ? 700 : 400,
              }}
            >
              {l.toUpperCase()}
            </Link>
          ))}
        </nav>
      </header>

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {stories.map((s) => {
          const href =
            lang === "tr"
              ? `/oyku/${s.slug}`
              : lang === "en"
                ? `/en/story/${s.slug}`
                : `/fr/story/${s.slug}`;

          return (
            <Link
              key={s.id}
              href={href}
              style={{
                display: "block",
                padding: 16,
                border: "1px solid #222",
                borderRadius: 12,
                textDecoration: "none",
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 700 }}>{s.title}</div>
              <div style={{ opacity: 0.8, marginTop: 6 }}>{s.excerpt}</div>
              <div style={{ opacity: 0.6, marginTop: 10, fontSize: 12 }}>
                {new Date(s.publishedAt).toLocaleDateString(
                  lang === "tr" ? "tr-TR" : lang === "en" ? "en-US" : "fr-FR"
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
