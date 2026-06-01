export type TextSegment = { text: string; flagged: boolean };

export type ModerationApiDetail = {
  code?: string;
  message?: string;
  highlights?: string[];
};

export class ReviewModerationApiError extends Error {
  readonly highlights: string[];

  constructor(message: string, highlights: string[] = []) {
    super(message);
    this.name = 'ReviewModerationApiError';
    this.highlights = highlights;
  }
}

export function parseModerationDetail(detail: unknown): ReviewModerationApiError | null {
  if (!detail || typeof detail !== 'object') return null;
  const row = detail as ModerationApiDetail;
  const highlights = row.highlights ?? [];
  if (row.code === 'profanity' || highlights.length > 0) {
    const message =
      row.message ?? 'Argo veya küfür içeren ifadeler var. İşaretli kelimeleri düzeltin.';
    return new ReviewModerationApiError(message, highlights);
  }
  if (typeof row.message === 'string') {
    return new ReviewModerationApiError(row.message, highlights);
  }
  return null;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildHighlightedSegments(text: string, highlights: string[]): TextSegment[] {
  if (!text) return [{ text: '', flagged: false }];
  if (!highlights.length) return [{ text, flagged: false }];

  let segments: TextSegment[] = [{ text, flagged: false }];
  const ordered = [...highlights].filter(Boolean).sort((a, b) => b.length - a.length);

  for (const highlight of ordered) {
    const pattern = new RegExp(escapeRegex(highlight), 'giu');
    const next: TextSegment[] = [];
    for (const segment of segments) {
      if (segment.flagged) {
        next.push(segment);
        continue;
      }
      let last = 0;
      let match: RegExpExecArray | null;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(segment.text)) !== null) {
        if (match.index > last) {
          next.push({ text: segment.text.slice(last, match.index), flagged: false });
        }
        next.push({ text: match[0], flagged: true });
        last = match.index + match[0].length;
      }
      if (last < segment.text.length) {
        next.push({ text: segment.text.slice(last), flagged: false });
      }
    }
    segments = next.length > 0 ? next : segments;
  }

  return segments.filter((s) => s.text.length > 0);
}
