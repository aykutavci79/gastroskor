import Link from "next/link";
import prisma from "@/lib/prisma";
import StoryCardImage from "@/components/StoryCardImage";

export const dynamic = "force-dynamic";

export default async function ArOykuListPage() {
  const stories = await prisma.story.findMany({
    where: {
      language: "ar",
      publishedAt: {
        gt: new Date(0), // ✅ null yerine TS-safe filtre
      },
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

  return (
    <div className="min-h-screen py-12" dir="rtl">
      <div className="container mx-auto max-w-6xl px-4">
        <h1 className="mb-10 text-4xl font-bold text-primary">
          القصص
        </h1>

        {stories.length === 0 ? (
          <p className="text-muted-foreground">
            لا توجد قصص منشورة حالياً.
          </p>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {stories.map((story) => (
              <Link
                key={story.id}
                href={`/ar/oyku/${story.slug}`}
                className="group block overflow-hidden rounded-xl border bg-background shadow-sm transition hover:shadow-lg"
              >
                <div className="relative aspect-[3/2] bg-muted">
                  <StoryCardImage
                    src={story.illustrationUrl}
                    alt={story.title ?? ""}
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                <div className="p-5">
                  <h2 className="mb-2 line-clamp-2 text-xl font-semibold text-primary">
                    {story.title}
                  </h2>

                  {story.excerpt ? (
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {story.excerpt}
                    </p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
