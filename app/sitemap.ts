import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  // Tek kanonik seç: www'siz
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://derivekemik.com").replace(/\/$/, "");

  const now = new Date();

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },

    // Dil kökleri
    { url: `${base}/en`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/fr`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/ar`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },

    // Yazar listeleri (senin yapına göre)
    { url: `${base}/deri`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/kemik`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/en/deri`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/en/kemik`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/fr/deri`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/fr/kemik`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/ar/deri`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/ar/kemik`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
  ];
}
