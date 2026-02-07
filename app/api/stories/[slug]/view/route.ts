import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Lang = "tr" | "en" | "fr";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;

    // ?lang=en gibi (yoksa tr)
    const { searchParams } = new URL(request.url);
    const langParam = (searchParams.get("lang") ?? "tr").toLowerCase();
    const language: Lang = (["tr", "en", "fr"].includes(langParam) ? langParam : "tr") as Lang;

    // Increment view count (compound unique: language + slug)
    const story = await prisma.story.update({
      where: {
        language_slug: {
          language,
          slug,
        },
      },
      data: {
        viewCount: { increment: 1 },
      },
      select: { id: true, viewCount: true },
    });

    return NextResponse.json({ success: true, story });
  } catch (error) {
    console.error("Increment view error:", error);
    return NextResponse.json(
      { error: "Görüntülenme sayısı artırılırken hata oluştu" },
      { status: 500 }
    );
  }
}
