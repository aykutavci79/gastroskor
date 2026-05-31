'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';

import { analyzeReview, createReview, getGoogleReviewLink } from '@/lib/api';
import type { Review, ReviewAnalyzeResult } from '@/lib/types';

import { StarRating } from '@/components/StarRating';

type Props = {
  restaurantId: string;
  onReviewCreated: (review: Review) => void;
  onAnalyzed: (result: ReviewAnalyzeResult) => void;
};

export function ReviewForm({ restaurantId, onReviewCreated, onAnalyzed }: Props) {
  const { data: session } = useSession();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [lastReviewId, setLastReviewId] = useState<string | null>(null);
  const [loading, setLoading] = useState<'submit' | 'analyze' | 'google' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setMessage(null);
    if (text.trim().length < 5) {
      setError('Yorum en az 5 karakter olmali.');
      return;
    }

    setLoading('submit');
    try {
      const review = await createReview({
        restaurant_id: restaurantId,
        rating,
        review_text: text.trim(),
        author_email: session?.user?.email ?? undefined,
        author_name: session?.user?.name ?? undefined,
        author_avatar_url: session?.user?.image ?? undefined,
      });
      setLastReviewId(review.id);
      onReviewCreated(review);
      setMessage('Yorum kaydedildi. Simdi AI analizi yapabilirsin.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yorum kaydedilemedi.');
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
        });
        reviewId = review.id;
        setLastReviewId(review.id);
        onReviewCreated(review);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Yorum kaydedilemedi.');
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
      <h2 className="mb-4 text-xl font-semibold text-content">Yorum Yaz</h2>

      <div className="mb-4">
        <p className="mb-2 text-sm text-content-muted">Puanin</p>
        <StarRating value={rating} onChange={setRating} />
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder="Deneyimini anlat: lezzet, servis, fiyat, hijyen..."
        className="w-full resize-y rounded-xl border border-border bg-surface-input px-4 py-3 text-content outline-none ring-accent/40 placeholder:text-content-muted focus:ring-2"
      />

      <p className="mt-2 text-xs text-content-muted">
        Argo/küfür içeren yorumlar yayınlanamamaktadır.
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
