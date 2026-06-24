import { Share } from 'react-native';

const SITE_BASE = (process.env.EXPO_PUBLIC_SITE_URL ?? 'https://www.gastroskor.com.tr').replace(/\/$/, '');

export function buildReferralInviteUrl(referrerId: string): string {
  const id = referrerId.trim();
  return `${SITE_BASE}/?ref=${encodeURIComponent(id)}`;
}

export function buildReferralInviteMessage(referrerId: string): string {
  const url = buildReferralInviteUrl(referrerId);
  return [
    'GastroSkor\'a katıl — oyun oyna, GastroCoin kazan!',
    'İlk girişinde ikimiz de +10 GC kazanırız.',
    url,
  ].join('\n');
}

export async function shareReferralInvite(referrerId: string): Promise<boolean> {
  const message = buildReferralInviteMessage(referrerId);
  const result = await Share.share({ message, title: 'GastroSkor daveti' });
  return result.action === Share.sharedAction;
}
