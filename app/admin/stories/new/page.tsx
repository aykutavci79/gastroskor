"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import StoryImageDropzone from "@/components/admin/StoryImageDropzone";

type Language = "tr" | "en" | "fr" | "ar";
type Author = "deri" | "kemik";

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "tr", label: "TR" },
  { value: "en", label: "EN" },
  { value: "fr", label: "FR" },
  { value: "ar", label: "AR (Arabic)" },
];

const AUTHORS: { value: Author; label: string }[] = [
  { value: "deri", label: "Deri" },
  { value: "kemik", label: "Kemik" },
];

function slugify(input: string): string {
  const s = (input || "").trim().toLowerCase();
  const map: Record<string, string> = { "Ã§": "c", "ÄŸ": "g", "Ä±": "i", "Ä°": "i", "Ã¶": "o", "ÅŸ": "s", "Ã¼": "u" };
  const replaced = s
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

  const slug = replaced
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

  return slug || "story";
}

export default function NewStoryPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [language, setLanguage] = useState<Language>("tr");
  const [author, setAuthor] = useState<Author>("deri");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [illustrationUrl, setIllustrationUrl] = useState("");
  const [originalStoryId, setOriginalStoryId] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [serverSlug, setServerSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const autoSlug = useMemo(() => slugify(title), [title]);

  function handleAutoSlug() {
    setSlug(autoSlug);
    setServerSlug(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setServerSlug(null);

    const finalSlug = (slug || autoSlug || "story").trim();

    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: finalSlug,
          language,
          author,
          excerpt: excerpt.trim(),
          content: (content ?? ""),
          illustrationUrl: illustrationUrl.trim(),
          originalStoryId: originalStoryId.trim() || null,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "KayÄ±t sÄ±rasÄ±nda hata oluÅŸtu.");
        return;
      }

      setServerSlug(data?.story?.slug ?? null);

      const id = data?.story?.id;
      if (id) router.push(`/admin/stories/${id}`);
      else router.push("/admin/stories");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Beklenmeyen hata.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Yeni Ã–ykÃ¼ Ekle</h1>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {serverSlug ? (
        <div className="mt-6 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Kaydedildi. OluÅŸan slug: <span className="font-mono">{serverSlug}</span>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="space-y-2">
            <div className="text-sm font-medium">Dil</div>
            <select
              className="w-full rounded-xl border bg-background px-3 py-2"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <div className="text-sm font-medium">Yazar</div>
            <select
              className="w-full rounded-xl border bg-background px-3 py-2"
              value={author}
              onChange={(e) => setAuthor(e.target.value as Author)}
            >
              {AUTHORS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <div className="text-sm font-medium">Original Story ID (opsiyonel)</div>
            <input
              className="w-full rounded-xl border bg-background px-3 py-2"
              value={originalStoryId}
              onChange={(e) => setOriginalStoryId(e.target.value)}
              placeholder="TR versiyonunun IDâ€™si (Ã§eviri iÃ§in)"
            />
          </label>
        </div>

        <label className="block space-y-2">
          <div className="text-sm font-medium">BaÅŸlÄ±k</div>
          <input
            className="w-full rounded-xl border bg-background px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='Ã–rn: "Anne" / "Ø§Ù„Ø£Ù…"'
          />
        </label>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="md:col-span-2 space-y-2">
            <div className="text-sm font-medium">Slug (unique)</div>
            <input
              className="w-full rounded-xl border bg-background px-3 py-2 font-mono"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={autoSlug}
            />
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={handleAutoSlug} className="rounded-xl border px-3 py-2 text-sm hover:bg-muted">
                Slug Ã¼ret (baÅŸlÄ±ktan)
              </button>
            </div>
          </label>

          {/* âœ… Dropzone burada */}
          <div className="md:col-span-1">
            <StoryImageDropzone value={illustrationUrl} onChange={setIllustrationUrl} />
          </div>
        </div>

        <label className="block space-y-2">
          <div className="text-sm font-medium">Ã–zet (opsiyonel)</div>
          <textarea className="w-full rounded-xl border bg-background px-3 py-2" rows={3} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
        </label>

        <label className="block space-y-2">
          <div className="text-sm font-medium">Ä°Ã§erik</div>
          <textarea className="w-full rounded-xl border bg-background px-3 py-2 font-serif" rows={14} value={content} onChange={(e) => setContent(e.target.value)} />
        </label>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={isSaving} className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60">
            {isSaving ? "Kaydediliyor..." : "Kaydet"}
          </button>

          <button type="button" onClick={() => router.push("/admin/stories")} className="rounded-xl border px-4 py-2 text-sm hover:bg-muted">
            VazgeÃ§
          </button>
        </div>
      </form>
    </div>
  );
}


