"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import UploadDropzone from "@/app/admin/_components/UploadDropzone";

type Lang = "tr" | "en" | "fr";
type Author = "deri" | "kemik";

type StoryDTO = {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  author: string;
  language: string;
  illustrationUrl: string;
  originalStoryId: string | null;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[ğ]/g, "g")
    .replace(/[ü]/g, "u")
    .replace(/[ş]/g, "s")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ç]/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function AdminStoryEditPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const id = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [author, setAuthor] = useState<Author>("deri");
  const [language, setLanguage] = useState<Lang>("tr");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [illustrationUrl, setIllustrationUrl] = useState("");
  const [originalStoryId, setOriginalStoryId] = useState<string>("");

  const previewHref = useMemo(() => {
    const langPrefix = language === "tr" ? "" : `/${language}`;
    return `${langPrefix}/story/${slug || ""}`;
  }, [language, slug]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setInfo(null);

      try {
        const res = await fetch(`/api/admin/stories/${id}`, { cache: "no-store" });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || `GET başarısız (HTTP ${res.status})`);
        }

        const s: StoryDTO = await res.json();

        if (cancelled) return;

        setTitle(s.title ?? "");
        setSlug(s.slug ?? "");
        setAuthor(((s.author ?? "deri").toLowerCase() as Author) || "deri");
        setLanguage(((s.language ?? "tr").toLowerCase() as Lang) || "tr");
        setExcerpt(s.excerpt ?? "");
        setContent(s.content ?? "");
        setIllustrationUrl(s.illustrationUrl ?? "");
        setOriginalStoryId(s.originalStoryId ?? "");
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Yüklenirken hata oluştu.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const onAutoSlug = () => {
    if (!title.trim()) return;
    setSlug(slugify(title));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim(),
        author: author.toLowerCase(),
        language: language.toLowerCase(),
        excerpt: excerpt.trim(),
        content: content,
        illustrationUrl: illustrationUrl.trim(),
        originalStoryId: originalStoryId.trim() ? originalStoryId.trim() : null,
      };

      const res = await fetch(`/api/admin/stories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Kaydetme başarısız (HTTP ${res.status})`);
      }

      setInfo("Kaydedildi ✅");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Kaydetme sırasında hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const ok = confirm("Bu öyküyü kalıcı olarak silmek istiyor musun?");
    if (!ok) return;

    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      const res = await fetch(`/api/admin/stories/${id}`, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Silme başarısız (HTTP ${res.status})`);
      }

      router.push("/admin/stories");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Silme sırasında hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-serif font-bold mb-4">Öykü Düzenle</h1>
        <p className="text-muted-foreground">Yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold">Öykü Düzenle</h1>
          <p className="text-sm text-muted-foreground">ID: {id}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/stories"
            className="px-4 py-2 rounded-md border hover:bg-muted transition"
          >
            Listeye Dön
          </Link>
          {slug && (
            <Link
              href={previewHref}
              className="px-4 py-2 rounded-md border hover:bg-muted transition"
              target="_blank"
            >
              Önizleme
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      {info && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-green-800">
          {info}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border bg-white p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Başlık *</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Öykü başlığı"
            />
            <div className="mt-2">
              <button
                type="button"
                onClick={onAutoSlug}
                className="text-sm px-3 py-1 rounded-md border hover:bg-muted transition"
              >
                Slug otomatik oluştur
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">URL Slug *</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="ornegin-anne"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Not: Slug benzersiz olmalı. (Seçenek 2 kullandığın için global unique)
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Yazar *</label>
              <select
                className="w-full rounded-md border px-3 py-2"
                value={author}
                onChange={(e) => setAuthor(e.target.value as Author)}
              >
                <option value="deri">Deri</option>
                <option value="kemik">Kemik</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Dil *</label>
              <select
                className="w-full rounded-md border px-3 py-2"
                value={language}
                onChange={(e) => setLanguage(e.target.value as Lang)}
              >
                <option value="tr">TR</option>
                <option value="en">EN</option>
                <option value="fr">FR</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Özet (excerpt)</label>
            <textarea
              className="w-full rounded-md border px-3 py-2 min-h-[90px]"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Kartta görünen kısa özet"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">İllustrasyon</label>

            <UploadDropzone
              value={illustrationUrl}
              onUploaded={(url) => setIllustrationUrl(url)}
            />

            {illustrationUrl ? (
              <p className="text-xs text-muted-foreground mt-2 break-all">
                URL: {illustrationUrl}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">
                Henüz görsel yok.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Original Story ID (opsiyonel)</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={originalStoryId}
              onChange={(e) => setOriginalStoryId(e.target.value)}
              placeholder="TR orijinal öykü id’si"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">İçerik *</label>
            <textarea
              className="w-full rounded-md border px-3 py-2 min-h-[260px]"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Öykü metni"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-md bg-black text-white disabled:opacity-60"
          >
            {saving ? "İşleniyor..." : "Kaydet"}
          </button>

          <Link
            href="/admin/stories"
            className="px-6 py-3 rounded-md border hover:bg-muted transition"
          >
            Vazgeç
          </Link>

          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="px-6 py-3 rounded-md border border-red-600 text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            Sil
          </button>
        </div>
      </form>
    </div>
  );
}
