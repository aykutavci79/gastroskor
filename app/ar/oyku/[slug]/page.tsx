import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import StoryCardImage from "@/components/StoryCardImage";
import type { Metadata } from "next";
import { Calendar, User, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

const SITE_URL = "https://derivekemik.com";

function absoluteUrl(path: string) {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

type Props = {
  params: { slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const story = await prisma.story.findFirst({
    where: {
      slug: params.slug,
      language: "ar",
    },
    select: {
      id: true,
      originalStoryId: true,
      slug: true,
      title: true,
      excerpt: true,
      illustrationUrl: true,
    },
  });

  if (!story) return { title: "القصة غير موجودة | Deri & Kemik" };

  const canonicalUrl = absoluteUrl(`/ar/oyku/${story.slug}`);
  const description = (story.excerpt ?? "").trim();

  // alternates by canonical id
  const canonicalId = story.originalStoryId ?? story.id;

  const [trAlt, enAlt, frAlt] = await Promise.all([
    prisma.story.findFirst({
      where: { language: "tr", OR: [{ id: canonicalId }, { originalStoryId: canonicalId }] },
      select: { slug: true },
    }),
    prisma.story.findFirst({
      where: { language: "en", OR: [{ id: canonicalId }, { originalStoryId: canonicalId }] },
      select: { slug: true },
    }),
    prisma.story.findFirst({
      where: { language: "fr", OR: [{ id: canonicalId }, { originalStoryId: canonicalId }] },
      select: { slug: true },
    }),
  ]);

  const ogImages = story.illustrationUrl
    ? [{ url: story.illustrationUrl, alt: story.title ?? "" }]
    : undefined;

  return {
    title: `${story.title ?? ""} | Deri & Kemik`,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        ar: canonicalUrl,
        ...(trAlt?.slug ? { tr: absoluteUrl(`/oyku/${trAlt.slug}`) } : {}),
        ...(enAlt?.slug ? { en: absoluteUrl(`/en/story/${enAlt.slug}`) } : {}),
        ...(frAlt?.slug ? { fr: absoluteUrl(`/fr/story/${frAlt.slug}`) } : {}),
      },
    },
    openGraph: {
      type: "article",
      url: canonicalUrl,
      title: story.title ?? "",
      description,
      images: ogImages,
    },
    twitter: {
      card: story.illustrationUrl ? "summary_large_image" : "summary",
      title: story.title ?? "",
      description,
      images: story.illustrationUrl ? [story.illustrationUrl] : undefined,
    },
  };
}

export default async function ArOykuPage({ params }: Props) {
  const slug = params.slug;

  const story = await prisma.story.findFirst({
    where: {
      slug,
      language: "ar",
    },
  });

  if (!story) return notFound();

  const author = (story.author ?? "").toLowerCase();
  const authorName = author === "deri" ? "ديري" : "كيميك";
  const authorUrl = author === "deri" ? "/ar/deri" : "/ar/kemik";

  const canonicalId = story.originalStoryId ?? story.id;
  const canonicalUrl = absoluteUrl(`/ar/oyku/${story.slug}`);

  const formattedDate = story.publishedAt
    ? new Date(story.publishedAt).toLocaleDateString("ar", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  // JSON-LD (ShortStory)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ShortStory",
    "@id": canonicalUrl,
    url: canonicalUrl,
    inLanguage: "ar",
    name: story.title ?? "",
    headline: story.title ?? "",
    description: (story.excerpt ?? "").trim() || undefined,
    image: story.illustrationUrl || undefined,
    datePublished: story.publishedAt?.toISOString?.() || undefined,
    author: {
      "@type": "Person",
      name: story.author ?? "",
    },
    publisher: {
      "@type": "Organization",
      name: "Deri & Kemik",
      url: SITE_URL,
    },
  };

  return (
    <div className="min-h-screen py-12" dir="rtl">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="container mx-auto max-w-4xl px-4">
        {/* Back Button */}
        <Link
          href={authorUrl}
          className="inline-flex items-center gap-2 font-inter text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          العودة إلى قصص {authorName}
        </Link>

        {/* Header */}
        <header className="mb-8">
          <h1 className="font-playfair text-4xl md:text-5xl font-bold text-primary mb-6 leading-tight">
            {story.title ?? ""}
          </h1>

          <div className="flex items-center gap-6 font-inter text-sm text-muted-foreground">
            <Link
              href={authorUrl}
              className="flex items-center gap-2 hover:text-primary transition-colors"
            >
              <User className="h-4 w-4" />
              {authorName}
            </Link>

            {formattedDate ? (
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formattedDate}
              </span>
            ) : null}
          </div>
        </header>

        {/* Illustration */}
        <div className="relative aspect-[3/2] bg-muted rounded-lg overflow-hidden mb-12 shadow-lg">
          <StoryCardImage
            src={story.illustrationUrl}
            alt={story.title ?? ""}
            className="object-cover"
          />
        </div>

        {/* Excerpt */}
        {story.excerpt ? (
          <p className="mb-8 text-lg text-muted-foreground font-inter">{story.excerpt}</p>
        ) : null}

        {/* Content */}
        <div className="story-content">
          <pre className="whitespace-pre-wrap font-sans text-base leading-7">
            {story.content}
          </pre>
        </div>
      </article>
    </div>
  );
}
