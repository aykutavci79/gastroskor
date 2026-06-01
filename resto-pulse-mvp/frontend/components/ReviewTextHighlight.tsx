'use client';

import { buildHighlightedSegments } from '@/lib/review-moderation';

type Props = {
  text: string;
  highlights: string[];
  className?: string;
};

export function ReviewTextHighlight({ text, highlights, className }: Props) {
  if (!text.trim()) return null;
  const segments = buildHighlightedSegments(text, highlights);

  return (
    <p className={className ?? 'whitespace-pre-wrap text-sm leading-relaxed text-content'}>
      {segments.map((segment, index) =>
        segment.flagged ? (
          <mark
            key={`${index}-${segment.text}`}
            className="rounded bg-bad/25 px-0.5 text-bad underline decoration-bad decoration-2 underline-offset-2">
            {segment.text}
          </mark>
        ) : (
          <span key={`${index}-${segment.text}`}>{segment.text}</span>
        ),
      )}
    </p>
  );
}
