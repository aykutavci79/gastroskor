import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import HomePage from "@/components/home/HomePage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "جلد وعظم (ديري وكيميك) - قصص تركية معاصرة",
  description: "قصص تركية معاصرة باللغة العربية. نصوص أدبية بقلم ديري وكيميك.",
};

export default async function ArabicHome() {
  const storiesRaw = await prisma.story.findMany({
    where: { language: "ar" },
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

  return <HomePage lang="ar" stories={stories} />;
}
