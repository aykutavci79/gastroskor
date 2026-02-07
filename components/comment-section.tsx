'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Send, Loader2 } from 'lucide-react'

interface Comment {
  id: string
  authorName: string
  content: string
  createdAt: string
}

export default function CommentSection({ storyId }: { storyId: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    authorName: '',
    authorEmail: '',
    content: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  useEffect(() => {
    fetchComments()
  }, [storyId])

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/comments?storyId=${storyId}`)
      const data = await response?.json?.()
      if (response?.ok) {
        setComments(data?.comments ?? [])
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e?.preventDefault?.()

    if (!formData?.authorName || !formData?.authorEmail || !formData?.content) {
      setMessage('Lütfen tüm alanları doldurun')
      setMessageType('error')
      return
    }

    setSubmitting(true)
    setMessage('')

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          ...formData,
        }),
      })

      const data = await response?.json?.()

      if (response?.ok) {
        setMessage('Yorumunuz başarıyla gönderildi! Onaylanmasını bekleyin.')
        setMessageType('success')
        setFormData({ authorName: '', authorEmail: '', content: '' })
      } else {
        setMessage(data?.error ?? 'Bir hata oluştu')
        setMessageType('error')
      }
    } catch (error) {
      console.error('Comment submission error:', error)
      setMessage('Bağlantı hatası oluştu')
      setMessageType('error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="border-t border-border pt-12">
      <div className="flex items-center gap-3 mb-8">
        <MessageCircle className="h-6 w-6 text-primary" />
        <h2 className="font-playfair text-2xl font-bold text-primary">
          Yorumlar
        </h2>
        <span className="font-inter text-sm text-muted-foreground">
          ({comments?.length ?? 0})
        </span>
      </div>

      {/* Comment Form */}
      <div className="mb-12 p-6 rounded-xl bg-card shadow-md">
        <h3 className="font-playfair text-xl font-semibold text-primary mb-4">
          Yorum Yapın
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block font-inter text-sm font-medium text-foreground mb-2">
                Adınız *
              </label>
              <input
                type="text"
                value={formData?.authorName}
                onChange={(e) => setFormData({ ...formData, authorName: e?.target?.value ?? '' })}
                className="w-full rounded-lg border border-input bg-background px-4 py-2 font-inter text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={submitting}
                required
              />
            </div>
            <div>
              <label className="block font-inter text-sm font-medium text-foreground mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData?.authorEmail}
                onChange={(e) => setFormData({ ...formData, authorEmail: e?.target?.value ?? '' })}
                className="w-full rounded-lg border border-input bg-background px-4 py-2 font-inter text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={submitting}
                required
              />
            </div>
          </div>
          <div>
            <label className="block font-inter text-sm font-medium text-foreground mb-2">
              Yorumunuz *
            </label>
            <textarea
              value={formData?.content}
              onChange={(e) => setFormData({ ...formData, content: e?.target?.value ?? '' })}
              rows={4}
              className="w-full rounded-lg border border-input bg-background px-4 py-2 font-inter text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              disabled={submitting}
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-inter text-sm font-medium text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gönderiliyor...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Yorum Gönder
              </>
            )}
          </button>
          {message && (
            <p
              className={`text-sm ${
                messageType === 'success' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {message}
            </p>
          )}
        </form>
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        </div>
      ) : comments?.length > 0 ? (
        <div className="space-y-6">
          {comments?.map?.((comment) => {
            const commentDate = new Date(comment?.createdAt ?? new Date())?.toLocaleDateString?.('tr-TR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
            return (
              <div key={comment?.id} className="p-6 rounded-lg bg-muted/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-inter text-sm font-medium text-foreground">
                    {comment?.authorName ?? ''}
                  </span>
                  <span className="font-inter text-xs text-muted-foreground">
                    {commentDate}
                  </span>
                </div>
                <p className="font-crimson text-base text-foreground/80 leading-relaxed">
                  {comment?.content ?? ''}
                </p>
              </div>
            )
          }) ?? null}
        </div>
      ) : (
        <p className="text-center font-inter text-sm text-muted-foreground py-8">
          Henüz yorum yapılmamış. İlk yorumu siz yapın!
        </p>
      )}
    </div>
  )
}