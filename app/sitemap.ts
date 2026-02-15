import type { MetadataRoute } from "next";
import prisma from "@/lib/prisma";

// Prisma kesin Node'da çalışsın (Edge'e düşmesin)
export const runtime = "nodejs";
// Cache yüzünden eski/boş dönmesin
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Lang = "tr" | "en" | "fr" | "ar";

function normalizeBase(raw?: string) {
  const b = (raw || "https://derivekemik.com").trim();
  return b.replace(/\/$/, "");
}

function storyPath(lang: Lang, slug: string) {
  // Yeni kanonik story yolları
  if (lang === "tr") return `/oyku/${slug}`;
  if (lang === "en") return `/en/story/${slug}`;
  if (lang === "fr") return `/fr/story/${slug}`;
  // ar
  return `/ar/oyku/${slug}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = normalizeBase(process.env.NEXT_PUBLIC_SITE_URL);
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },

    // Dil ana sayfaları
    { url: `${base}/en`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/fr`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/ar`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },

    // TR yazar listeleri (sende var)
    { url: `${base}/deri`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/kemik`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },

    // EN/FR/AR yazar listeleri (sende var)
    { url: `${base}/en/deri`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/en/kemik`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/fr/deri`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/fr/kemik`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/ar/deri`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/ar/kemik`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },

    // Liste sayfaları (yeni SEO eklediğimiz)
    { url: `${base}/stories`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/en/stories`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/fr/stories`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/ar/stories`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
  ];

  const stories = await prisma.story.findMany({
    select: {
      slug: true,
      language: true,
      updatedAt: true,
      createdAt: true,
    },
    where: {
      slug: { not: "" },
    },
  });

  const storyPages: MetadataRoute.Sitemap = stories
    .map((s) => {
      const slug = String(s.slug || "").trim();
      if (!slug) return null;

      const langRaw = String(s.language || "tr").toLowerCase();
      const lang: Lang =
        langRaw === "en" || langRaw === "fr" || langRaw === "ar" ? (langRaw as Lang) : "tr";

      const path = storyPath(lang, slug);

      return {
        url: `${base}${path}`,
        lastModified: (s.updatedAt ?? s.createdAt ?? now) as Date,
        changeFrequency: "weekly",
        priority: 0.6,
      } as MetadataRoute.Sitemap[number];
    })
    .filter(Boolean) as MetadataRoute.Sitemap;

  // Duplicate temizliği
  const seen = new Set<string>();
  return [...staticPages, ...storyPages].filter((x) => {
    if (seen.has(x.url)) return false;
    seen.add(x.url);
    return true;
  });
}
