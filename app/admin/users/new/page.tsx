import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions)
  const role = String((session?.user as any)?.role ?? '').toLowerCase()

  if (!session || role !== 'admin') {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="mt-2 text-sm text-foreground/70">Bu sayfa sadece admin.</p>
      </main>
    )
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
  })

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>

        <Link className="rounded-md border px-3 py-2 text-sm hover:bg-muted/50" href="/admin/users/new">
          + Yeni kullanıcı
        </Link>
      </div>

      <div className="mt-6 overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="p-3">Email</th>
              <th className="p-3">Name</th>
              <th className="p-3">Role</th>
              <th className="p-3">Active</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.name ?? '-'}</td>
                <td className="p-3">{u.role}</td>
                <td className="p-3">{u.isActive ? 'yes' : 'no'}</td>
                <td className="p-3">
                  <Link className="underline" href={`/admin/users/${u.id}`}>
                    yönet
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
