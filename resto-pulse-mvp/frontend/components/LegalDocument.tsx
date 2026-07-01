import Link from 'next/link';
import { useTranslations } from 'next-intl';

type Props = {
  title: string;
  updated: string;
  children: React.ReactNode;
};

export function LegalDocument({ title, updated, children }: Props) {
  const t = useTranslations('legal');

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/" className="text-sm text-accent hover:underline">
          {t('backToHome')}
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-content">{title}</h1>
        <p className="mt-2 text-sm text-content-muted">{t('lastUpdated', { date: updated })}</p>
      </div>
      <div className="space-y-4 text-sm leading-relaxed text-content-muted">{children}</div>
    </article>
  );
}
