import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../globals.css'
import { Providers } from '@/components/providers'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { GoogleAnalytics } from '@next/third-parties/google'

const inter = Inter({ subsets: ['latin'] })

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000'),
  title: 'Deri & Kemik | Nouvelles et littérature',
  description:
    'Deri & Kemik - nouvelles, écrits littéraires et littérature moderne. Découvrez les histoires originales de Deri et Kemik.',
  keywords: 'nouvelle, histoires courtes, littérature, littérature moderne, Deri et Kemik',
  openGraph: {
    title: 'Deri & Kemik | Nouvelles et littérature',
    description: 'Deri & Kemik - nouvelles et écrits littéraires.',
    url: '/fr',
    siteName: 'Deri ve Kemik',
    images: ['/og-image.png'],
    locale: 'fr_FR',
    type: 'website',
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
}

export default function FrLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
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
