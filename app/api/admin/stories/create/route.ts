import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

type Lang = 'tr' | 'en' | 'fr'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 401 })
    }

    const body = await request.json()

    // güvenli parse
    const title = String(body?.title ?? '').trim()
    const slug = String(body?.slug ?? '').trim()
    const author = String(body?.author ?? '').trim()
    const excerpt = String(body?.excerpt ?? '').trim()
    const content = String(body?.content ?? '').trim()
    const illustrationUrl = String(body?.illustrationUrl ?? '').trim()

    // language: gelmezse tr varsay
    const languageRaw = String(body?.language ?? 'tr').trim().toLowerCase()
    const language = (['tr', 'en', 'fr'].includes(languageRaw) ? languageRaw : 'tr') as Lang

    if (!title || !slug || !author || !excerpt || !content) {
      return NextResponse.json({ error: 'Tüm zorunlu alanları doldurun' }, { status: 400 })
    }

    // Check if slug already exists (same language)
    const existingStory = await prisma.story.findUnique({
      where: {
        language_slug: {
          language,
          slug,
        },
      },
      select: { id: true },
    })

    if (existingStory) {
      return NextResponse.json({ error: 'Bu URL slug zaten kullanımda' }, { status: 400 })
    }

    const story = await prisma.story.create({
      data: {
        title,
        slug,
        author,
        excerpt,
        content,
        language,
        illustrationUrl: illustrationUrl ?? '',
      },
    })

    return NextResponse.json({ success: true, story })
  } catch (error) {
    console.error('Create story error:', error)
    return NextResponse.json({ error: 'Öykü oluşturulurken bir hata oluştu' }, { status: 500 })
  }
}
