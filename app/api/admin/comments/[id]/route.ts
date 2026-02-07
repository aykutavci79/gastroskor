import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Yetkiniz yok' },
        { status: 401 }
      )
    }

    await prisma.comment.delete({
      where: { id: params?.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete comment error:', error)
    return NextResponse.json(
      { error: 'Silme işlemi başarısız' },
      { status: 500 }
    )
  }
}