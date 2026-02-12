import { prisma } from "@/lib/db";
import HomePage from "@/components/home/HomePage";

export const dynamic = "force-dynamic";

export default async function Home() {
  const storiesRaw = await prisma.story.findMany({
    where: { language: "tr" },
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

  return <HomePage lang="tr" stories={stories} />;
}
