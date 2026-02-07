'use client'

import { useState } from 'react'

export default function AdminAccountPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPassword2, setNewPassword2] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    setErr(null)

    if (newPassword.length < 10) {
      setErr('Yeni şifre en az 10 karakter olmalı.')
      return
    }
    if (newPassword !== newPassword2) {
      setErr('Yeni şifreler aynı değil.')
      return
    }

    setLoading(true)
    const res = await fetch('/api/admin/account/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)

    if (!res.ok) {
      setErr(data?.error || 'Şifre değiştirilemedi.')
      return
    }

    setMsg('Şifre güncellendi ✅')
    setCurrentPassword('')
    setNewPassword('')
    setNewPassword2('')
  }

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-10">
      <h1 className="text-2xl font-semibold">Hesabım</h1>
      <p className="mt-2 text-sm text-foreground/70">Şifre değiştir.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="text-sm text-foreground/80">Mevcut şifre</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-foreground/80">Yeni şifre</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-foreground/80">Yeni şifre (tekrar)</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            type="password"
            value={newPassword2}
            onChange={(e) => setNewPassword2(e.target.value)}
          />
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}
        {msg && <p className="text-sm text-green-700">{msg}</p>}

        <button
          className="rounded-md bg-primary px-4 py-2 text-white disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? 'Kaydediliyor…' : 'Şifreyi Güncelle'}
        </button>
      </form>
    </main>
  )
}
