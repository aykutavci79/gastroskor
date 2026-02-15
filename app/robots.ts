import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const isProd = process.env.NODE_ENV === "production";

  // Prod'da tek kanonik dünya: non-www
  const base = isProd
    ? "https://derivekemik.com"
    : (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");

  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${base}/sitemap.xml`,
  };
}
