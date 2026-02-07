import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  params: { slug: string };
};

export default async function ArKemikStoryPage({ params }: Props) {
  const slug = params.slug;

  const story = await prisma.story.findFirst({
    where: {
      slug,
      language: "ar",
      author: "kemik",
    },
  });

  if (!story) return notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold leading-tight" dir="rtl">
        {story.title}
      </h1>

      {story.publishedAt ? (
        <div className="mt-3 text-sm text-muted-foreground" dir="rtl">
          {new Date(story.publishedAt).toLocaleDateString("tr-TR")}
        </div>
      ) : null}

      {story.illustrationUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={story.illustrationUrl}
          alt={story.title}
          className="mt-8 h-80 w-full rounded-2xl object-cover"
          loading="lazy"
        />
      ) : null}

      {story.excerpt ? (
        <p className="mt-6 text-lg text-muted-foreground" dir="rtl">
          {story.excerpt}
        </p>
      ) : null}

      <article className="prose prose-neutral mt-10 max-w-none" dir="rtl">
        <pre className="whitespace-pre-wrap font-sans text-base leading-7">
          {story.content}
        </pre>
      </article>
    </main>
  );
}
