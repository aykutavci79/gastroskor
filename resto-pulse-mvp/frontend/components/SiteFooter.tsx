import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border/70 bg-surface/50">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-content-muted">© {new Date().getFullYear()} GastroSkor</p>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href="/bursa" className="text-content-muted hover:text-accent">
            Bursa restoranları
          </Link>
          <Link href="/gizlilik" className="text-content-muted hover:text-accent">
            Gizlilik
          </Link>
          <Link href="/hesap-sil" className="text-content-muted hover:text-accent">
            Hesap silme
          </Link>
          <Link href="/kvkk" className="text-content-muted hover:text-accent">
            KVKK
          </Link>
          <Link href="/kullanim-kosullari" className="text-content-muted hover:text-accent">
            Kullanım Koşulları
          </Link>
          <a href="mailto:destek@gastroskor.com.tr" className="text-content-muted hover:text-accent">
            destek@gastroskor.com.tr
          </a>
          <a
            href="https://cursor.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-content-muted hover:text-accent">
            Built with Cursor
          </a>
        </nav>
      </div>
    </footer>
  );
}
