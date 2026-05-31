'use client';

import { useState } from 'react';

import { StarRating } from '@/components/StarRating';
import {
  createReviewReply,
  deleteReview,
  deleteReviewReply,
  toggleReviewHelpful,
  updateReview,
  updateReviewReply,
} from '@/lib/api';
import { sentimentColor } from '@/lib/scores';
import type { Review, ReviewReply } from '@/lib/types';

function reviewSourceLabel(review: Review): string | null {
  if (review.is_demo) return 'Demo yorum';
  if (review.source_platform === 'google_maps') return "Google'dan senkron";
  if (review.source_platform) return review.source_platform;
  return 'GastroSkor iç yorumu';
}

function formatReviewDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isOwnReview(review: Review, viewerEmail: string | null | undefined): boolean {
  if (!viewerEmail?.trim() || !review.author_email) return false;
  return review.author_email.toLowerCase() === viewerEmail.trim().toLowerCase();
}

function isReplyMine(reply: ReviewReply, viewerEmail: string | null | undefined): boolean {
  if (!viewerEmail?.trim() || !reply.author_email) return false;
  return reply.author_email.toLowerCase() === viewerEmail.trim().toLowerCase();
}

type Props = {
  review: Review;
  viewerEmail?: string | null;
  onChange: (review: Review) => void;
  onDelete: (reviewId: string) => void;
};

