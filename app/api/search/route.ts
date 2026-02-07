import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = (searchParams.get('q') ?? '').trim()

    if (!query) {
      return NextResponse.json(
        { error: 'Arama sorgusu gerekli' },
        { status: 400 }
      )
    }

    const stories = await prisma.story.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { content: { contains: query } },
          { excerpt: { contains: query } },
        ],
      },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        author: true,
        illustrationUrl: true,
        publishedAt: true,
        viewCount: true,
      },
    })

    return NextResponse.json({ stories })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Arama sırasında bir hata oluştu' },
      { status: 500 }
    )
  }
}
