import type { Metadata } from "next"
import { notFound } from "next/navigation"
import StoryCardImage from "@/components/StoryCardImage"
import Link from "next/link"
import { prisma } from "@/lib/db"
import StoryViewTracker from "@/components/StoryViewTracker"

interface PageProps {
  params: { slug: string }
}

const LANGUAGE = "fr" as const

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const story = await prisma.story.findUnique({
    where: {
      language_slug: {
        language: LANGUAGE,
        slug: params.slug,
      },
    },
  })

  if (!story) {
    return { title: "Histoire introuvable" }
  }

  return {
    title: `${story.title} - Deri & Kemik`,
    description: story.excerpt ?? "",
  }
}

export default async function FrenchStoryPage({ params }: PageProps) {
  const story = await prisma.story.findUnique({
    where: {
      language_slug: {
        language: LANGUAGE,
        slug: params.slug,
      },
    },
  })

  if (!story) {
    notFound()
  }

  // Compteur de vues
  await prisma.story.update({
    where: { id: story.id },
    data: { viewCount: { increment: 1 } },
  })

  // Canonical id: originalStoryId varsa onu, yoksa kendi id'sini kullan
  const canonicalId = story.originalStoryId ?? story.id

  // Lien vers la version turque (si liée)
  const turkishStory = await prisma.story.findFirst({
    where: {
      language: "tr",
      OR: [{ id: canonicalId }, { originalStoryId: canonicalId }],
    },
    select: { slug: true },
  })

  return (
    <article className="min-h-screen py-12 px-4">
      {/* GA4 event: story_view */}
      <StoryViewTracker
        storySlug={story.slug}
        language={story.language}
        storyId={canonicalId}
      />

      <div className="max-w-4xl mx-auto">
        {/* Sélecteur de langue */}
        {turkishStory && (
          <div className="mb-6 flex justify-end">
            <Link
              href={`/oyku/${turkishStory.slug}`}
              className="text-sm text-primary hover:underline flex items-center gap-2"
            >
              <span>🇹🇷</span> Lire en turc
            </Link>
          </div>
        )}

        {/* En-tête */}
        <header className="mb-8 space-y-4">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-primary">
            {story.title}
          </h1>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="font-medium">par {story.author}</span>
            <span>•</span>
            <time dateTime={story.publishedAt.toISOString()}>
              {new Date(story.publishedAt).toLocaleDateString("fr-FR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            <span>•</span>
            <span>{story.viewCount} vues</span>
          </div>
        </header>

        {/* Image */}
        <div className="relative aspect-video mb-8 rounded-lg overflow-hidden">
          <StoryCardImage
            src={story.illustrationUrl}
            alt={story.title}
            className="object-cover"
          />
        </div>

        {/* Contenu */}
        <div
          className="prose prose-lg max-w-none font-serif leading-relaxed"
          style={{ whiteSpace: "pre-wrap" }}
        >
          {story.content}
        </div>

        {/* Pied */}
        <footer className="mt-12 pt-8 border-t border-primary/10">
          <div className="text-center space-y-4">
            <p className="text-lg font-serif italic text-muted-foreground">
              Fin de l&apos;histoire
            </p>
            <Link
              href="/fr/stories"
              className="inline-block px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-md"
            >
              Lire d&apos;autres histoires
            </Link>
          </div>
        </footer>
      </div>
    </article>
  )
}
