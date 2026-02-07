// app/ar/ara/page.tsx
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function ArabicSearch() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">بحث</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          قريبًا سنضيف البحث بالعربية.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Link className="rounded-full border px-3 py-1.5 text-sm hover:bg-muted" href="/ar/deri">
            ديري
          </Link>
          <Link className="rounded-full border px-3 py-1.5 text-sm hover:bg-muted" href="/ar/kemik">
            كيميك
          </Link>
        </div>
      </header>

      <section className="rounded-2xl border p-6">
        <h2 className="text-base font-semibold">قريبًا</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          هذه الصفحة موجودة لتجنب 404. عندما نربط البحث بقاعدة البيانات سنجهزها بالكامل.
        </p>
      </section>
    </main>
  );
}
