import Link from 'next/link'
import { BookOpen } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center py-12">
      <div className="container mx-auto max-w-2xl px-4 text-center">
        <BookOpen className="w-20 h-20 text-muted-foreground mx-auto mb-6 opacity-50" />
        <h1 className="font-playfair text-4xl font-bold text-primary mb-4">
          Öykü Bulunamadı
        </h1>
        <p className="font-crimson text-lg text-muted-foreground mb-8">
          Aradığınız öykü mevcut değil veya kaldırılmış olabilir.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3 font-inter text-sm font-medium text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl"
        >
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  )
}