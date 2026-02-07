import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request?.json?.()
    const { email } = body ?? {}

    if (!email || !email?.includes?.('@')) {
      return NextResponse.json(
        { error: 'Geçerli bir email adresi girin' },
        { status: 400 }
      )
    }

    const existingSubscriber = await prisma.subscriber.findUnique({
      where: { email },
    })

    if (existingSubscriber) {
      if (existingSubscriber?.active) {
        return NextResponse.json(
          { error: 'Bu email zaten abone' },
          { status: 400 }
        )
      } else {
        await prisma.subscriber.update({
          where: { email },
          data: { active: true },
        })
        return NextResponse.json({ success: true })
      }
    }

    await prisma.subscriber.create({
      data: { email },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Newsletter subscribe error:', error)
    return NextResponse.json(
      { error: 'Abone olurken bir hata oluştu' },
      { status: 500 }
    )
  }
}