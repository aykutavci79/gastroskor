'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

import { analyzeReview, createReview, getGoogleReviewLink, moderateReviewText } from '@/lib/api';
import { ReviewModerationApiError } from '@/lib/api';
import type { AuthorNameDisplayMode } from '@/lib/display-name';
import { REVIEW_NAME_DISPLAY_STORAGE_KEY, previewAuthorName } from '@/lib/display-name';
import type { Review, ReviewAnalyzeResult } from '@/lib/types';

import { ReviewTextHighlight } from '@/components/ReviewTextHighlight';
import { StarRating } from '@/components/StarRating';

type Props = {
  restaurantId: string;
  onReviewCreated: (review: Review) => void;
  onAnalyzed: (result: ReviewAnalyzeResult) => void;
  heading?: string;
};

export function ReviewForm({
  restaurantId,
  onReviewCreated,
  onAnalyzed,
  heading = 'Yorum Yaz',
}: Props) {
  const { data: session } = useSession();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [lastReviewId, setLastReviewId] = useState<string | null>(null);
  const [loading, setLoading] = useState<'submit' | 'analyze' | 'google' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [nameDisplay, setNameDisplay] = useState<AuthorNameDisplayMode>('full');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(REVIEW_NAME_DISPLAY_STORAGE_KEY);
      if (stored === 'masked' || stored === 'full' || stored === 'nickname') setNameDisplay(stored);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed.length < 5) {
      setHighlights([]);
      return;
    }

    const timer = window.setTimeout(() => {
      void moderateReviewText(trimmed)
        .then((result) => {
          if (!result.allowed) {
            setHighlights(result.highlights ?? []);
          } else {
            setHighlights([]);
          }
        })
        .catch(() => {
          /* sunucu kapaliysa sessiz gec */
        });
    }, 450);

    return () => window.clearTimeout(timer);
  }, [text]);

  function applyModerationError(err: unknown) {
    if (err instanceof ReviewModerationApiError) {
      setError(err.message);
      setHighlights(err.highlights);
      return;
    }
    setError(err instanceof Error ? err.message : 'Yorum kaydedilemedi.');
    setHighlights([]);
  }

  async function handleSubmit() {
    setError(null);
    setMessage(null);
    setHighlights([]);
    if (text.trim().length < 5) {
      setError('Yorum en az 5 karakter olmali.');
      return;
    }

    setLoading('submit');
    try {
      try {
        localStorage.setItem(REVIEW_NAME_DISPLAY_STORAGE_KEY, nameDisplay);
      } catch {
        /* ignore */
      }
      const review = await createReview({
        restaurant_id: restaurantId,
        rating,
        review_text: text.trim(),
        author_email: session?.user?.email ?? undefined,
        author_name: session?.user?.name ?? undefined,
        author_avatar_url: session?.user?.image ?? undefined,
        author_name_display: nameDisplay,
      });
      setLastReviewId(review.id);
      onReviewCreated(review);
      setMessage('Yorum kaydedildi. Simdi AI analizi yapabilirsin.');
      setHighlights([]);
    } catch (err) {
      applyModerationError(err);
    } finally {
      setLoading(null);
    }
  }

  async function handleAnalyze() {
    setError(null);
    setMessage(null);

    let reviewId = lastReviewId;
    if (!reviewId) {
      if (text.trim().length < 5) {
        setError('Once yorum yaz veya kaydet.');
        return;
      }
      setLoading('analyze');
      try {
        const review = await createReview({
          restaurant_id: restaurantId,
          rating,
          review_text: text.trim(),
          author_email: session?.user?.email ?? undefined,
          author_name: session?.user?.name ?? undefined,
          author_avatar_url: session?.user?.image ?? undefined,
          author_name_display: nameDisplay,
        });
        reviewId = review.id;
        setLastReviewId(review.id);
        onReviewCreated(review);
        setHighlights([]);
      } catch (err) {
        applyModerationError(err);
        setLoading(null);
        return;
      }
    }

    setLoading('analyze');
    try {
      const result = await analyzeReview(reviewId!);
      onAnalyzed(result);
      setMessage('AI analizi tamamlandi. Grafikler guncellendi.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analiz basarisiz.');
    } finally {
      setLoading(null);
    }
  }

  async function handleGooglePublish() {
    setError(null);
    setMessage(null);
    if (text.trim().length < 5) {
      setError('Google icin once yorum metnini yaz.');
      return;
    }

    setLoading('google');
    try {
      const link = await getGoogleReviewLink(restaurantId);
      await navigator.clipboard.writeText(text.trim());
      window.open(link.google_review_url, '_blank', 'noopener,noreferrer');
      setMessage('Yorum metni panoya kopyalandi. Google yorum sayfasi acildi.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Google baglantisi alinamadi. Restorana Google Place ID eklenmis olmali.',
      );
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="rounded-2xl border border-border/70 bg-surface-card p-6">
      <h2 className="mb-4 text-xl font-semibold text-content">{heading}</h2>

      <div className="mb-4">
        <p className="mb-2 text-sm font-medium text-content-muted">Yorumda adin nasil gorunsun?</p>
        <div className="mb-2 flex gap-2">
          <button
            type="button"
            onClick={() => setNameDisplay('full')}
            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              nameDisplay === 'full'
                ? 'border-accent bg-accent/15 text-accent'
                : 'border-border bg-surface-input text-content-muted'
            }`}>
            Tam ad
          </button>
          <button
            type="button"
            onClick={() => setNameDisplay('masked')}
            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              nameDisplay === 'masked'
                ? 'border-accent bg-accent/15 text-accent'
                : 'border-border bg-surface-input text-content-muted'
            }`}>
            Gizli
          </button>
        </div>
        <p className="text-xs text-content-muted">
          Onizleme:{' '}
          <span className="font-semibold text-content">
            {previewAuthorName(session?.user?.name ?? null, nameDisplay)}
          </span>
        </p>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-sm text-content-muted">Puanin</p>
        <StarRating value={rating} onChange={setRating} />
      </div>

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (highlights.length) setHighlights([]);
          if (error) setError(null);
        }}
        rows={5}
        placeholder="Deneyimini anlat: lezzet, servis, fiyat, hijyen..."
        className={`w-full resize-y rounded-xl border bg-surface-input px-4 py-3 text-content outline-none ring-accent/40 placeholder:text-content-muted focus:ring-2 ${
          highlights.length ? 'border-bad/60' : 'border-border'
        }`}
      />

      {highlights.length > 0 ? (
        <div className="mt-3 rounded-xl border border-bad/40 bg-bad/10 px-4 py-3">
          <p className="mb-2 text-xs font-medium text-bad">
            Isaretli ifadeler yayinlanamaz — duzeltip tekrar deneyin.
          </p>
          <ReviewTextHighlight text={text} highlights={highlights} />
        </div>
      ) : null}

      <p className="mt-2 text-xs text-content-muted">
        Argo/küfür içeren yorumlar yayınlanmaz; ban uygulanmaz, metin düzeltilir.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading !== null}
          className="rounded-xl bg-surface-input px-5 py-2.5 font-medium text-content transition hover:bg-slate-600 disabled:opacity-50">
          {loading === 'submit' ? 'Kaydediliyor...' : 'Yorumu Kaydet'}
        </button>
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={loading !== null}
          className="rounded-xl bg-accent px-5 py-2.5 font-semibold text-ink transition hover:brightness-110 disabled:opacity-50">
          {loading === 'analyze' ? 'Analiz ediliyor...' : 'Yapay Zeka ile Analiz Et'}
        </button>
        <button
          type="button"
          onClick={handleGooglePublish}
          disabled={loading !== null}
          className="rounded-xl border border-amber-400/60 bg-amber-400/10 px-5 py-2.5 font-semibold text-brand-gold transition hover:bg-amber-400/20 disabled:opacity-50">
          {loading === 'google' ? 'Aciliyor...' : "Google'da Yayinla"}
        </button>
      </div>

      {message ? <p className="mt-4 text-sm text-good">{message}</p> : null}
      {error ? <p className="mt-4 text-sm text-bad">{error}</p> : null}
    </section>
  );
}
