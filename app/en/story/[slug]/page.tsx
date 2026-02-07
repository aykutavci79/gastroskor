import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StoryCardImage from "@/components/StoryCardImage";
import Link from "next/link";
import { prisma } from "@/lib/db";
import StoryViewTracker from "@/components/StoryViewTracker";

interface PageProps {
  params: { slug: string };
}

const LANGUAGE = "en" as const;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const story = await prisma.story.findUnique({
    where: {
      language_slug: {
        language: LANGUAGE,
        slug: params.slug,
      },
    },
  });

  if (!story) {
    return { title: "Story Not Found" };
  }

  return {
    title: `${story.title} - Skin and Bone`,
    description: story.excerpt ?? "",
  };
}

export default async function EnglishStoryPage({ params }: PageProps) {
  const story = await prisma.story.findUnique({
    where: {
      language_slug: {
        language: LANGUAGE,
        slug: params.slug,
      },
    },
  });

  if (!story) {
    notFound();
  }

  // Increment view count
  await prisma.story.update({
    where: { id: story.id },
    data: { viewCount: { increment: 1 } },
  });

  // Canonical id: originalStoryId varsa onu, yoksa kendi id'sini kullan
  const canonicalId = story.originalStoryId ?? story.id;

  // Get Turkish version link by canonical id
  const turkishStory = await prisma.story.findFirst({
    where: {
      language: "tr",
      OR: [{ id: canonicalId }, { originalStoryId: canonicalId }],
    },
    select: { slug: true },
  });

  return (
    <article className="min-h-screen py-12 px-4">
      {/* GA4 event: story_view */}
      <StoryViewTracker
        storySlug={story.slug}
        language={story.language}
        storyId={canonicalId}
      />

      <div className="max-w-4xl mx-auto">
        {/* Language Switcher */}
        {turkishStory && (
          <div className="mb-6 flex justify-end">
            <Link
              href={`/oyku/${turkishStory.slug}`}
              className="text-sm text-primary hover:underline flex items-center gap-2"
            >
              <span>🇹🇷</span>
              Read in Turkish
            </Link>
          </div>
        )}

        {/* Story Header */}
        <header className="mb-8 space-y-4">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-primary">
            {story.title}
          </h1>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="font-medium">by {story.author}</span>
            <span>•</span>
            <time dateTime={story.publishedAt.toISOString()}>
              {new Date(story.publishedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            <span>•</span>
            <span>{story.viewCount} views</span>
          </div>
        </header>

        {/* Featured Image */}
        <div className="relative aspect-video mb-8 rounded-lg overflow-hidden">
          <StoryCardImage
            src={story.illustrationUrl}
            alt={story.title}
            className="object-cover"
          />
        </div>

        {/* Story Content */}
        <div
          className="prose prose-lg max-w-none font-serif leading-relaxed"
          style={{ whiteSpace: "pre-wrap" }}
        >
          {story.content}
        </div>

        {/* Story Footer */}
        <footer className="mt-12 pt-8 border-t border-primary/10">
          <div className="text-center space-y-4">
            <p className="text-lg font-serif italic text-muted-foreground">End of Story</p>
            <Link
              href="/en/stories"
              className="inline-block px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-md"
            >
              Read More Stories
            </Link>
          </div>
        </footer>
      </div>
    </article>
  );
}
