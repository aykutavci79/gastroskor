import Link from "next/link";
import prisma from "@/lib/prisma";
import StoryCardImage from "@/components/StoryCardImage";

export const dynamic = "force-dynamic";

export default async function ArOykuListPage() {
  const stories = await prisma.story.findMany({
    where: {
      language: "ar",
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
        <h1 className="mb-12 text-center font-playfair text-4xl font-bold text-primary">
          القصص
        </h1>

        {stories.length === 0 ? (
          <p className="text-center text-muted-foreground">
            لا توجد قصص بعد
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
            {stories.map((story) => {
              const author = (story.author ?? "").toLowerCase();
              const authorName = author === "deri" ? "ديري" : "كيميك";

              return (
                <article
                  key={story.id}
                  className="overflow-hidden rounded-lg border bg-background shadow-sm transition hover:shadow-md"
                >
                  <Link href={`/ar/${author}/${story.slug}`}>
                    <div className="relative aspect-[3/2]">
                      <StoryCardImage
                        src={story.illustrationUrl}
                        alt={story.title ?? ""}
                        className="object-cover"
                      />
                    </div>
                  </Link>

                  <div className="p-6">
                    <Link href={`/ar/${author}/${story.slug}`}>
                      <h2 className="mb-3 font-playfair text-xl font-bold leading-snug hover:text-primary">
                        {story.title}
                      </h2>
                    </Link>

                    {story.excerpt ? (
                      <p className="mb-4 text-sm text-muted-foreground line-clamp-3">
                        {story.excerpt}
                      </p>
                    ) : null}

                    <div className="text-sm text-muted-foreground">
                      {authorName}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
