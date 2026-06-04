'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';

const AUTH_ERROR_TR: Record<string, string> = {
  AccessDenied:
    'Google bu hesaba izin vermedi. Testing modunda yalnizca Test users listesindeki Gmail ile gir (orn. coolisback@gmail.com). Baska hesap secme.',
  Configuration:
    'Sunucu ayari eksik: Vercel ortaminda GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET ve NEXTAUTH_SECRET kontrol et.',
  OAuthCallback:
    'Google donus hatasi: Client secret eski/yanlis olabilir veya callback URI eksik (www ve apex icin /api/auth/callback/google).',
  OAuthSignin: 'Google girisi baslatilamadi. Sayfayi yenile ve tekrar dene.',
  Callback: 'Oturum olusturulamadi. Baska bir tarayici sekmesi aciksa kapatip tekrar dene.',
  OAuthAccountNotLinked:
    'Bu e-posta baska bir giris yontemiyle kayitli. Ayni Google hesabiyla veya destek ile iletisime gec.',
  Default:
    'Giris basarisiz. Farkli bir Google hesabi dene veya uygulamayi kapatip ac.',
};

function isAllowedReturnUrl(value: string | null): value is string {
  if (!value) return false;
  return value.startsWith('gastroskor://') || value.startsWith('exp://');
}

function GirisInner() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get('error');
  const mode = searchParams.get('mode');
  const returnUrl = searchParams.get('return');
  const callbackFromQuery = searchParams.get('callbackUrl');

  const authError = errorCode ? (AUTH_ERROR_TR[errorCode] ?? AUTH_ERROR_TR.Default) : null;
  const isMobile = mode === 'mobil' && isAllowedReturnUrl(returnUrl);

  const callbackUrl = useMemo(() => {
    if (callbackFromQuery?.startsWith('/')) return callbackFromQuery;
    if (isMobile && returnUrl) {
      return `/mobil-giris/tamam?return=${encodeURIComponent(returnUrl)}`;
    }
    return '/panel';
  }, [callbackFromQuery, isMobile, returnUrl]);

  const title = isMobile ? 'GastroSkor — Mobil giris' : 'GastroSkor — Giris';

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <div className="rounded-2xl border border-border/70 bg-surface-input p-8 text-center">
        <h1 className="text-xl font-semibold text-content">{title}</h1>
        <p className="mt-2 text-sm text-content-muted">Devam etmek icin Google hesabinizi secin.</p>

        {authError ? (
          <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-left text-sm text-rose-100">
            {authError}
            {errorCode ? (
              <span className="mt-2 block text-xs text-rose-200/80">Kod: {errorCode}</span>
            ) : null}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => signIn('google', { callbackUrl })}
          className="mt-6 w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-100">
          Google ile giris yap
        </button>

        {isMobile ? (
          <p className="mt-4 text-xs text-content-muted">
            Giris sonrasi otomatik olarak uygulamaya donersiniz.
          </p>
        ) : null}
      </div>
    </main>
  );
}

export default function AuthGirisPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-md px-4 py-16 text-center text-sm text-content-muted">Yukleniyor...</main>
      }>
      <GirisInner />
    </Suspense>
  );
}
