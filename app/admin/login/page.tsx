'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { LogIn, Loader2 } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e?.preventDefault?.()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email: formData?.email,
        password: formData?.password,
        redirect: false,
      })

      if (result?.error) {
        setError(result?.error ?? 'Giriş başarısız')
      } else if (result?.ok) {
        router?.replace?.('/admin')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="container mx-auto max-w-md px-4">
        <div className="rounded-2xl bg-card p-8 shadow-xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <LogIn className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-playfair text-3xl font-bold text-primary mb-2">
              Yönetici Girişi
            </h1>
            <p className="font-inter text-sm text-muted-foreground">
              Deri ve Kemik Yönetim Paneli
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-inter text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData?.email}
                onChange={(e) => setFormData({ ...formData, email: e?.target?.value ?? '' })}
                className="w-full rounded-lg border border-input bg-background px-4 py-3 font-inter text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={loading}
                required
              />
            </div>
            <div>
              <label className="block font-inter text-sm font-medium text-foreground mb-2">
                Şifre
              </label>
              <input
                type="password"
                value={formData?.password}
                onChange={(e) => setFormData({ ...formData, password: e?.target?.value ?? '' })}
                className="w-full rounded-lg border border-input bg-background px-4 py-3 font-inter text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={loading}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-inter text-sm font-medium text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Giriş Yapılıyor...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Giriş Yap
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}