'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import StoryCard from '@/components/story-card'
import { Search, Loader2 } from 'lucide-react'

export default function SearchPage() {
  const searchParams = useSearchParams()
  const query = searchParams?.get?.('q')
  const [stories, setStories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchResults = async () => {
      if (!query) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const response = await fetch(`/api/search?q=${encodeURIComponent(query ?? '')}`)
        const data = await response?.json?.()

        if (response?.ok) {
          setStories(data?.stories ?? [])
        } else {
          setError(data?.error ?? 'Bir hata oluştu')
        }
      } catch (err) {
        console.error('Search error:', err)
        setError('Arama sırasında bir hata oluştu')
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [query])

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto max-w-6xl px-4">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Search className="w-8 h-8 text-primary" />
            <h1 className="font-playfair text-4xl font-bold text-primary">
              Arama Sonuçları
            </h1>
          </div>
          {query && (
            <p className="font-inter text-muted-foreground">
              <span className="font-semibold">"{query}"</span> için sonuçlar
            </p>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-16">
            <p className="font-inter text-red-600">{error}</p>
          </div>
        )}

        {/* Results */}
        {!loading && !error && (
          <div>
            {stories?.length > 0 ? (
              <div>
                <p className="font-inter text-sm text-muted-foreground mb-8">
                  {stories?.length} öykü bulundu
                </p>
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {stories?.map?.((story) => (
                    <StoryCard key={story?.id} story={story} />
                  )) ?? null}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="font-inter text-muted-foreground">
                  {query 
                    ? 'Araманızla eşleşen öykü bulunamadı.'
                    : 'Lütfen bir arama terimi girin.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}