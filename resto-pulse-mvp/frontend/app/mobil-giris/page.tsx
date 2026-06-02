import { redirect } from 'next/navigation';

function isAllowedReturnUrl(value: string | undefined): value is string {
  if (!value) return false;
  return value.startsWith('gastroskor://') || value.startsWith('exp://');
}

type Props = {
  searchParams: Promise<{ return?: string }>;
};

export default async function MobilGirisPage({ searchParams }: Props) {
  const params = await searchParams;
  const returnUrl = params.return;

  if (!isAllowedReturnUrl(returnUrl)) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center text-zinc-300">
        <h1 className="text-xl font-semibold text-white">Mobil giris</h1>
        <p className="mt-3 text-sm">Gecersiz veya eksik yonlendirme adresi.</p>
      </main>
    );
  }

  const callbackUrl = `/mobil-giris/tamam?return=${encodeURIComponent(returnUrl)}`;
  redirect(
    `/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackUrl)}&prompt=select_account`,
  );
}
