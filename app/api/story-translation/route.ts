import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// Self-contained Prisma singleton (no dependency on your lib/prisma.ts)
const globalForPrisma = global as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * GET /api/story-translation?from=tr&to=en&slug=anne
 * Returns: { ok: true, slug: "anne-en" } or { ok: false, slug: null }
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const from = (searchParams.get("from") || "").toLowerCase();
    const to = (searchParams.get("to") || "").toLowerCase();
    const slug = (searchParams.get("slug") || "").trim();

    if (!from || !to || !slug) {
      return NextResponse.json(
        { ok: false, error: "missing_params", slug: null },
        { status: 400 }
      );
    }

    // 1) Find current story by (slug, language)
    const current = await prisma.story.findFirst({
      where: {
        slug,
        language: from,
      },
      select: {
        id: true,
        slug: true,
        language: true,
        originalStoryId: true,
      },
    });

    if (!current) {
      // If not found, also try stripping locale suffix (anne-en -> anne)
      const stripped = slug.replace(/-(en|fr|ar)$/, "");
      if (stripped !== slug) {
        const retry = await prisma.story.findFirst({
          where: { slug: stripped, language: from },
          select: { id: true, slug: true, language: true, originalStoryId: true },
        });

        if (!retry) {
          return NextResponse.json({ ok: false, slug: null });
        }

        const canonicalId = retry.originalStoryId ?? retry.id;

        const target = await prisma.story.findFirst({
          where: {
            language: to,
            OR: [{ id: canonicalId }, { originalStoryId: canonicalId }],
          },
          select: { slug: true },
        });

        return NextResponse.json({ ok: !!target, slug: target?.slug ?? null });
      }

      return NextResponse.json({ ok: false, slug: null });
    }

    // 2) Canonical group id
    const canonicalId = current.originalStoryId ?? current.id;

    // 3) Find target translation by canonical id
    const target = await prisma.story.findFirst({
      where: {
        language: to,
        OR: [{ id: canonicalId }, { originalStoryId: canonicalId }],
      },
      select: { slug: true },
    });

    return NextResponse.json({ ok: !!target, slug: target?.slug ?? null });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "server_error", slug: null },
      { status: 500 }
    );
  }
}
