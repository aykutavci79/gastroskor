import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const id = params.id;

    const story = await prisma.story.findUnique({
      where: { id },
    });

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    return NextResponse.json(story);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const id = params.id;
    const body = await req.json();

    const title = String(body?.title ?? "").trim();
    const slug = String(body?.slug ?? "").trim();
    const content = String(body?.content ?? "").trim();
    const excerpt = String(body?.excerpt ?? "").trim();

    const authorRaw = String(body?.author ?? "").trim();
    const author = authorRaw ? authorRaw.toLowerCase() : "";

    const language = String(body?.language ?? "tr").trim().toLowerCase();
    const illustrationUrl = String(body?.illustrationUrl ?? "").trim();
    const originalStoryId = body?.originalStoryId ? String(body.originalStoryId) : null;

    if (!title || !slug || !content || !author) {
      return NextResponse.json(
        { error: "title, slug, content, author zorunlu." },
        { status: 400 }
      );
    }

    const updated = await prisma.story.update({
      where: { id },
      data: {
        title,
        slug,
        content,
        excerpt: excerpt || title,
        author,
        language,
        illustrationUrl: illustrationUrl || "",
        originalStoryId,
      },
      select: { id: true, slug: true, language: true },
    });

    // ✅ sayfaları tazele
    revalidatePath("/admin/stories");
    revalidatePath(`/admin/stories/${id}`);
    revalidatePath("/admin");
    revalidatePath("/");
    revalidatePath("/en");
    revalidatePath("/fr");
    revalidatePath("/stories");
    revalidatePath("/en/stories");
    revalidatePath("/fr/stories");
    revalidatePath("/deri");
    revalidatePath("/kemik");
    revalidatePath("/en/deri");
    revalidatePath("/en/kemik");
    revalidatePath("/fr/deri");
    revalidatePath("/fr/kemik");

    return NextResponse.json(updated);
  } catch (err: any) {
    // slug unique çakışması
    if (err?.code === "P2002") {
      return NextResponse.json(
        { error: "Bu slug zaten kullanılıyor. Lütfen slug'ı değiştir." },
        { status: 409 }
      );
    }

    // bulunamadı
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const id = params.id;

    await prisma.story.delete({
      where: { id },
    });

    // ✅ sayfaları tazele
    revalidatePath("/admin/stories");
    revalidatePath("/admin");
    revalidatePath("/");
    revalidatePath("/en");
    revalidatePath("/fr");
    revalidatePath("/stories");
    revalidatePath("/en/stories");
    revalidatePath("/fr/stories");
    revalidatePath("/deri");
    revalidatePath("/kemik");
    revalidatePath("/en/deri");
    revalidatePath("/en/kemik");
    revalidatePath("/fr/deri");
    revalidatePath("/fr/kemik");

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
