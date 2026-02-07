'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

type UserDTO = {
  id: string
  email: string
  name: string | null
  role: string
  isActive: boolean
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()

  const [user, setUser] = useState<UserDTO | null>(null)
  const [role, setRole] = useState('editor')
  const [isActive, setIsActive] = useState(true)
  const [newPassword, setNewPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/admin/users/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setUser(d)
        setRole(d.role)
        setIsActive(d.isActive)
      })
      .catch(() => setErr('Kullanıcı okunamadı.'))
  }, [id])

  const save = async () => {
    setMsg(null)
    setErr(null)

    const payload: any = { role, isActive }
    if (newPassword.trim()) {
      if (newPassword.length < 10) return setErr('Yeni şifre en az 10 karakter.')
      payload.newPassword = newPassword
    }

    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return setErr(data?.error || 'Kaydedilemedi.')

    setMsg('Güncellendi ✅')
    setNewPassword('')
  }

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-lg px-4 py-10">
        <p>Yükleniyor…</p>
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-10">
      <button className="text-sm underline" onClick={() => router.push('/admin/users')}>
        ← Users
      </button>

      <h1 className="mt-3 text-2xl font-semibold">{user.email}</h1>

      <div className="mt-6 space-y-4">
        <div>
          <label className="text-sm text-foreground/80">Role</label>
          <select className="mt-1 w-full rounded-md border px-3 py-2" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="editor">editor</option>
            <option value="admin">admin</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>

        <div>
          <label className="text-sm text-foreground/80">Reset password</label>
          <input className="mt-1 w-full rounded-md border px-3 py-2" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <p className="mt-1 text-xs text-foreground/60">Boş bırakırsan şifre değişmez.</p>
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}
        {msg && <p className="text-sm text-green-700">{msg}</p>}

        <button className="rounded-md bg-primary px-4 py-2 text-white" onClick={save}>
          Kaydet
        </button>
      </div>
    </main>
  )
}
