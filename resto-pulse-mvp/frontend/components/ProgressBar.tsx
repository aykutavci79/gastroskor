import { scoreBarColor } from '@/lib/scores';

type Props = {
  label: string;
  score: number | null;
  hint?: string | null;
};

export function ProgressBar({ label, score, hint }: Props) {
  const width = score == null ? 0 : Math.min(100, Math.max(0, (score / 10) * 100));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-content">{label}</span>
        <span className="tabular-nums text-content-muted">{score == null ? '—' : `${score}/10`}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-surface-input/80">
        <div
          className={`h-full rounded-full transition-all duration-500 ${scoreBarColor(score)}`}
          style={{ width: `${width}%` }}
        />
      </div>
      {hint ? <p className="text-xs text-content-muted">{hint}</p> : null}
    </div>
  );
}
