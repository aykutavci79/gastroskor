import Link from 'next/link';
import { useTranslations } from 'next-intl';

export function SiteFooter() {
  const t = useTranslations('footer');
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-border/70 bg-surface/50">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-content-muted">{t('copyright', { year })}</p>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href="/bursa" className="text-content-muted hover:text-accent">
            {t('bursaRestaurants')}
          </Link>
          <Link href="/yoresel-lezzetler" className="text-content-muted hover:text-accent">
            {t('regionalFlavors')}
          </Link>
          <Link href="/yoresel-lezzetler/bursa-doner-kebabi" className="text-content-muted hover:text-accent">
            {t('bursaIskender')}
          </Link>
          <Link href="/yoresel-lezzetler/bursa-pideli-kofte" className="text-content-muted hover:text-accent">
            {t('pideliKofte')}
          </Link>
          <Link href="/yoresel-lezzetler/bursa-cantik" className="text-content-muted hover:text-accent">
            {t('bursaCantik')}
          </Link>
          <Link href="/sss" className="text-content-muted hover:text-accent">
            {t('faq')}
          </Link>
          <Link href="/gizlilik" className="text-content-muted hover:text-accent">
            {t('privacy')}
          </Link>
          <Link href="/hesap-sil" className="text-content-muted hover:text-accent">
            {t('deleteAccount')}
          </Link>
          <Link href="/kvkk" className="text-content-muted hover:text-accent">
            {t('kvkk')}
          </Link>
          <Link href="/kullanim-kosullari" className="text-content-muted hover:text-accent">
            {t('terms')}
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
