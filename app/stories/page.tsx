import Link from "next/link";
import { prisma } from "@/lib/db";

type Lang = "tr" | "en" | "fr";

export default async function StoriesPage({
  searchParams,
}: {
  searchParams?: { lang?: Lang };
}) {
  const lang: Lang = (searchParams?.lang as Lang) || "tr";

  const stories = await prisma.story.findMany({
    where: { language: "tr" },
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

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <h1>Öyküler</h1>

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
        {stories.map((s) => (
          <Link
            key={s.id}
            href={`/stories/${s.slug}?lang=${lang}`}
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
              {new Date(s.publishedAt).toLocaleDateString("tr-TR")}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

