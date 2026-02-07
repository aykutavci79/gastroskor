import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// İstersen burada admin kontrolü de ekleriz (getServerSession vs).
// Şimdilik sadece endpoint'i çalışır hale getiriyoruz.

export async function GET() {
  try {
    const stories = await prisma.story.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        slug: true,
        author: true,
        language: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ stories });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const title = String(body?.title ?? "").trim();
    const slug = String(body?.slug ?? "").trim();
    const content = String(body?.content ?? "").trim();
    const author = String(body?.author ?? "").trim();

    const language = String(body?.language ?? "tr").trim(); // tr/en/fr
    const excerpt = String(body?.excerpt ?? "").trim();
    const illustrationUrl = String(body?.illustrationUrl ?? "").trim();
    const originalStoryId = body?.originalStoryId ? String(body.originalStoryId) : null;

    if (!title || !slug || !content || !author) {
      return NextResponse.json(
        { error: "title, slug, content, author zorunlu." },
        { status: 400 }
      );
    }

    const created = await prisma.story.create({
      data: {
        title,
        slug,
        content,
        author,
        language,
        excerpt: excerpt || title,
        illustrationUrl: illustrationUrl || "",
        originalStoryId,
      },
      select: { id: true, slug: true, language: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    // slug unique hataları vs buraya düşer
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
