import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import AdminLogoutButton from './_components/AdminLogoutButton'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  const role = String((session?.user as any)?.role ?? '').toLowerCase()
  const isAdmin = role === 'admin'

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="font-playfair text-lg font-bold text-primary">
              Admin Panel
            </Link>

            <nav className="hidden items-center gap-3 sm:flex">
              <Link
                href="/admin"
                className="rounded-md px-2 py-1 text-sm text-foreground/80 hover:bg-muted/50 hover:text-foreground"
              >
                Stories
              </Link>

              <Link
                href="/admin/stories/new"
                className="rounded-md px-2 py-1 text-sm text-foreground/80 hover:bg-muted/50 hover:text-foreground"
              >
                New Story
              </Link>

              {isAdmin && (
                <Link
                  href="/admin/users"
                  className="rounded-md px-2 py-1 text-sm text-foreground/80 hover:bg-muted/50 hover:text-foreground"
                >
                  Users
                </Link>
              )}

              <Link
                href="/admin/account"
                className="rounded-md px-2 py-1 text-sm text-foreground/80 hover:bg-muted/50 hover:text-foreground"
              >
                My Account
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium">{session?.user?.email ?? '—'}</div>
              <div className="text-xs text-foreground/60">{isAdmin ? 'admin' : 'editor'}</div>
            </div>

            <AdminLogoutButton />
          </div>
        </div>

        <div className="border-t border-border/40 sm:hidden">
          <div className="mx-auto flex w-full max-w-6xl gap-2 overflow-x-auto px-4 py-2">
            <Link
              href="/admin"
              className="whitespace-nowrap rounded-md px-2 py-1 text-sm text-foreground/80 hover:bg-muted/50 hover:text-foreground"
            >
              Stories
            </Link>

            <Link
              href="/admin/stories/new"
              className="whitespace-nowrap rounded-md px-2 py-1 text-sm text-foreground/80 hover:bg-muted/50 hover:text-foreground"
            >
              New Story
            </Link>

            {isAdmin && (
              <Link
                href="/admin/users"
                className="whitespace-nowrap rounded-md px-2 py-1 text-sm text-foreground/80 hover:bg-muted/50 hover:text-foreground"
              >
                Users
              </Link>
            )}

            <Link
              href="/admin/account"
              className="whitespace-nowrap rounded-md px-2 py-1 text-sm text-foreground/80 hover:bg-muted/50 hover:text-foreground"
            >
              My Account
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}
