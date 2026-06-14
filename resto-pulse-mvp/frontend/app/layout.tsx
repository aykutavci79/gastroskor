import type { Metadata } from 'next';
import './globals.css';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import { JsonLd } from '@/components/JsonLd';
import { Providers } from '@/components/Providers';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { getSiteUrl } from '@/lib/site-url';
import { buildOrganizationJsonLd } from '@/lib/structured-data';

const siteUrl = getSiteUrl();
const siteDescription =
  'Türkiye restoranlarını keşfet, gastro skor oku, GastroSkor (GS) yorumu bırak. Bursa restoranları ve Google puanlarını karşılaştır. İşletmeler için panel ve kuponlar.';

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
    'gastro',
    'gastro skor',
    'bursa restoran',
    'bursa restoranları',
    'restoran yorumları',
    'restoran puanlama',
    'Türkiye restoran',
    'Google yorum',
  ],
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
  applicationName: 'GastroSkor',
  manifest: '/manifest.webmanifest',
  appleWebApp: { title: 'GastroSkor' },
  icons: { icon: '/logo.png', apple: '/logo.png' },
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <GoogleAnalytics />
        <JsonLd data={buildOrganizationJsonLd(siteUrl)} />
        <Providers>
          <SiteHeader />
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
