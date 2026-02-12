import type { MetadataRoute } from "next";
import prisma from "@/lib/prisma";

type AnyStory = any;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Tek kanonik seç: www'siz
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://derivekemik.com").replace(/\/$/, "");
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },

    // Dil kökleri
    { url: `${base}/en`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/fr`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/ar`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },

    // Yazar listeleri
    { url: `${base}/deri`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/kemik`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/en/deri`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/en/kemik`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/fr/deri`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/fr/kemik`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/ar/deri`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/ar/kemik`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
  ];

  // Öykü URL builder
  function buildStoryUrl(story: AnyStory) {
    const lang = String(story.language ?? "tr").toLowerCase().trim();
    const author = String(story.authorSlug ?? story.author ?? "deri").toLowerCase().trim();
    const slug = String(story.slug ?? "").trim();

    if (!slug) return null;

    // TR'de prefix yok
    if (lang === "tr") return `${base}/${author}/${slug}`;

    // Diğer dillerde prefix var
    return `${base}/${lang}/${author}/${slug}`;
  }

  let storyPages: MetadataRoute.Sitemap = [];

  try {
    const stories = await prisma.story.findMany({
      where: {
        slug: { not: "" },
      },
      // NOTE: alan isimlerin birebir uymasa bile TS patlamasın diye "any" seçimi
      select: {
        slug: true,
        language: true as any,
        author: true as any,
        authorSlug: true as any,
        updatedAt: true as any,
        createdAt: true as any,
      } as any,
    });

    storyPages = (stories || [])
      .map((s: AnyStory) => {
        const url = buildStoryUrl(s);
        if (!url) return null;

        const lastModified = s.updatedAt ?? s.createdAt ?? now;

        return {
          url,
          lastModified,
          changeFrequency: "weekly",
          priority: 0.6,
        } as MetadataRoute.Sitemap[number];
      })
      .filter(Boolean) as MetadataRoute.Sitemap;
  } catch (e) {
    // DB erişimi bir sebeple patlarsa build/çalışma tamamen çökmesin; en kötü statik sitemap döner.
    storyPages = [];
  }

  // Duplicate temizliği
  const seen = new Set<string>();
  const all = [...staticPages, ...storyPages].filter((x) => {
    if (!x?.url) return false;
    if (seen.has(x.url)) return false;
    seen.add(x.url);
    return true;
  });

  return all;
}
