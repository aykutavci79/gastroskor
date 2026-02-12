import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import HomePage from "@/components/home/HomePage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Peau & Os (Deri & Kemik) - Nouvelles turques contemporaines",
  description:
    "Découvrez des nouvelles turques contemporaines en français. Récits littéraires par deri et kemik.",
};

export default async function FrenchHome() {
  const storiesRaw = await prisma.story.findMany({
    where: { language: "fr" },
    orderBy: { publishedAt: "desc" },
    take: 10,
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

  const stories = storiesRaw.map((s) => ({
    ...s,
    excerpt: s.excerpt ?? null,
    illustrationUrl: s.illustrationUrl ?? null,
    publishedAt: s.publishedAt.toISOString(),
    viewCount: s.viewCount ?? 0,
  }));

  return <HomePage lang="fr" stories={stories} />;
}
