import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { HosgeldinizClient } from '@/app/hosgeldiniz/HosgeldinizClient';
import { authOptions } from '@/lib/auth-options';
import { POST_AUTH_WELCOME_PATH } from '@/lib/post-auth-callback';

export const metadata: Metadata = {
  title: "GastroSkor'a Hoş Geldiniz",
  robots: { index: false, follow: false },
};

export default async function HosgeldinizPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect(`/auth/giris?callbackUrl=${encodeURIComponent(POST_AUTH_WELCOME_PATH)}`);
  }

  return <HosgeldinizClient displayName={session.user.name ?? undefined} />;
}
