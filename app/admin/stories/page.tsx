import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminStoriesPage() {
  const stories = await prisma.story.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      author: true,
      language: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-semibold">Öyküler</h1>
        <Link
          href="/admin/stories/new"
          className="px-4 py-2 rounded-md border bg-black text-white"
        >
          Yeni Öykü
        </Link>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold opacity-70 bg-gray-50">
          <div className="col-span-5">Başlık</div>
          <div className="col-span-2">Dil</div>
          <div className="col-span-2">Yazar</div>
          <div className="col-span-2">Tarih</div>
          <div className="col-span-1 text-right">Düzenle</div>
        </div>

        {stories.map((s) => (
          <div
            key={s.id}
            className="grid grid-cols-12 gap-2 px-4 py-3 border-t items-center"
          >
            <div className="col-span-5">
              <div className="font-medium">{s.title}</div>
              <div className="text-xs opacity-60 break-all">/{s.slug}</div>
            </div>

            <div className="col-span-2">
              <span className="text-xs px-2 py-1 rounded border">
                {String(s.language).toUpperCase()}
              </span>
            </div>

            <div className="col-span-2 text-sm">{s.author}</div>

            <div className="col-span-2 text-xs opacity-70">
              {new Date(s.createdAt).toLocaleString()}
            </div>

            <div className="col-span-1 text-right">
              <Link
                href={`/admin/stories/${s.id}`}
                className="text-sm underline"
              >
                Aç
              </Link>
            </div>
          </div>
        ))}

        {stories.length === 0 ? (
          <div className="p-6 text-sm opacity-70">Henüz öykü yok.</div>
        ) : null}
      </div>
    </div>
  );
}
