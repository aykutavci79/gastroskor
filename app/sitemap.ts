import type { MetadataRoute } from "next";
import prisma from "@/lib/prisma";

// Prisma kesin Node'da çalışsın (Edge'e düşmesin)
export const runtime = "nodejs";
// Cache yüzünden eski/boş dönmesin
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://derivekemik.com").replace(/\/$/, "");
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },

    { url: `${base}/en`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/fr`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/ar`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },

    { url: `${base}/deri`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/kemik`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },

    { url: `${base}/en/deri`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/en/kemik`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/fr/deri`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/fr/kemik`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/ar/deri`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/ar/kemik`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
  ];

  const stories = await prisma.story.findMany({
    select: {
      slug: true,
      language: true,
      author: true,
      updatedAt: true,
      createdAt: true,
    },
    where: {
      slug: { not: "" },
    },
  });

  const storyPages: MetadataRoute.Sitemap = stories
    .map((s) => {
      const lang = String(s.language || "tr").toLowerCase();
      const author = String(s.author || "deri").toLowerCase();
      const slug = String(s.slug || "").trim();
      if (!slug) return null;

      const prefix = lang === "tr" ? "" : `/${lang}`;
      const path = `${prefix}/${author}/${slug}`;

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
