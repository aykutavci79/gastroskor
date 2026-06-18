import type { SocialProofStatus } from '@/lib/types';

type Props = {
  social: SocialProofStatus | null;
  onRequestScan?: () => void;
  scanLoading?: boolean;
  loggedIn?: boolean;
  socialSortActive?: boolean;
  /** Sosyal modda otomatik tarama bekleniyor */
  autoScan?: boolean;
};

export function SocialProofScanBanner({
  social,
  onRequestScan,
  scanLoading,
  loggedIn,
  socialSortActive,
  autoScan,
}: Props) {
  if (!social) return null;

  if (social.status === 'scanning' || social.status === 'pending') {
    const pct = social.progress_pct ?? 10;
    return (
      <div className="rounded-xl border border-border bg-surface-muted/60 p-3 text-sm">
        <p className="font-medium text-content">Sosyal sinyaller taranıyor…</p>
        <p className="mt-1 text-xs text-content-muted">
          {social.scan_label ? `${social.scan_label} · ` : ''}
          Reddit, X ve YouTube — yaklaşık 30–60 sn · %{pct}
        </p>
      </div>
    );
  }

  if (social.status === 'ready' && social.results?.length && socialSortActive) {
    return (
      <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 text-sm">
        <p className="font-medium text-content">Sosyal kanıt modu — sıralama tamam</p>
        <p className="mt-1 text-xs text-content-muted">
          Rozetli mekanlar üstte · Wilson skoru + Google yorum tabanı
        </p>
      </div>
    );
  }

  if (social.status === 'insufficient_data' && !social.can_scan) {
    return (
      <div className="rounded-xl border border-border bg-surface-muted/40 p-3 text-sm text-content-muted">
        Sosyal kanıt için yeterli eşleşme bulunamadı — liste GastroSkor sırasında kaldı.
      </div>
    );
  }

  if (social.status === 'uncached' || (social.status === 'insufficient_data' && social.can_scan)) {
    const label = social.scan_label ?? 'bu ürün';
    if (!loggedIn) {
      return (
        <div className="rounded-xl border border-border bg-surface-muted/40 p-3 text-sm text-content-muted">
          {label} için sosyal sinyal yok. Sosyal kanıt modu için{' '}
          <a href="/auth/giris" className="text-accent underline">
            giriş yap
          </a>
          .
        </div>
      );
    }
    if (autoScan) {
      return (
        <div className="rounded-xl border border-border bg-surface-muted/60 p-3 text-sm">
          <p className="font-medium text-content">{label} — sosyal tarama başlatılıyor</p>
          <p className="mt-1 text-xs text-content-muted">Reddit, X ve YouTube taranıyor…</p>
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-border bg-surface-muted/60 p-3 text-sm">
        <p className="font-medium text-content">{label} — sosyal sinyal yok</p>
        <p className="mt-1 text-xs text-content-muted">
          Reddit, X ve YouTube&apos;da tarayıp sonucu kaydederiz (günde 10 tarama).
        </p>
        <button
          type="button"
          onClick={onRequestScan}
          disabled={scanLoading || !onRequestScan}
          className="btn-primary mt-3 text-sm disabled:opacity-60">
          {scanLoading ? 'Başlatılıyor…' : 'Sosyal sinyalleri tara'}
        </button>
      </div>
    );
  }

  if (social.status === 'failed') {
    return (
      <div className="rounded-xl border border-bad/40 bg-bad/10 p-3 text-sm text-red-200">
        Sosyal tarama başarısız. Tekrar deneyebilirsin.
        {onRequestScan ? (
          <button
            type="button"
            onClick={onRequestScan}
            disabled={scanLoading}
            className="btn-primary mt-2 text-sm disabled:opacity-60">
            {scanLoading ? 'Başlatılıyor…' : 'Yeniden tara'}
          </button>
        ) : null}
      </div>
    );
  }

  return null;
}
