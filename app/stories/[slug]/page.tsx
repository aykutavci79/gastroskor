import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import StoryViewTracker from "@/components/StoryViewTracker";

type Lang = "tr" | "en" | "fr";

export default async function StoryDetailPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { lang?: Lang };
}) {
  const lang: Lang = (searchParams?.lang as Lang) || "tr";
  const slug = params.slug;

  const trStory = await prisma.story.findFirst({
    where: { slug, language: "tr" },
  });

  if (!trStory) return notFound();

  let story = trStory;

  if (lang !== "tr") {
    const translated = await prisma.story.findFirst({
      where: {
        language: lang,
        originalStoryId: trStory.id,
      },
    });

    if (translated) story = translated;
  }

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      {/* GA4 event: hangi öykü kaç okundu */}
      <StoryViewTracker
        storySlug={story.slug}          // görünen sayfanın slug'ı
        language={story.language}       // gerçekten gösterilen dil
        storyId={trStory.id}            // canonical id (TR ana kayıt)
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <a href={`/stories?lang=${lang}`} style={{ textDecoration: "none" }}>
          ← Geri
        </a>

        <div style={{ opacity: 0.7, fontSize: 12 }}>
          Gösterilen dil: <b>{story.language.toUpperCase()}</b>
        </div>
      </div>

      <h1 style={{ marginTop: 12 }}>{story.title}</h1>

      <div style={{ opacity: 0.6, marginTop: 6, fontSize: 12 }}>
        {new Date(story.publishedAt).toLocaleDateString("tr-TR")} · {story.author}
      </div>

      <article style={{ marginTop: 18, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
        {story.content}
      </article>
    </main>
  );
}
