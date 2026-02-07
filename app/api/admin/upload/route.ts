import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import path from 'path'
import { promises as fs } from 'fs'
import crypto from 'crypto'

export const runtime = 'nodejs'

function safeExt(filename: string) {
  const ext = path.extname(filename).toLowerCase()
  const allowed = new Set(['.png', '.jpg', '.jpeg', '.webp'])
  return allowed.has(ext) ? ext : ''
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized (no session)' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json({ error: 'File missing (formData has no "file")' }, { status: 400 })
    }
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'Invalid file type (not Blob)' }, { status: 400 })
    }

    // @ts-ignore
    const originalName = (file as any).name ? String((file as any).name) : 'upload.png'
    const ext = safeExt(originalName)
    if (!ext) {
      return NextResponse.json({ error: `Only png/jpg/jpeg/webp allowed. Got: ${originalName}` }, { status: 400 })
    }

    const bytes = Buffer.from(await file.arrayBuffer())
    const maxBytes = 6 * 1024 * 1024
    if (bytes.length > maxBytes) {
      return NextResponse.json({ error: `Max 6MB. Got ${(bytes.length / 1024 / 1024).toFixed(2)}MB` }, { status: 400 })
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    await fs.mkdir(uploadsDir, { recursive: true })

    const id = crypto.randomUUID()
    const filename = `story_${id}${ext}`
    const filepath = path.join(uploadsDir, filename)

    await fs.writeFile(filepath, bytes)

    const url = `/uploads/${filename}`
    return NextResponse.json({ url })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Upload crashed', detail: String(e) },
      { status: 500 }
    )
  }
}
