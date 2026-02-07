import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request?.json?.()
    const { storyId, authorName, authorEmail: commentEmail, content } = body ?? {}

    if (!storyId || !authorName || !commentEmail || !content) {
      return NextResponse.json(
        { error: 'Tüm alanları doldurun' },
        { status: 400 }
      )
    }

    if (!commentEmail?.includes?.('@')) {
      return NextResponse.json(
        { error: 'Geçerli bir email adresi girin' },
        { status: 400 }
      )
    }

    const story = await prisma.story.findUnique({
      where: { id: storyId },
    })

    if (!story) {
      return NextResponse.json(
        { error: 'Öykü bulunamadı' },
        { status: 404 }
      )
    }

    const comment = await prisma.comment.create({
      data: {
        storyId,
        authorName,
        authorEmail: commentEmail,
        content,
      },
    })

    // Send notification email to story author
    const storyAuthorEmail = story?.author === 'deri' 
      ? 'deri@derivekemik.com' 
      : 'kemik@derivekemik.com'

    const appUrl = process.env.NEXTAUTH_URL ?? ''
    const appName = appUrl ? new URL(appUrl)?.hostname?.split?.('.')?.[0] ?? 'Deri ve Kemik' : 'Deri ve Kemik'

    const htmlBody = `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: #F5F1E8; padding: 40px 20px;">
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #8B7355; font-size: 24px; margin-bottom: 20px; border-bottom: 2px solid #8B7355; padding-bottom: 10px;">
            Yeni Yorum Bildirim
          </h2>
          <p style="color: #2C3E2E; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            "<strong>${story?.title ?? ''}</strong>" adlı öykünüze yeni bir yorum yapıldı:
          </p>
          <div style="background: #F5F1E8; padding: 20px; border-radius: 6px; border-left: 4px solid #8B7355; margin: 20px 0;">
            <p style="margin: 10px 0; color: #2C3E2E;"><strong>Yorum Yapan:</strong> ${authorName ?? ''}</p>
            <p style="margin: 10px 0; color: #2C3E2E;"><strong>Email:</strong> ${commentEmail ?? ''}</p>
            <div style="background: white; padding: 15px; border-radius: 4px; margin-top: 15px;">
              <p style="color: #2C3E2E; margin: 0; line-height: 1.6;">${content ?? ''}</p>
            </div>
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            Tarih: ${new Date()?.toLocaleString?.('tr-TR') ?? ''}
          </p>
        </div>
      </div>
    `

    try {
      const emailResponse = await fetch('https://apps.abacus.ai/api/sendNotificationEmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deployment_token: process.env.ABACUSAI_API_KEY,
          app_id: process.env.WEB_APP_ID,
          notification_id: process.env.NOTIF_ID_YORUM_BILDIRIMI,
          subject: `Yeni Yorum: ${story?.title ?? ''}`,
          body: htmlBody,
          is_html: true,
          recipient_email: storyAuthorEmail,
          sender_email: `noreply@${appUrl ? new URL(appUrl)?.hostname : 'derivekemik.com'}`,
          sender_alias: appName,
        }),
      })

      const emailResult = await emailResponse?.json?.()
      if (!emailResult?.success && !emailResult?.notification_disabled) {
        console.error('Failed to send comment notification email:', emailResult)
      }
    } catch (emailError) {
      console.error('Email notification error:', emailError)
      // Don't fail the comment creation if email fails
    }

    return NextResponse.json({ success: true, comment })
  } catch (error) {
    console.error('Comment creation error:', error)
    return NextResponse.json(
      { error: 'Yorum eklenirken bir hata oluştu' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request?.url ?? '')
    const storyId = searchParams?.get?.('storyId')

    if (!storyId) {
      return NextResponse.json(
        { error: 'Story ID gerekli' },
        { status: 400 }
      )
    }

    const comments = await prisma.comment.findMany({
      where: {
        storyId,
        approved: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ comments })
  } catch (error) {
    console.error('Comments fetch error:', error)
    return NextResponse.json(
      { error: 'Yorumlar yüklenirken hata oluştu' },
      { status: 500 }
    )
  }
}