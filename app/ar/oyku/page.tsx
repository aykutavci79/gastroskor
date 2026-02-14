import type { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/prisma";
import StoryCardImage from "@/components/StoryCardImage";

export const dynamic = "force-dynamic";

const SITE_URL = "https://derivekemik.com";
const PAGE_PATH = "/ar/oyku";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;

function absoluteUrl(path: string) {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const title = "القصص | Deri & Kemik";
  const description = "تصفّح جميع القصص المتاحة باللغة العربية على Deri & Kemik.";

  return {
    title,
    description,
    alternates: {
      canonical: PAGE_URL,
      languages: {
        ar: PAGE_URL,
        // Liste sayfaları için (mevcut yapına göre)
        tr: absoluteUrl("/stories"),
        en: absoluteUrl("/en/stories"),
        fr: absoluteUrl("/fr/stories"),
      } as any,
    },
    openGraph: {
      type: "website",
      url: PAGE_URL,
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

export default async function ArOykuListPage() {
  const stories = await prisma.story.findMany({
    where: {
      language: "ar",
    },
    orderBy: {
      publishedAt: "desc",
    },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      illustrationUrl: true,
      author: true,
      publishedAt: true,
    },
  });

  // JSON-LD: CollectionPage + ItemList
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": PAGE_URL,
    url: PAGE_URL,
    name: "القصص",
    inLanguage: "ar",
    mainEntity: {
      "@type": "ItemList",
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      numberOfItems: stories.length,
      itemListElement: stories.map((s, idx) => {
        const author = (s.author ?? "").toLowerCase() || "deri";
        const url = absoluteUrl(`/ar/${author}/${s.slug}`);
        return {
          "@type": "ListItem",
          position: idx + 1,
          url,
          name: s.title ?? "",
          ...(s.illustrationUrl ? { image: s.illustrationUrl } : {}),
        };
      }),
    },
  };

  return (
    <div className="min-h-screen py-12" dir="rtl">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container mx-auto max-w-6xl px-4">
        <h1 className="mb-12 text-center font-playfair text-4xl font-bold text-primary">
          القصص
        </h1>

        {stories.length === 0 ? (
          <p className="text-center text-muted-foreground">لا توجد قصص بعد</p>
        ) : (
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
            {stories.map((story) => {
              const author = (story.author ?? "").toLowerCase();
              const authorName = author === "deri" ? "ديري" : "كيميك";

              return (
                <article
                  key={story.id}
                  className="overflow-hidden rounded-lg border bg-background shadow-sm transition hover:shadow-md"
                >
                  <Link href={`/ar/${author}/${story.slug}`}>
                    <div className="relative aspect-[3/2]">
                      <StoryCardImage
                        src={story.illustrationUrl}
                        alt={story.title ?? ""}
                        className="object-cover"
                      />
                    </div>
                  </Link>

                  <div className="p-6">
                    <Link href={`/ar/${author}/${story.slug}`}>
                      <h2 className="mb-3 font-playfair text-xl font-bold leading-snug hover:text-primary">
                        {story.title}
                      </h2>
                    </Link>

                    {story.excerpt ? (
                      <p className="mb-4 text-sm text-muted-foreground line-clamp-3">
                        {story.excerpt}
                      </p>
                    ) : null}

                    <div className="text-sm text-muted-foreground">{authorName}</div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
