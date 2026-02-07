import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface ContactMessage {
  id: string
  name: string
  email: string
  subject: string
  message: string
  createdAt: Date
}

export async function POST(request: Request) {
  try {
    const body = await request?.json?.()
    const { name, email, subject, message } = body ?? {}

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Ad, email ve mesaj alanları zorunludur' },
        { status: 400 }
      )
    }

    if (!email?.includes?.('@')) {
      return NextResponse.json(
        { error: 'Geçerli bir email adresi girin' },
        { status: 400 }
      )
    }

    // Save to database (you can create a ContactMessage model if needed)
    // For now, we'll just send email notification

    const appUrl = process.env.NEXTAUTH_URL ?? ''
    const appName = appUrl ? new URL(appUrl)?.hostname?.split?.('.')?.[0] ?? 'Deri ve Kemik' : 'Deri ve Kemik'

    const htmlBody = `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: #F5F1E8; padding: 40px 20px;">
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #8B7355; font-size: 24px; margin-bottom: 20px; border-bottom: 2px solid #8B7355; padding-bottom: 10px;">
            Yeni İletişim Mesajı
          </h2>
          <div style="background: #F5F1E8; padding: 20px; border-radius: 6px; border-left: 4px solid #8B7355; margin: 20px 0;">
            <p style="margin: 10px 0; color: #2C3E2E;"><strong>Gönderen:</strong> ${name ?? ''}</p>
            <p style="margin: 10px 0; color: #2C3E2E;"><strong>Email:</strong> <a href="mailto:${email ?? ''}" style="color: #8B7355;">${email ?? ''}</a></p>
            ${subject ? `<p style="margin: 10px 0; color: #2C3E2E;"><strong>Konu:</strong> ${subject}</p>` : ''}
            <div style="background: white; padding: 15px; border-radius: 4px; margin-top: 15px;">
              <p style="color: #2C3E2E; margin: 0; line-height: 1.6; white-space: pre-wrap;">${message ?? ''}</p>
            </div>
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            Tarih: ${new Date()?.toLocaleString?.('tr-TR') ?? ''}
          </p>
        </div>
      </div>
    `

    // Send notification email to admin (both authors)
    const recipients = ['deri@derivekemik.com', 'kemik@derivekemik.com']
    
    for (const recipient of recipients) {
      try {
        const emailResponse = await fetch('https://apps.abacus.ai/api/sendNotificationEmail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deployment_token: process.env.ABACUSAI_API_KEY,
            app_id: process.env.WEB_APP_ID,
            notification_id: process.env.NOTIF_ID_YORUM_BILDIRIMI, // Reusing comment notification
            subject: subject ? `İletişim: ${subject}` : `İletişim Mesajı: ${name}`,
            body: htmlBody,
            is_html: true,
            recipient_email: recipient,
            sender_email: `noreply@${appUrl ? new URL(appUrl)?.hostname : 'derivekemik.com'}`,
            sender_alias: appName,
          }),
        })

        const emailResult = await emailResponse?.json?.()
        if (!emailResult?.success && !emailResult?.notification_disabled) {
          console.error('Failed to send contact notification email to', recipient, ':', emailResult)
        }
      } catch (emailError) {
        console.error('Email notification error for', recipient, ':', emailError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Mesaj gönderilirken bir hata oluştu' },
      { status: 500 }
    )
  }
}