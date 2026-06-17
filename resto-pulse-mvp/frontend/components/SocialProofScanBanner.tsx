import type { SocialProofStatus } from '@/lib/types';

type Props = {
  social: SocialProofStatus | null;
};

export function SocialProofScanBanner({ social }: Props) {
  if (!social) return null;

  if (social.status === 'insufficient_data') {
    return (
      <div className="rounded-xl border border-border bg-surface-muted/40 p-3 text-sm text-content-muted">
        Sosyal kanıt için yeterli eşleşme bulunamadı — sıralama Google skoruna göre.
      </div>
    );
  }

  if (social.status === 'ready') return null;
  if (social.status !== 'scanning' && social.status !== 'pending') return null;

  const pct = social.progress_pct ?? 10;

  return (
    <div className="rounded-xl border border-border bg-surface-muted/60 p-3 text-sm">
      <p className="font-medium text-content">Sosyal sinyaller taranıyor…</p>
      <p className="mt-1 text-xs text-content-muted">
        Reddit, X ve YouTube — yaklaşık 30–60 sn · %{pct}
      </p>
    </div>
  );
}
