'use client'

import { useState } from 'react'
import { Mail } from 'lucide-react'

export default function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e?.preventDefault?.()
    
    if (!email?.trim?.()) {
      setMessage('Lütfen email adresinizi girin')
      setStatus('error')
      return
    }

    setStatus('loading')
    
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email?.trim?.() }),
      })

      const data = await response?.json?.()

      if (response?.ok) {
        setStatus('success')
        setMessage('Başarıyla abone oldunuz!')
        setEmail('')
      } else {
        setStatus('error')
        setMessage(data?.error ?? 'Bir hata oluştu')
      }
    } catch (error) {
      console.error('Newsletter error:', error)
      setStatus('error')
      setMessage('Bağlantı hatası oluştu')
    }
  }

  return (
    <div className="mt-8">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e?.target?.value ?? '')}
            placeholder="Email adresiniz"
            className="w-full rounded-lg border border-input bg-background px-4 py-3 pl-10 font-inter text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={status === 'loading'}
          />
        </div>
        <button
          type="submit"
          disabled={status === 'loading'}
          className="rounded-lg bg-primary px-8 py-3 font-inter text-sm font-medium text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'loading' ? 'Gönderiliyor...' : 'Abone Ol'}
        </button>
      </form>
      {message && (
        <p
          className={`mt-4 font-inter text-sm text-center ${
            status === 'success' ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  )
}