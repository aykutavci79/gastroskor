import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { authOptions } from '@/lib/auth-options';

import { MobilGirisTamamClient } from './tamam-client';

function isAllowedReturnUrl(value: string | undefined): value is string {
  if (!value) return false;
  return value.startsWith('gastroskor://') || value.startsWith('exp://');
}

type Props = {
  searchParams: Promise<{ return?: string }>;
};

export default async function MobilGirisTamamPage({ searchParams }: Props) {
  const params = await searchParams;
  const returnUrl = params.return;

  if (!isAllowedReturnUrl(returnUrl)) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center text-zinc-300">
        <p className="text-sm">Gecersiz yonlendirme adresi.</p>
      </main>
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect(`/mobil-giris?return=${encodeURIComponent(returnUrl)}`);
  }

  return (
    <MobilGirisTamamClient
      returnUrl={returnUrl}
      email={session.user.email}
      name={session.user.name ?? ''}
      picture={session.user.image ?? ''}
      sub={session.user.email}
    />
  );
}
