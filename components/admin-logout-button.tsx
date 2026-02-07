'use client'

import { signOut } from 'next-auth/react'
import { LogOut } from 'lucide-react'

export default function AdminLogoutButton() {
  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' })
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 font-inter text-sm font-medium text-secondary-foreground shadow-md transition-all hover:bg-secondary/90 hover:shadow-lg"
    >
      <LogOut className="h-4 w-4" />
      Çıkış Yap
    </button>
  )
}