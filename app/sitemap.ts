import type { MetadataRoute } from "next";
import prisma from "@/lib/prisma";

const FALLBACK_BASE = "https://derivekemik.com";

function getBaseUrl() {
  // Tercih sırası: env ile override edebil
  // NEXT_PUBLIC_SITE_URL = https://derivekemik.com gibi
  const site =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.NEXTAUTH_URL ||
    "";

  if (site) {
    // http://localhost:3000 gibi bir şeyse prod’da override etmek için
    // ama yine de normalize edelim:
    const trimmed = site.trim().replace(/\/+$/, "");
    // Vercel URL bazen sadece host gelir, onu da https'e çekelim
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      return `https://${trimmed}`;
    }
    return trimmed;
  }

  return FALLBACK_BASE;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseUrl();

  const now = new Date();

  // Bildiğimiz statik sayfalar (404 basmamak için "minimum sağlam liste")
  const staticPaths = [
    "/",      // TR home
    "/en",
    "/fr",
    "/ar",

    // Author list pages
    "/deri",
    "/kemik",
    "/en/deri",
    "/en/kemik",
    "/fr/deri",
    "/fr/kemik",
    "/ar/deri",
    "/ar/kemik",
  ];

  // Story detail URL'leri
  // Varsayım: story tablosunda language ('tr'|'en'|'fr'|'ar'), author ('deri'|'kemik'), slug var.
  // Eğer alan adların farklıysa, schema.prisma'daki Story modelini at, uyarlayayım.
  const stories = await prisma.story.findMany({
    select: {
      slug: true,
      author: true,
      language: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  const storyEntries: MetadataRoute.Sitemap = stories
    .filter((s) => !!s?.slug && !!s?.author && !!s?.language)
    .map((s) => {
      const lang = String(s.language || "tr");
      const author = String(s.author);
      const slug = String(s.slug);

      // TR kökte, diğer diller /en /fr /ar altında
      const prefix = lang === "tr" ? "" : `/${lang}`;
      const path = `${prefix}/${author}/${slug}`;

      return {
        url: `${base}${path}`,
        lastModified: (s.updatedAt ?? s.createdAt ?? now) as Date,
        changeFrequency: "monthly",
        priority: 0.8,
      };
    });

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: p === "/" ? 1 : 0.7,
  }));

  return [...staticEntries, ...storyEntries];
}
