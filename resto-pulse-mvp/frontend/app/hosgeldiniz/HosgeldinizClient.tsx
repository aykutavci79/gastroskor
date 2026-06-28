'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const REDIRECT_MS = 3000;

type Props = {
  displayName?: string;
};

export function HosgeldinizClient({ displayName }: Props) {
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
      <h1 className="text-2xl font-bold text-content sm:text-3xl">GastroSkor&apos;a Hoş Geldiniz!</h1>
      {displayName ? (
        <p className="mt-3 text-base text-content-muted">
          Merhaba {displayName.split(' ')[0]}, keşfetmeye hazırsın.
        </p>
      ) : (
        <p className="mt-3 text-base text-content-muted">Girişin tamamlandı — keşfetmeye hazırsın.</p>
      )}
      <p className="mt-6 text-sm text-content-muted">Ana sayfaya yönlendiriliyorsun…</p>
    </main>
  );
}
