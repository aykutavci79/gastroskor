'use client';

type FeedbackStatus = 'open' | 'in_review' | 'resolved' | 'rejected';

type Props = {
  status: FeedbackStatus;
  className?: string;
};

const STATUS_STYLES: Record<FeedbackStatus, { label: string; classes: string }> = {
  open: {
    label: 'Açık',
    classes: 'border-amber-400/40 bg-amber-400/15 text-amber-200',
  },
  in_review: {
    label: 'İncelemede',
    classes: 'border-sky-400/40 bg-sky-400/15 text-sky-200',
  },
  resolved: {
    label: 'Çözüldü',
    classes: 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200',
  },
  rejected: {
    label: 'Reddedildi',
    classes: 'border-rose-400/40 bg-rose-400/15 text-rose-200',
  },
};

export function FeedbackStatusBadge({ status, className = '' }: Props) {
  const style = STATUS_STYLES[status];

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide ${style.classes} ${className}`.trim()}>
      {style.label}
    </span>
  );
}

export type { FeedbackStatus };

