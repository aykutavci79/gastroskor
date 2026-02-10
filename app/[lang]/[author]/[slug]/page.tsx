import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import StoryCardImage from "@/components/StoryCardImage";
import { Calendar, User, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

type Props = {
  params: {
    lang: string;
    author: string;
    slug: string;
  };
};

export default async function StoryPage({ params }: Props) {
  const { lang, author, slug } = params;

  const story = await prisma.story.findFirst({
    where: {
      slug,
      language: lang,
      author: author.toLowerCase(),
    },
  });

  if (!story) return notFound();

  const authorName =
    lang === "ar"
      ? author === "deri"
        ? "ديري"
        : "كيميك"
      : author;

  const backUrl = `/${lang}/${author}`;

  const formattedDate = story.publishedAt
    ? new Date(story.publishedAt).toLocaleDateString(lang === "ar" ? "ar" : "tr", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen py-12" dir={lang === "ar" ? "rtl" : "ltr"}>
      <article className="container mx-auto max-w-4xl px-4">
        <Link
          href={backUrl}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          {lang === "ar" ? `العودة إلى قصص ${authorName}` : "Geri dön"}
        </Link>

        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-6">{story.title}</h1>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {authorName}
            </span>

            {formattedDate && (
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formattedDate}
              </span>
            )}
          </div>
        </header>

        <div className="relative aspect-[3/2] mb-12 rounded-lg overflow-hidden">
          <StoryCardImage
            src={story.illustrationUrl}
            alt={story.title}
            className="object-cover"
          />
        </div>

        {story.excerpt && (
          <p className="mb-8 text-lg text-muted-foreground">
            {story.excerpt}
          </p>
        )}

        <div className="whitespace-pre-wrap leading-7">
          {story.content}
        </div>
      </article>
    </div>
  );
}
