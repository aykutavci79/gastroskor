import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import HomePage from "@/components/home/HomePage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Skin & Bone (Deri & Kemik) - Turkish Short Stories in English",
  description:
    "Explore contemporary Turkish short fiction in English translation. Literary narratives by deri and kemik.",
};

export default async function EnglishHome() {
  const storiesRaw = await prisma.story.findMany({
    where: { language: "en" },
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

  return <HomePage lang="en" stories={stories} />;
}
