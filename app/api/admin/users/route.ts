import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

function requireAdmin(session: any) {
  const role = String(session?.user?.role ?? '').toLowerCase()
  return session?.user && role === 'admin'
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!requireAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const email = String(body.email ?? '').trim().toLowerCase()
  const name = body.name ? String(body.name) : null
  const role = String(body.role ?? 'editor').toLowerCase()
  const password = String(body.password ?? '')

  if (!email) return NextResponse.json({ error: 'Email gerekli.' }, { status: 400 })
  if (password.length < 10) return NextResponse.json({ error: 'Şifre en az 10 karakter.' }, { status: 400 })

  const hash = await bcrypt.hash(password, 12)

  try {
    const user = await prisma.user.create({
      data: {
        email,
        name,
        role: role === 'admin' ? 'admin' : 'editor',
        password: hash,
        isActive: true,
      },
      select: { id: true, email: true, role: true, isActive: true },
    })
    return NextResponse.json(user)
  } catch {
    return NextResponse.json({ error: 'Bu email zaten kayıtlı olabilir.' }, { status: 400 })
  }
}
