import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { BookOpen, MessageCircle, Users, Plus, LogOut, Eye, TrendingUp } from 'lucide-react'
import AdminLogoutButton from '@/components/admin-logout-button'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/admin/login')
  }

  const [
    storiesCount, 
    commentsCount, 
    subscribersCount, 
    pendingCommentsCount,
    totalViews,
    topStories
  ] = await Promise.all([
    prisma.story.count(),
    prisma.comment.count(),
    prisma.subscriber.count({ where: { active: true } }),
    prisma.comment.count({ where: { approved: false } }),
    prisma.story.aggregate({ _sum: { viewCount: true } }),
    prisma.story.findMany({ 
      orderBy: { viewCount: 'desc' }, 
      take: 5,
      select: {
        title: true,
        slug: true,
        author: true,
        viewCount: true,
      }
    }),
  ])

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto max-w-6xl px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="font-playfair text-4xl font-bold text-primary mb-2">
              Yönetim Paneli
            </h1>
            <p className="font-inter text-sm text-muted-foreground">
              Hoş geldiniz, {session?.user?.name ?? session?.user?.email ?? 'Admin'}
            </p>
          </div>
          <AdminLogoutButton />
        </div>

        {/* Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-12">
          <div className="p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <h3 className="font-inter text-sm font-medium text-muted-foreground">
                Toplam Öykü
              </h3>
            </div>
            <p className="font-playfair text-3xl font-bold text-primary">
              {storiesCount}
            </p>
          </div>

          <div className="p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <Eye className="h-6 w-6 text-primary" />
              <h3 className="font-inter text-sm font-medium text-muted-foreground">
                Toplam Görüntülenme
              </h3>
            </div>
            <p className="font-playfair text-3xl font-bold text-primary">
              {totalViews?._sum?.viewCount ?? 0}
            </p>
          </div>

          <div className="p-6 rounded-xl bg-gradient-to-br from-secondary/10 to-secondary/5 shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <MessageCircle className="h-6 w-6 text-secondary" />
              <h3 className="font-inter text-sm font-medium text-muted-foreground">
                Toplam Yorum
              </h3>
            </div>
            <p className="font-playfair text-3xl font-bold text-secondary">
              {commentsCount}
            </p>
          </div>

          <div className="p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <MessageCircle className="h-6 w-6 text-primary" />
              <h3 className="font-inter text-sm font-medium text-muted-foreground">
                Bekleyen Yorum
              </h3>
            </div>
            <p className="font-playfair text-3xl font-bold text-primary">
              {pendingCommentsCount}
            </p>
          </div>

          <div className="p-6 rounded-xl bg-gradient-to-br from-secondary/10 to-secondary/5 shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-6 w-6 text-secondary" />
              <h3 className="font-inter text-sm font-medium text-muted-foreground">
                Abone Sayısı
              </h3>
            </div>
            <p className="font-playfair text-3xl font-bold text-secondary">
              {subscribersCount}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-12">
          <h2 className="font-playfair text-2xl font-bold text-primary mb-6">
            Hızlı İşlemler
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Link
              href="/admin/stories/new"
              className="flex items-center gap-4 p-6 rounded-xl bg-card shadow-md hover:shadow-lg transition-all border border-transparent hover:border-primary"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-playfair text-lg font-semibold text-primary">
                  Yeni Öykü Ekle
                </h3>
                <p className="font-inter text-sm text-muted-foreground">
                  Yeni bir öykü yazın ve yayınlayın
                </p>
              </div>
            </Link>

            <Link
              href="/admin/comments"
              className="flex items-center gap-4 p-6 rounded-xl bg-card shadow-md hover:shadow-lg transition-all border border-transparent hover:border-secondary"
            >
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h3 className="font-playfair text-lg font-semibold text-secondary">
                  Yorumları Yönet
                </h3>
                <p className="font-inter text-sm text-muted-foreground">
                  Bekleyen yorumları onayla veya sil
                </p>
              </div>
            </Link>

            <Link
              href="/admin/stories"
              className="flex items-center gap-4 p-6 rounded-xl bg-card shadow-md hover:shadow-lg transition-all border border-transparent hover:border-primary"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-playfair text-lg font-semibold text-primary">
                  Öyküleri Yönet
                </h3>
                <p className="font-inter text-sm text-muted-foreground">
                  Tüm öyküleri gör ve düzenle
                </p>
              </div>
            </Link>

            <Link
              href="/admin/newsletter"
              className="flex items-center gap-4 p-6 rounded-xl bg-card shadow-md hover:shadow-lg transition-all border border-transparent hover:border-secondary"
            >
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h3 className="font-playfair text-lg font-semibold text-secondary">
                  Bülten Gönder
                </h3>
                <p className="font-inter text-sm text-muted-foreground">
                  Abonelere yeni öykü bildirimi gönder
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Top Stories */}
        {topStories?.length > 0 && (
          <div>
            <h2 className="font-playfair text-2xl font-bold text-primary mb-6 flex items-center gap-2">
              <TrendingUp className="h-6 w-6" />
              En Çok Okunan Öyküler
            </h2>
            <div className="rounded-xl bg-card shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-4 text-left font-inter text-sm font-semibold text-foreground">
                        Sıra
                      </th>
                      <th className="px-6 py-4 text-left font-inter text-sm font-semibold text-foreground">
                        Öykü Adı
                      </th>
                      <th className="px-6 py-4 text-left font-inter text-sm font-semibold text-foreground">
                        Yazar
                      </th>
                      <th className="px-6 py-4 text-left font-inter text-sm font-semibold text-foreground">
                        Görüntülenme
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {topStories?.map((story, index) => (
                      <tr key={story?.slug} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-inter text-sm text-muted-foreground">
                          #{index + 1}
                        </td>
                        <td className="px-6 py-4">
                          <Link 
                            href={`/oyku/${story?.slug ?? ''}`}
                            className="font-crimson text-base text-primary hover:text-secondary transition-colors"
                          >
                            {story?.title ?? ''}
                          </Link>
                        </td>
                        <td className="px-6 py-4 font-inter text-sm text-muted-foreground capitalize">
                          {story?.author === 'deri' ? 'Deri' : 'Kemik'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-primary" />
                            <span className="font-inter text-sm font-semibold text-primary">
                              {story?.viewCount ?? 0}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}