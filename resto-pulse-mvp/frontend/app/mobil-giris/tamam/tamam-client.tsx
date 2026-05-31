'use client';

import { useEffect } from 'react';

type Props = {
  returnUrl: string;
  email: string;
  name: string;
  picture: string;
  sub: string;
};

export function MobilGirisTamamClient({ returnUrl, email, name, picture, sub }: Props) {
  useEffect(() => {
    const target = new URL(returnUrl);
    target.searchParams.set('email', email);
    if (name) target.searchParams.set('name', name);
    if (picture) target.searchParams.set('picture', picture);
    if (sub) target.searchParams.set('sub', sub);
    window.location.replace(target.toString());
  }, [returnUrl, email, name, picture, sub]);

  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center text-zinc-300">
      <h1 className="text-xl font-semibold text-white">Giris basarili</h1>
      <p className="mt-3 text-sm">Uygulamaya yonlendiriliyorsunuz...</p>
    </main>
  );
}
