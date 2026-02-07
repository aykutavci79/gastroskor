import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function safeStr(v: any, fallback = ""): string {
  if (v === undefined || v === null) return fallback;
  return String(v);
}

function safeNullableStr(v: any): string | null {
  const s = safeStr(v, "").trim();
  return s.length ? s : null;
}

// Unicode destekli slug (Arapça dahil). Noktalama/boşlukları tire yapar.
function baseSlug(v: any): string {
  const s = safeStr(v, "").trim();

  // boşsa
  if (!s) return "story";

  // normalize + küçük harf (Arapçada etkisi yok ama sorun değil)
  const normalized = s.normalize("NFKC").toLowerCase();

  // Harf/rakam dışını tire yap (unicode property escapes)
  const cleaned = normalized
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

  return cleaned || "story";
}

async function makeUniqueSlug(requested: any, language: string) {
  const b = baseSlug(requested);

  // ✅ slug artık dil içinde unique olmalı
  const exists = await prisma.story.findFirst({
    where: { language, slug: b },
    select: { id: true },
  });
  if (!exists) return b;

  for (let i = 2; i < 5000; i++) {
    const candidate = `${b}-${i}`;
    const hit = await prisma.story.findFirst({
      where: { language, slug: candidate },
      select: { id: true },
    });
    if (!hit) return candidate;
  }

  return `${b}-${Date.now()}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const title = safeStr(body.title, "").trim();
    const content = safeStr(body.content, ""); // null yok
    const excerpt = safeStr(body.excerpt, "");
    const illustrationUrl = safeStr(body.illustrationUrl, "");

    if (!title) {
      return NextResponse.json(
        { ok: false, error: "Başlık boş olamaz." },
        { status: 400 }
      );
    }

    const language = safeStr(body.language, "tr").toLowerCase();
    const author = safeStr(body.author, "deri").toLowerCase();

    // ✅ burası önemli: makeUniqueSlug'e language veriyoruz
    const slug = await makeUniqueSlug(body.slug || title, language);

    const story = await prisma.story.create({
      data: {
        title,
        slug,
        language,
        author,
        excerpt,
        content,
        illustrationUrl,
        originalStoryId: safeNullableStr(body.originalStoryId),
      },
    });

    return NextResponse.json({ ok: true, story }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "POST /api/admin/stories failed" },
      { status: 500 }
    );
  }
}
