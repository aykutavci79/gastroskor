'use client'

import { signOut } from 'next-auth/react'

export default function AdminLogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/admin/login' })}
      className="rounded-md border border-border/60 px-3 py-2 text-sm text-foreground/80 hover:bg-muted/50 hover:text-foreground"
    >
      Logout
    </button>
  )
}
