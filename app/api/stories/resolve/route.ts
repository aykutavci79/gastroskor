export const runtime = "nodejs";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type Locale = "tr" | "en" | "fr" | "ar";
function isLocale(x: string | null): x is Locale {
  return x === "tr" || x === "en" || x === "fr" || x === "ar";
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const slug = url.searchParams.get("slug");

    if (!isLocale(from) || !isLocale(to) || !slug) {
      return NextResponse.json(
        { error: "Missing/invalid params: from,to,slug" },
        { status: 400 }
      );
    }

    // current: language+slug unique
    const current = await prisma.story.findFirst({
      where: { language: from, slug },
      select: { id: true, originalStoryId: true, author: true },
    });

    if (!current) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    const rootId = current.originalStoryId ?? current.id;

    const target =
      to === "tr"
        ? await prisma.story.findFirst({
            where: { id: rootId, language: "tr", author: current.author },
            select: { slug: true },
          })
        : await prisma.story.findFirst({
            where: {
              language: to,
              author: current.author,
              originalStoryId: rootId,
            },
            select: { slug: true },
          });

    if (!target) {
      return NextResponse.json({ error: "Translation not found" }, { status: 404 });
    }

    return NextResponse.json({ slug: target.slug }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
