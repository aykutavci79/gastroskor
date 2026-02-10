import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function ArDeriStoryPage({ params }: PageProps) {
  const story = await prisma.story.findFirst({
    where: {
      slug: params.slug,
      author: "deri",
      language: "ar",
    },
  });

  if (!story) {
    notFound();
  }

  return (
    <article
      style={{
        maxWidth: "720px",
        margin: "0 auto",
        padding: "2rem 1rem",
        direction: "rtl",
        textAlign: "right",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
        {story.title}
      </h1>

      {story.excerpt && (
        <p style={{ opacity: 0.75, marginBottom: "1.5rem" }}>
          {story.excerpt}
        </p>
      )}

      <div
        style={{ lineHeight: "1.9" }}
        dangerouslySetInnerHTML={{ __html: story.content }}
      />
    </article>
  );
}
