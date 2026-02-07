import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

type Locale = "tr" | "en" | "fr" | "ar";

export default async function StoryPage({
  params,
}: {
  params: { lang: Locale; author: string; slug: string };
}) {
  const lang = params.lang ?? "tr";
  const author = params.author;
  const slug = params.slug;

  const story = await prisma.story.findFirst({
    where: {
      language: lang,
      author,
      slug,
    },
  });

  if (!story) return notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{story.title}</h1>
        <div className="mt-2 text-sm text-muted-foreground">
          <span>{story.author}</span>
          <span className="mx-2">•</span>
          <span>{new Date(story.publishedAt).toLocaleDateString()}</span>
          <span className="mx-2">•</span>
          <span>{story.language.toUpperCase()}</span>
        </div>
      </header>

      {story.illustrationUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={story.illustrationUrl}
          alt={story.title}
          className="mb-8 w-full rounded-2xl border object-cover"
        />
      ) : null}

      <article className="prose max-w-none whitespace-pre-wrap">
        {story.content}
      </article>
    </main>
  );
}
