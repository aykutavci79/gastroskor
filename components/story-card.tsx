'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import StoryCardImage from '@/components/StoryCardImage'
import { Calendar, User, Eye } from 'lucide-react'
import { motion } from 'framer-motion'

type Locale = 'tr' | 'en' | 'fr' | 'ar'

type Story = {
  id: string
  title: string
  slug: string
  excerpt?: string | null
  author: string
  illustrationUrl?: string | null
  publishedAt: string
  viewCount?: number | null
}

function detectLocale(pathname: string): Locale {
  if (pathname === '/en' || pathname.startsWith('/en/')) return 'en'
  if (pathname === '/fr' || pathname.startsWith('/fr/')) return 'fr'
  if (pathname === '/ar' || pathname.startsWith('/ar/')) return 'ar'
  return 'tr'
}

function buildStoryHref(locale: Locale, slug: string) {
  if (locale === 'tr') return `/oyku/${slug}`
  return `/${locale}/oyku/${slug}`
}

export default function StoryCard({ story }: { story: Story }) {
  const pathname = usePathname() || '/'
  const locale = detectLocale(pathname)

  const authorName = story?.author === 'deri' ? 'Deri' : 'Kemik'

  const formattedDate = new Date(story.publishedAt).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <Link href={buildStoryHref(locale, story.slug)}>
        <div className="group overflow-hidden rounded-lg bg-card shadow-md transition-all hover:shadow-xl">
          {/* Image */}
          <div className="relative aspect-[3/2] bg-muted overflow-hidden">
            <StoryCardImage
              src={story?.illustrationUrl ?? ''}
              alt={story?.title ?? ''}
              className="object-cover"
            />
          </div>

          {/* Content */}
          <div className="p-6">
            <h3 className="font-playfair text-2xl font-semibold text-primary transition-colors group-hover:text-secondary">
              {story?.title ?? ''}
            </h3>

            <p className="mt-3 font-crimson text-base leading-relaxed text-muted-foreground line-clamp-3">
              {story?.excerpt ?? ''}
            </p>

            <div className="mt-4 flex items-center gap-4 font-inter text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {authorName}
              </span>

              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formattedDate}
              </span>

              {(story?.viewCount ?? 0) > 0 && (
                <span className="flex items-center gap-1 ml-auto">
                  <Eye className="h-4 w-4" />
                  {story.viewCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
