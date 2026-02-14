import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { GoogleAnalytics } from '@next/third-parties/google'
import { headers } from 'next/headers'

const inter = Inter({ subsets: ['latin'] })

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? 'http://localhost:3000'),
  title: 'Deri ve Kemik | Türk Edebiyatı ve Öykü',
  description:
    'Deri ve Kemik - Türkçe kısa öyküler, edebi yazılar ve modern Türk edebiyatı. Deri ve Kemik yazarlarının özgün öykülerini keşfedin.',
  keywords:
    'türk edebiyatı, kısa öykü, öykü, edebiyat, türkçe öykü, modern edebiyat, deri ve kemik',
  openGraph: {
    title: 'Deri ve Kemik | Türk Edebiyatı ve Öykü',
    description:
      'Deri ve Kemik - Türkçe kısa öyküler, edebi yazılar ve modern Türk edebiyatı.',
    url: '/',
    siteName: 'Deri ve Kemik',
    images: ['/og-image.png'],
    locale: 'tr_TR',
    type: 'website',
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
}

function getLocaleFromPath(pathname: string) {
  if (pathname.startsWith('/ar')) return 'ar'
  if (pathname.startsWith('/en')) return 'en'
  if (pathname.startsWith('/fr')) return 'fr'
  return 'tr'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const h = headers()
  const pathname = h.get('x-pathname') || '/'
  const locale = getLocaleFromPath(pathname)
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js"></script>
      </head>
      <body className={inter.className}>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        )}
      </body>
    </html>
  )
}
