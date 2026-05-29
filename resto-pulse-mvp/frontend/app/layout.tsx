import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'GastroSkor',
  description: 'Restoran yorumlari, AI analiz ve Google yorum koprusu',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <Providers>
          <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
              <a href="/" className="group flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-cyan-600 text-sm font-black text-slate-950 shadow-glow"
                  aria-hidden
                >
                  GS
                </span>
                <span className="text-lg font-bold tracking-tight text-white">
                  Gastro<span className="text-accent">Skor</span>
                </span>
              </a>
            <div className="flex items-center gap-4">
              <p className="hidden text-sm text-slate-400 sm:block">
                Yorum · AI Analiz · Google&apos;da Yayinla
              </p>
              <a
                href="/panel"
                className="rounded-lg border border-emerald-500/40 px-3 py-1.5 text-sm text-emerald-200 hover:bg-emerald-500/10">
                Restoran Paneli
              </a>
            </div>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
