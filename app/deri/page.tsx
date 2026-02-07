import { prisma } from '@/lib/db'
import StoryCard from '@/components/story-card'
import { BookOpen, Pen } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: "Deri'nin Öyküleri | Deri ve Kemik",
  description: "Deri'nin kaleme aldığı tüm kısa öyküleri. İnsan doğasının derinliklerine inen edebi yazılar.",
}

export default async function DeriPage() {
  const stories = await prisma.story.findMany({
    where: { author: 'deri', language: 'tr' },
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
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
            <Pen className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-playfair text-4xl font-bold text-primary mb-4">
            Deri'nin Öyküleri
          </h1>
          <p className="font-crimson text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Deri, hayatın yüzeysel katmanlarını aşıp içsel deneyimleri keşfetmeye odaklanır.
            Her öyküsü, insani duyguların en hassas noktalarına dokunur ve okura kendi
            iç dünyasıyla yüzleşme fırsatı sunar.
          </p>
        </div>

        {/* Author Bio */}
        <div className="mb-16 max-w-4xl mx-auto">
          <div className="rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 p-8 shadow-md">
            <h2 className="font-playfair text-2xl font-semibold text-primary mb-4">
              Yazar Hakkında
            </h2>
            <div className="font-crimson text-base leading-relaxed text-foreground/80 space-y-4">
              <p>
                Deri, Türk edebiyatının derin köklerine sahip, çağdaş anlatım tekniklerini
                ustalıkla harmanlayan bir yazar. Öykülerinde insan psikolojisinin
                girift katmanlarını ustalıkla işler.
              </p>
              <p>
                Sade ama etkili bir dille yazdığı öykülerinde, günlük hayatın sıradan
                anım gibi görünen detayları alıp derinleştirir, okuru düşünmeye ve
                hissetmeye davet eder. Sessizliğin gücüne inanan Deri, kelimelerle
                resim yapan bir sanatçıdır.
              </p>
            </div>
          </div>
        </div>

        {/* Stories Grid */}
        <div>
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-playfair text-3xl font-bold text-primary">
              Tüm Öyküler
            </h2>
            <span className="font-inter text-sm text-muted-foreground">
              {stories?.length ?? 0} öykü
            </span>
          </div>

          {stories?.length > 0 ? (
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
          ) : (
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="font-inter text-muted-foreground">
                Henüz yayınlanmış öykü bulunmuyor.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
