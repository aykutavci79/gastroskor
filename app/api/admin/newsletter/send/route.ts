import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Yetkiniz yok' },
        { status: 401 }
      )
    }

    const body = await request?.json?.()
    const { storyId } = body ?? {}

    if (!storyId) {
      return NextResponse.json(
        { error: 'Öykü ID gerekli' },
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

    const subscribers = await prisma.subscriber.findMany({
      where: { active: true },
    })

    if (subscribers?.length === 0) {
      return NextResponse.json(
        { error: 'Aktif abone yok' },
        { status: 400 }
      )
    }

    const appUrl = process.env.NEXTAUTH_URL ?? ''
    const appName = appUrl ? new URL(appUrl)?.hostname?.split?.('.')?.[0] ?? 'Deri ve Kemik' : 'Deri ve Kemik'
    const authorName = story?.author === 'deri' ? 'Deri' : 'Kemik'
    const storyUrl = `${appUrl}/oyku/${story?.slug ?? ''}`

    let sentCount = 0
    const sendPromises = subscribers?.map?.(async (subscriber) => {
      const htmlBody = `
        <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: #F5F1E8; padding: 40px 20px;">
          <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            <h1 style="color: #8B7355; font-size: 32px; margin-bottom: 10px; text-align: center;">
              Deri ve Kemik
            </h1>
            <p style="color: #2C3E2E; font-size: 16px; text-align: center; margin-bottom: 30px; border-bottom: 2px solid #8B7355; padding-bottom: 20px;">
              Yeni Öykü Yayınlandı!
            </p>
            
            <h2 style="color: #8B7355; font-size: 24px; margin-bottom: 15px;">
              ${story?.title ?? ''}
            </h2>
            
            <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
              Yazar: <strong>${authorName}</strong>
            </p>
            
            <div style="background: #F5F1E8; padding: 20px; border-radius: 8px; border-left: 4px solid #8B7355; margin: 25px 0;">
              <p style="color: #2C3E2E; font-size: 16px; line-height: 1.8; margin: 0;">
                ${story?.excerpt ?? ''}
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${storyUrl}" style="display: inline-block; background: #8B7355; color: white; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">
                Öyküyü Oku
              </a>
            </div>
            
            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              Bu email'i almak istemivorsanız, bültenden çıkmak için <a href="${appUrl}" style="color: #8B7355;">buraya tıklayın</a>.
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
            notification_id: process.env.NOTIF_ID_BLTEN,
            subject: `Yeni Öykü: ${story?.title ?? ''}`,
            body: htmlBody,
            is_html: true,
            recipient_email: subscriber?.email,
            sender_email: `noreply@${appUrl ? new URL(appUrl)?.hostname : 'derivekemik.com'}`,
            sender_alias: appName,
          }),
        })

        const emailResult = await emailResponse?.json?.()
        if (emailResult?.success || emailResult?.notification_disabled) {
          sentCount++
        }
      } catch (emailError) {
        console.error('Failed to send newsletter to', subscriber?.email, ':', emailError)
      }
    }) ?? []

    await Promise.all(sendPromises)

    return NextResponse.json({ success: true, sent: sentCount })
  } catch (error) {
    console.error('Newsletter send error:', error)
    return NextResponse.json(
      { error: 'Bülten gönderimi başarısız' },
      { status: 500 }
    )
  }
}