import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { SiteFooter } from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: 'GastroSkor',
  description: 'Restoran yorumlari, AI analiz ve Google yorum koprusu',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <Providers>
          <header className="border-b border-border bg-surface/95 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
              <a href="/" className="group flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-gold via-brand to-brand-hover text-sm font-black text-content shadow-card transition duration-ui ease-ui"
                  aria-hidden>
                  GS
                </span>
                <span className="text-lg font-bold tracking-tight text-content">
                  Gastro<span className="text-brand">Skor</span>
                </span>
              </a>
              <div className="flex items-center gap-4">
                <p className="hidden text-sm text-content-muted sm:block">
                  Yorum · AI Analiz · Google&apos;da Yayinla
                </p>
                <a href="/panel" className="btn-secondary btn-sm">
                  Restoran Paneli
                </a>
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
