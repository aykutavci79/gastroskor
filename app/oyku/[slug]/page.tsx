import StoryCardImage from "@/components/StoryCardImage";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, User, ArrowLeft } from "lucide-react";
import StoryCard from "@/components/story-card";
import CommentSection from "@/components/comment-section";
import ViewCounter from "@/components/view-counter";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface PageProps {
  params: {
    slug: string;
  };
}

/* ---------- METADATA ---------- */

export async function generateMetadata(
  { params }: PageProps
): Promise<Metadata> {
  const story = await prisma.story.findFirst({
    where: {
      slug: params.slug,
    },
  });

  if (!story) {
    return {
      title: "Öykü Bulunamadı | Deri ve Kemik",
    };
  }

  return {
    title: `${story.title} | Deri ve Kemik`,
    description: story.excerpt ?? "",
    openGraph: {
      title: story.title,
      description: story.excerpt ?? "",
      images: story.illustrationUrl ? [story.illustrationUrl] : [],
    },
  };
}

/* ---------- PAGE ---------- */

export default async function StoryPage({ params }: PageProps) {
  const story = await prisma.story.findFirst({
    where: {
      slug: params.slug,
    },
  });

  if (!story) {
    notFound();
  }

  const authorName = story.author === "deri" ? "Deri" : "Kemik";
  const authorUrl = story.author === "deri" ? "/deri" : "/kemik";

  const formattedDate = new Date(story.publishedAt).toLocaleDateString(
    "tr-TR",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  const relatedStoriesRaw = await prisma.story.findMany({
    where: {
      language: story.language,
      author: story.author,
      id: { not: story.id },
    },
    take: 3,
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      author: true,
      illustrationUrl: true,
      publishedAt: true,
      viewCount: true,
    },
  });

  const relatedStories = relatedStoriesRaw.map((s) => ({
    ...s,
    excerpt: s.excerpt ?? null,
    illustrationUrl: s.illustrationUrl ?? null,
    publishedAt: s.publishedAt.toISOString(),
    viewCount: s.viewCount ?? 0,
  }));

  return (
    <div className="min-h-screen py-12">
      <ViewCounter slug={story.slug} />

      <article className="container mx-auto max-w-4xl px-4">
        <Link
          href={authorUrl}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          {authorName}'in diğer öykülerine dön
        </Link>

        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            {story.title}
          </h1>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link
              href={authorUrl}
              className="flex items-center gap-2 hover:text-primary"
            >
              <User className="h-4 w-4" />
              {authorName}
            </Link>

            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {formattedDate}
            </span>
          </div>
        </header>

        <div className="relative aspect-[3/2] rounded-lg overflow-hidden mb-12">
          <StoryCardImage
            src={story.illustrationUrl ?? ""}
            alt={story.title}
            className="object-cover"
          />
        </div>

        <div className="story-content mb-16">
          {story.content?.split("\n\n").map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <div className="mb-16 p-6 rounded-xl bg-muted/30">
          <div className="flex items-center gap-3 mb-3">
            <User className="h-6 w-6" />
            <h3 className="text-xl font-semibold">
              Yazar: {authorName}
            </h3>
          </div>

          <Link
            href={authorUrl}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
          >
            {authorName}'in tüm öykülerini gör
            <ArrowLeft className="h-4 w-4 rotate-180" />
          </Link>
        </div>

        <CommentSection storyId={story.id} />
      </article>

      {relatedStories.length > 0 && (
        <section className="py-16 bg-muted/30 mt-16">
          <div className="container mx-auto max-w-6xl px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              {authorName}'in Diğer Öyküleri
            </h2>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {relatedStories.map((s) => (
                <StoryCard key={s.id} story={s} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
