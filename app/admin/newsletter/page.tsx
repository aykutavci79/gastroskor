'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Send, Loader2, Mail } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Story {
  id: string
  title: string
  slug: string
  author: string
}

export default function AdminNewsletterPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const [stories, setStories] = useState<Story[]>([])
  const [selectedStory, setSelectedStory] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router?.replace?.('/admin/login')
    }
  }, [status, router])

  useEffect(() => {
    fetchStories()
  }, [])

  const fetchStories = async () => {
    try {
      const response = await fetch('/api/admin/stories')
      const data = await response?.json?.()
      if (response?.ok) {
        setStories(data?.stories ?? [])
      }
    } catch (error) {
      console.error('Failed to fetch stories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!selectedStory) {
      setMessage('Lütfen bir öykü seçin')
      setMessageType('error')
      return
    }

    if (!confirm('Tüm abonelere bülten göndermek istediğinizden emin misiniz?')) {
      return
    }

    setSending(true)
    setMessage('')

    try {
      const response = await fetch('/api/admin/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId: selectedStory }),
      })

      const data = await response?.json?.()

      if (response?.ok) {
        setMessage(`Bülten başarıyla gönderildi! ${data?.sent ?? 0} aboneye ulaştı.`)
        setMessageType('success')
        setSelectedStory('')
      } else {
        setMessage(data?.error ?? 'Bülten gönderimi başarısız')
        setMessageType('error')
      }
    } catch (error) {
      console.error('Newsletter send error:', error)
      setMessage('Bir hata oluştu')
      setMessageType('error')
    } finally {
      setSending(false)
    }
  }

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="w-8 h-8 text-primary" />
            <h1 className="font-playfair text-3xl font-bold text-primary">
              Bülten Gönder
            </h1>
          </div>
          <Link
            href="/admin"
            className="font-inter text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            ← Panele Dön
          </Link>
        </div>

        <div className="rounded-xl bg-card p-8 shadow-md">
          <p className="font-inter text-sm text-muted-foreground mb-6">
            Yeni yayınlanan bir öykü hakkında abonelere bildirim gönderin.
          </p>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block font-inter text-sm font-medium text-foreground mb-2">
                  Öykü Seçin *
                </label>
                <select
                  value={selectedStory}
                  onChange={(e) => setSelectedStory(e?.target?.value ?? '')}
                  className="w-full rounded-lg border border-input bg-background px-4 py-3 font-inter text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={sending}
                >
                  <option value="">Öykü seçin...</option>
                  {stories?.map?.((story) => {
                    const authorName = story?.author === 'deri' ? 'Deri' : 'Kemik'
                    return (
                      <option key={story?.id} value={story?.id}>
                        {story?.title} - {authorName}
                      </option>
                    )
                  }) ?? null}
                </select>
              </div>

              <button
                onClick={handleSend}
                disabled={sending || !selectedStory}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-inter text-sm font-medium text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Gönderiliyor...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    Bülten Gönder
                  </>
                )}
              </button>

              {message && (
                <div
                  className={`p-4 rounded-lg ${
                    messageType === 'success'
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  <p className="font-inter text-sm">{message}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}