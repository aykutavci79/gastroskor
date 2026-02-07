import { prisma } from '@/lib/db'
import StoryCard from '@/components/story-card'
import NewsletterForm from '@/components/newsletter-form'
import Link from 'next/link'
import { BookOpen, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const stories = await prisma.story.findMany({
    where: { language: 'tr' },
    orderBy: { publishedAt: 'desc' },
    take: 6,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      author: true,
      illustrationUrl: true,
      publishedAt: true,
      viewCount: true,
    },
  })

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-muted/50 to-background py-20 md:py-32">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <h1 className="font-playfair text-4xl font-bold leading-tight text-primary md:text-6xl">
            Deri ve Kemik
          </h1>
          <p className="mt-6 font-crimson text-xl text-muted-foreground md:text-2xl">
            Yüzeyi sıyırıp öze ulaşmak. İnsan doğasının en gerçek halini keşfetmek.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/deri"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3 font-inter text-sm font-medium text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl"
            >
              <BookOpen className="h-5 w-5" />
              Deri&apos;nin Öykülerini Oku
            </Link>
            <Link
              href="/kemik"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-8 py-3 font-inter text-sm font-medium text-secondary-foreground shadow-lg transition-all hover:bg-secondary/90 hover:shadow-xl"
            >
              <BookOpen className="h-5 w-5" />
              Kemik&apos;in Öykülerini Keşfet
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="text-center">
            <h2 className="font-playfair text-3xl font-bold text-primary">
              Deri ve Kemik Felsefesi
            </h2>
            <p className="mt-6 font-crimson text-lg leading-relaxed text-foreground/80">
              Deri ve Kemik, yüzeyin altındaki gerçekliği aramak, insani deneyimleri
              en saf haliyle anlatmak üzerine kurulu bir edebi projedir. Yüzeysel
              katmanları sıyırıp asıl öze ulaşmak, insanın temel duygularını ve
              varoluşsal sorularını edebi bir dille keşfetmek amacındayız.
            </p>
            <Link
              href="/hakkimizda"
              className="mt-8 inline-flex items-center gap-2 font-inter text-sm font-medium text-primary transition-colors hover:text-secondary"
            >
              <Users className="h-5 w-5" />
              Yazarlar Hakkında Daha Fazla Bilgi
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Stories */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto max-w-6xl px-4">
          <h2 className="font-playfair text-3xl font-bold text-primary text-center mb-12">
            Son Öyküler
          </h2>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {stories.map((story) => (
              <StoryCard
                key={story.id}
                story={{
                  ...story,
                  excerpt: story.excerpt ?? null,
                  illustrationUrl: story.illustrationUrl ?? null,
                  publishedAt: story.publishedAt.toISOString(),
                  viewCount: story.viewCount ?? 0,
                }}
              />
            ))}
          </div>

          {stories.length === 0 && (
            <p className="text-center font-inter text-muted-foreground">
              Henüz öykü yayınlanmadı.
            </p>
          )}
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-16 bg-background">
        <div className="container mx-auto max-w-2xl px-4">
          <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 p-8 md:p-12 text-center shadow-lg">
            <h2 className="font-playfair text-3xl font-bold text-primary">
              Yeni Öykülerden Haberdar Olun
            </h2>
            <p className="mt-4 font-inter text-muted-foreground">
              Yeni yayınlanan öykülerimizden ilk siz haberdar olun. Bültenimize abone olun.
            </p>
            <NewsletterForm />
          </div>
        </div>
      </section>
    </div>
  )
}
