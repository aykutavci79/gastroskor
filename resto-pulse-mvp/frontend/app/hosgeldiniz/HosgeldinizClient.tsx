'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const REDIRECT_MS = 3000;

type Props = {
  displayName?: string;
};

export function HosgeldinizClient({ displayName }: Props) {
  const t = useTranslations('welcome');
  const router = useRouter();

  useEffect(() => {
    if (document.getElementById('conversion-event')) {
      return;
    }
    const marker = document.createElement('div');
    marker.id = 'conversion-event';
    document.head.appendChild(marker);
    return () => {
      marker.remove();
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.replace('/');
    }, REDIRECT_MS);
    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-content sm:text-3xl">{t('title')}</h1>
      {displayName ? (
        <p className="mt-3 text-base text-content-muted">
          {t('greetingWithName', { name: displayName.split(' ')[0] })}
        </p>
      ) : (
        <p className="mt-3 text-base text-content-muted">{t('greetingNoName')}</p>
      )}
      <p className="mt-6 text-sm text-content-muted">{t('redirecting')}</p>
    </main>
  );
}
