import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { getSiteUrl } from '@/lib/site-url';

const siteUrl = getSiteUrl();
const siteDescription =
  'Türkiye restoranlarını keşfet, GastroSkor (GS) yorumu bırak, Google yorumlarıyla karşılaştır. İşletmeler için restoran paneli ve takipçi kuponları.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'GastroSkor — Türkiye restoran puanlama',
    template: '%s | GastroSkor',
  },
  description: siteDescription,
  keywords: [
    'GastroSkor',
    'gastroskor',
    'restoran yorumları',
    'restoran puanlama',
    'Türkiye restoran',
    'Google yorum',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: siteUrl,
    siteName: 'GastroSkor',
    title: 'GastroSkor — Türkiye restoran puanlama',
    description: siteDescription,
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'GastroSkor' }],
  },
  twitter: {
    card: 'summary',
    title: 'GastroSkor',
    description: siteDescription,
    images: ['/logo.png'],
  },
  robots: { index: true, follow: true },
  icons: { icon: '/logo.png', apple: '/logo.png' },
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <Providers>
          <SiteHeader />
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
