import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

function requireAdmin(session: any) {
  const role = String(session?.user?.role ?? '').toLowerCase()
  return session?.user && role === 'admin'
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!requireAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(user)
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!requireAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const role = body.role ? String(body.role).toLowerCase() : undefined
  const isActive = typeof body.isActive === 'boolean' ? body.isActive : undefined
  const newPassword = body.newPassword ? String(body.newPassword) : undefined

  const data: any = {}
  if (role) data.role = role === 'admin' ? 'admin' : 'editor'
  if (typeof isActive === 'boolean') data.isActive = isActive
  if (newPassword) {
    if (newPassword.length < 10) return NextResponse.json({ error: 'Şifre en az 10 karakter.' }, { status: 400 })
    data.password = await bcrypt.hash(newPassword, 12)
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data,
    select: { id: true, email: true, name: true, role: true, isActive: true },
  })

  return NextResponse.json(updated)
}