export function GsReviewCard({ review, viewerEmail = null, onChange, onDelete }: Props) {
  const ownReview = isOwnReview(review, viewerEmail);
  const canInteract = Boolean(viewerEmail?.trim());
  const editable = ownReview && !review.source_platform;

  const [helpfulBusy, setHelpfulBusy] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editRating, setEditRating] = useState(review.rating);
  const [editText, setEditText] = useState(review.review_text);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingReplyText, setEditingReplyText] = useState('');

  const replies = review.replies ?? [];
  const helpfulCount = review.helpful_count ?? 0;
  const markedHelpful = review.viewer_marked_helpful ?? false;

  async function onToggleHelpful() {
    if (!viewerEmail || ownReview || helpfulBusy) return;
    setHelpfulBusy(true);
    try {
      const updated = await toggleReviewHelpful(review.id, viewerEmail);
      onChange({
        ...review,
        helpful_count: updated.helpful_count,
        viewer_marked_helpful: updated.viewer_marked_helpful,
      });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Islem basarisiz');
    } finally {
      setHelpfulBusy(false);
    }
  }

  async function submitReply() {
    if (!viewerEmail?.trim() || !replyText.trim() || replyBusy) return;
    setReplyBusy(true);
    setReplyError(null);
    try {
      const saved = await createReviewReply(review.id, {
        author_email: viewerEmail,
        reply_text: replyText.trim(),
      });
      onChange({ ...review, replies: [...replies, saved] });
      setReplyText('');
      setReplyOpen(false);
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : 'Cevap gonderilemedi');
    } finally {
      setReplyBusy(false);
    }
  }

  async function saveEdit() {
    if (!viewerEmail || !editable || editBusy) return;
    if (editRating < 1) {
      setEditError('Lutfen puan secin.');
      return;
    }
    setEditBusy(true);
    setEditError(null);
    try {
      const updated = await updateReview(review.id, {
        author_email: viewerEmail,
        rating: editRating,
        review_text: editText.trim(),
      });
      onChange({ ...review, ...updated, replies: review.replies });
      setEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Guncellenemedi');
    } finally {
      setEditBusy(false);
    }
  }

  function confirmDeleteReview() {
    if (!viewerEmail || !editable) return;
    if (!window.confirm('Bu yorum kalici olarak silinecek. Emin misiniz?')) return;
    void (async () => {
      try {
        await deleteReview(review.id, viewerEmail);
        onDelete(review.id);
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Silinemedi');
      }
    })();
  }

  async function saveReplyEdit(replyId: string) {
    if (!viewerEmail || !editingReplyText.trim()) return;
    try {
      const saved = await updateReviewReply(review.id, replyId, {
        author_email: viewerEmail,
        reply_text: editingReplyText.trim(),
      });
      onChange({
        ...review,
        replies: replies.map((row) => (row.id === replyId ? saved : row)),
      });
      setEditingReplyId(null);
      setEditingReplyText('');
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Guncellenemedi');
    }
  }

  function confirmDeleteReply(replyId: string) {
    if (!viewerEmail) return;
    if (!window.confirm('Bu cevap kalici olarak silinecek.')) return;
    void (async () => {
      try {
        await deleteReviewReply(review.id, replyId, viewerEmail);
        onChange({
          ...review,
          replies: replies.filter((row) => row.id !== replyId),
        });
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Silinemedi');
      }
    })();
  }

  return (
    <article className="rounded-2xl border border-border/70 bg-surface-card p-5">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-content">{review.author_name ?? 'GastroSkor Üyesi'}</p>
          {review.created_at ? (
            <p className="text-xs text-content-muted">{formatReviewDate(review.created_at)}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {reviewSourceLabel(review) ? (
            <span
              className={
                review.is_demo
                  ? 'rounded-full border border-violet-500/40 bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-200'
                  : review.source_platform === 'google_maps'
                    ? 'rounded-full border border-success/40 bg-success/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success'
                    : 'rounded-full border border-border bg-surface-input px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-content-muted'
              }>
              {reviewSourceLabel(review)}
            </span>
          ) : null}
          {review.sentiment_score != null ? (
            <span className={`text-xs font-medium ${sentimentColor(review.sentiment_label)}`}>
              AI: {review.sentiment_score}/10
            </span>
          ) : null}
        </div>
      </div>

      {editing ? (
        <div className="space-y-3">
          <StarRating value={editRating} onChange={setEditRating} />
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={4}
            className="w-full resize-y rounded-xl border border-border bg-surface-input px-4 py-3 text-sm text-content outline-none ring-accent/40 focus:ring-2"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-content hover:bg-surface-input">
              Vazgec
            </button>
            <button
              type="button"
              onClick={() => void saveEdit()}
              disabled={editBusy}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50">
              {editBusy ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
          {editError ? <p className="text-sm text-bad">{editError}</p> : null}
        </div>
      ) : (
        <>
          <StarRating value={review.rating} readonly />
          {review.review_text.trim() ? (
            <p className="mt-3 text-content">{review.review_text}</p>
          ) : null}
          {review.ai_summary ? (
            <p className="mt-3 text-sm text-content-muted">{review.ai_summary}</p>
          ) : null}
          {(review.image_urls?.length ?? 0) > 0 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {review.image_urls!.map((uri) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={uri} src={uri} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
              ))}
            </div>
          ) : null}
        </>
      )}

      {!editing ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void onToggleHelpful()}
            disabled={!canInteract || ownReview || helpfulBusy}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
              markedHelpful
                ? 'border-accent bg-accent/15 text-accent'
                : 'border-border text-content-muted hover:border-accent/50'
            }`}>
            {helpfulBusy ? '...' : `Yararlı${helpfulCount > 0 ? ` · ${helpfulCount}` : ''}`}
          </button>

          {canInteract ? (
            <button
              type="button"
              onClick={() => setReplyOpen((v) => !v)}
              className="text-xs font-bold text-accent hover:underline">
              {replyOpen ? 'Vazgec' : replies.length > 0 ? `Cevapla · ${replies.length}` : 'Cevapla'}
            </button>
          ) : null}

          {editable ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditRating(review.rating);
                  setEditText(review.review_text);
                  setEditing(true);
                }}
                className="text-xs font-bold text-accent hover:underline">
                Duzenle
              </button>
              <button
                type="button"
                onClick={confirmDeleteReview}
                className="text-xs font-bold text-bad hover:underline">
                Sil
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {replies.length > 0 ? (
        <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
          {replies.map((reply) => {
            const mine = isReplyMine(reply, viewerEmail);
            const isEditingThis = editingReplyId === reply.id;
            return (
              <div key={reply.id} className="border-l-2 border-border/70 pl-3">
                <p className="text-xs font-semibold text-content-muted">{reply.author_name ?? 'Uye'}</p>
                {isEditingThis ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={editingReplyText}
                      onChange={(e) => setEditingReplyText(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-border bg-surface-input px-3 py-2 text-sm text-content outline-none focus:ring-2 focus:ring-accent/40"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingReplyId(null)}
                        className="rounded-lg border border-border px-3 py-1 text-xs text-content">
                        Vazgec
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveReplyEdit(reply.id)}
                        className="rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-ink">
                        Kaydet
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mt-1 text-sm leading-6 text-content">{reply.reply_text}</p>
                    {mine ? (
                      <div className="mt-2 flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingReplyId(reply.id);
                            setEditingReplyText(reply.reply_text);
                          }}
                          className="text-xs font-bold text-accent hover:underline">
                          Duzenle
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmDeleteReply(reply.id)}
                          className="text-xs font-bold text-bad hover:underline">
                          Sil
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {replyOpen && canInteract ? (
        <div className="mt-4 space-y-2 border-t border-border/60 pt-4">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={3}
            placeholder="Deneyimini ekle..."
            className="w-full rounded-xl border border-border bg-surface-input px-3 py-2 text-sm text-content outline-none placeholder:text-content-muted focus:ring-2 focus:ring-accent/40"
          />
          <button
            type="button"
            onClick={() => void submitReply()}
            disabled={replyBusy || !replyText.trim()}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50">
            {replyBusy ? 'Gonderiliyor...' : 'Gonder'}
          </button>
          {replyError ? <p className="text-sm text-bad">{replyError}</p> : null}
        </div>
      ) : null}

      {!canInteract ? (
        <p className="mt-3 text-xs text-content-muted">
          Yararlı ve cevap icin Google ile giris yapin.
        </p>
      ) : null}
    </article>
  );
}
