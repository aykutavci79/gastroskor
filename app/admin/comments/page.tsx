import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import ApproveCommentButton from '@/components/approve-comment-button'
import DeleteCommentButton from '@/components/delete-comment-button'

export const dynamic = 'force-dynamic'

export default async function AdminCommentsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/admin/login')
  }

  const comments = await prisma.comment.findMany({
    include: {
      story: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="mb-8">
          <h1 className="font-playfair text-3xl font-bold text-primary mb-2">
            Yorum Yönetimi
          </h1>
          <Link
            href="/admin"
            className="font-inter text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            ← Panele Dön
          </Link>
        </div>

        {comments?.length > 0 ? (
          <div className="space-y-4">
            {comments?.map?.((comment) => {
              const formattedDate = new Date(comment?.createdAt ?? new Date())?.toLocaleDateString?.('tr-TR')
              return (
                <div
                  key={comment?.id}
                  className={`p-6 rounded-xl shadow-md ${
                    comment?.approved
                      ? 'bg-card'
                      : 'bg-yellow-50 border-2 border-yellow-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-playfair text-lg font-semibold text-primary">
                          {comment?.authorName ?? ''}
                        </h3>
                        {!comment?.approved && (
                          <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full font-inter">
                            Onay Bekliyor
                          </span>
                        )}
                      </div>
                      <p className="font-inter text-sm text-muted-foreground">
                        {comment?.authorEmail ?? ''} • {formattedDate}
                      </p>
                      <p className="font-inter text-sm text-muted-foreground">
                        Öykü: <Link href={`/oyku/${comment?.story?.slug ?? ''}`} className="text-primary hover:underline">{comment?.story?.title ?? ''}</Link>
                      </p>
                    </div>
                  </div>
                  <p className="font-crimson text-base text-foreground/80 mb-4 leading-relaxed">
                    {comment?.content ?? ''}
                  </p>
                  <div className="flex items-center gap-2">
                    {!comment?.approved && (
                      <ApproveCommentButton commentId={comment?.id ?? ''} />
                    )}
                    <DeleteCommentButton commentId={comment?.id ?? ''} />
                  </div>
                </div>
              )
            }) ?? null}
          </div>
        ) : (
          <div className="text-center py-16">
            <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="font-inter text-muted-foreground">
              Henüz yorum yapılmamış.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}