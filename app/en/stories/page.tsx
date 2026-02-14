import type { Metadata } from "next"
import Link from "next/link"
import StoryCardImage from "@/components/StoryCardImage"
import { prisma } from "@/lib/db"
import { Card } from "@/components/ui/card"

const SITE_URL = "https://derivekemik.com"
const PAGE_PATH = "/en/stories"
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`

export async function generateMetadata(): Promise<Metadata> {
  const title = "Stories - Skin and Bone"
  const description = "Browse all English translations of Turkish short stories by deri."

  return {
    title,
    description,
    alternates: {
      canonical: PAGE_URL,
      languages: {
        en: PAGE_URL,
        // İstersen sonra açarız (senin TR/FR/AR liste URL’lerine göre):
        // tr: `${SITE_URL}/oyku`,
        // fr: `${SITE_URL}/fr/stories`,
        // ar: `${SITE_URL}/ar/deri`,
      },
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
  }
}

export default async function EnglishStoriesPage() {
  const stories = await prisma.story.findMany({
    where: {
      language: "en",
      author: "deri",
    },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      illustrationUrl: true,
      publishedAt: true,
    },
  })

  // JSON-LD: CollectionPage + ItemList
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": PAGE_URL,
    url: PAGE_URL,
    name: "Stories by deri - Skin and Bone",
    inLanguage: "en",
    mainEntity: {
      "@type": "ItemList",
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      numberOfItems: stories.length,
      itemListElement: stories.map((s, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        url: `${SITE_URL}/en/story/${s.slug}`,
        name: s.title,
        ...(s.illustrationUrl ? { image: s.illustrationUrl } : {}),
      })),
    },
  }

  return (
    <div className="min-h-screen py-12 px-4">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-primary">
            Stories by deri
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {stories.length} {stories.length === 1 ? "story" : "stories"} exploring the depths of human
            experience
          </p>
        </div>

        {/* Stories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map((story) => (
            <Link key={story.id} href={`/en/story/${story.slug}`}>
              <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                <div className="relative aspect-[4/3] bg-muted">
                  <StoryCardImage
                    src={story.illustrationUrl}
                    alt={story.title}
                    className="object-cover"
                  />
                </div>

                <div className="p-6">
                  <h2 className="text-xl font-serif font-bold mb-2 line-clamp-2">
                    {story.title}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-3">
                    {new Date(story.publishedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-foreground/80 line-clamp-3">{story.excerpt}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {stories.length === 0 && (
          <div className="text-center py-20">
            <p className="text-xl text-muted-foreground">
              No stories available yet. Check back soon!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
