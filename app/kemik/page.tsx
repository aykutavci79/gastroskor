import { prisma } from '@/lib/db'
import StoryCard from '@/components/story-card'
import { BookOpen, Pen } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: "Kemik'in Öyküleri | Deri ve Kemik",
  description: "Kemik'in kaleme aldığı tüm kısa öyküleri. Varoluşun özüne inen derin edebi yazılar.",
}

export default async function KemikPage() {
  const stories = await prisma.story.findMany({
    where: { author: 'kemik' },
    orderBy: { publishedAt: 'desc' },
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
    <div className="min-h-screen py-12">
      <div className="container mx-auto max-w-6xl px-4">
        {/* Author Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-secondary/10 mb-6">
            <Pen className="w-10 h-10 text-secondary" />
          </div>
          <h1 className="font-playfair text-4xl font-bold text-secondary mb-4">
            Kemik'in Öyküleri
          </h1>
          <p className="font-crimson text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Kemik, varoluşun özüne, insanın en temel gerçekliklerine odaklanır.
            Öykülerinde yüzeyin altındaki iskelet yapıyı, hayatın çıplak gerçekliğini
            cesur bir dille keşfeder.
          </p>
        </div>

        {/* Author Bio */}
        <div className="mb-16 max-w-4xl mx-auto">
          <div className="rounded-2xl bg-gradient-to-br from-secondary/5 to-primary/5 p-8 shadow-md">
            <h2 className="font-playfair text-2xl font-semibold text-secondary mb-4">
              Yazar Hakkında
            </h2>
            <div className="font-crimson text-base leading-relaxed text-foreground/80 space-y-4">
              <p>
                Kemik, Türk edebiyatında varoluşçu akımı çağdaş bir yaklaşımla ele alan
                bir yazar. Öykülerinde insanın en temel sorularıyla yüzleşir: Ben kimim?
                Neden varım? Anlam nerede?
              </p>
              <p>
                Güçlü bir gözlem yeteneği ve felsefi derinlikle yazdığı metinlerinde,
                toplumsal normları sorgular, bireyin iç dünyasına iner. Kemik'in öyküleri,
                okuru rahat bırakmaz; düşündürür, sorgulatır, dönüştürür.
              </p>
            </div>
          </div>
        </div>

        {/* Coming Soon or Stories */}
        {stories?.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-playfair text-3xl font-bold text-secondary">
                Tüm Öyküler
              </h2>
              <span className="font-inter text-sm text-muted-foreground">
                {stories?.length ?? 0} öykü
              </span>
            </div>

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
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="max-w-2xl mx-auto">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-secondary/10 mb-8">
                <BookOpen className="w-12 h-12 text-secondary" />
              </div>
              <h2 className="font-playfair text-3xl font-bold text-secondary mb-4">
                Yakında
              </h2>
              <p className="font-crimson text-lg text-muted-foreground leading-relaxed">
                Kemik'in öyküleri çok yakında burada olacak.
                Varoluşun derinliklerine inen, düşündüren ve dönüştüren öyküler için
                takipte kalın.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
