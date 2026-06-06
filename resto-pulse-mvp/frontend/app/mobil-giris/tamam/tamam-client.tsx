'use client';

import { useEffect, useMemo, useState } from 'react';

type Props = {
  returnUrl: string;
  email: string;
  name: string;
  picture: string;
  sub: string;
};

function redirectToApp(appUrl: string) {
  window.location.assign(appUrl);
  const link = document.createElement('a');
  link.href = appUrl;
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function MobilGirisTamamClient({ returnUrl, email, name, picture, sub }: Props) {
  const appUrl = useMemo(() => {
    const target = new URL(returnUrl);
    target.searchParams.set('email', email);
    if (name) target.searchParams.set('name', name);
    if (picture) target.searchParams.set('picture', picture);
    if (sub) target.searchParams.set('sub', sub);
    return target.toString();
  }, [returnUrl, email, name, picture, sub]);

  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  const [showManualLink, setShowManualLink] = useState(isAndroid);

  useEffect(() => {
    redirectToApp(appUrl);
    const timer = window.setTimeout(() => setShowManualLink(true), isAndroid ? 400 : 1200);
    return () => window.clearTimeout(timer);
  }, [appUrl, isAndroid]);

  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center text-zinc-300">
      <h1 className="text-xl font-semibold text-white">Giris basarili</h1>
      <p className="mt-3 text-sm">Uygulamaya yonlendiriliyorsunuz...</p>
      {showManualLink ? (
        <a
          href={appUrl}
          className="mt-6 inline-flex rounded-xl bg-accent px-5 py-3 text-sm font-bold text-white hover:bg-accent-hover">
          Uygulamaya don
        </a>
      ) : null}
    </main>
  );
}
