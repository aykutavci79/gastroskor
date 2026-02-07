// app/ar/kemik/page.tsx
import Link from "next/link";
import prisma from "../../../lib/prisma";

export const dynamic = "force-dynamic";

type StoryCard = {
  id: string;
  title: string | null;
  slug: string;
  excerpt: string | null;
  illustrationUrl: string | null;
  createdAt: Date;
};

function EmptyState({ author }: { author: "deri" | "kemik" }) {
  const title =
    author === "deri" ? "لا توجد قصص عربية لديري بعد" : "لا توجد قصص عربية لكيميك بعد";

  const hint =
    author === "deri"
      ? "أضف أول قصة عربية لديري من لوحة الإدارة."
      : "أضف أول قصة عربية لكيميك من لوحة الإدارة.";

  return (
    <div className="rounded-2xl border p-6">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{hint}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          className="rounded-xl border px-3 py-2 text-sm hover:bg-muted"
          href="/admin/stories/new"
        >
          + إضافة قصة (Admin)
        </Link>

        <Link className="rounded-xl border px-3 py-2 text-sm hover:bg-muted" href="/ar/deri">
          اذهب إلى ديري
        </Link>
      </div>
    </div>
  );
}

export default async function ArabicKemikHome() {
  const stories: StoryCard[] = await prisma.story.findMany({
    where: { language: "ar", author: "kemik" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      illustrationUrl: true,
      createdAt: true,
    },
    take: 50,
  });

  return (
    <main dir="rtl" className="mx-auto w-full max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">كيميك</h1>
        <p className="mt-2 text-sm text-muted-foreground">قصص كيميك بالعربية</p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Link className="rounded-full border px-3 py-1.5 text-sm hover:bg-muted" href="/ar/kemik">
            كل كيميك
          </Link>
          <Link className="rounded-full border px-3 py-1.5 text-sm hover:bg-muted" href="/ar/deri">
            اذهب إلى ديري
          </Link>
        </div>
      </header>

      <section>
        <h2 className="mb-4 text-lg font-medium">أحدث القصص</h2>

        {stories.length === 0 ? (
          <EmptyState author="kemik" />
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {stories.map((s) => (
              <li key={s.id} className="rounded-2xl border p-4">
                {s.illustrationUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.illustrationUrl}
                    alt={s.title ?? ""}
                    className="mb-3 h-44 w-full rounded-xl object-cover"
                    loading="lazy"
                  />
                ) : null}

                <h3 className="truncate text-base font-semibold">{s.title || "(بدون عنوان)"}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.excerpt || ""}</p>

                <div className="mt-4">
                  <Link
                    href={`/ar/kemik/${s.slug}`}
                    className="inline-flex rounded-xl border px-3 py-2 text-sm hover:bg-muted"
                  >
                    اقرأ
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
