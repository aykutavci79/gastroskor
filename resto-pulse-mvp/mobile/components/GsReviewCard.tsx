import { Image } from 'expo-image';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { StarRatingPicker } from '@/components/StarRatingPicker';
import { UserAvatar } from '@/components/UserAvatar';
import { GastroColors } from '@/constants/theme';
import {
  createReviewReply,
  deleteReview,
  deleteReviewReply,
  toggleReviewHelpful,
  updateReview,
  updateReviewReply,
} from '@/lib/api';
import { formatReviewDate, isOwnReview, renderStarRow } from '@/lib/review-display';
import type { DisplayReview, ReviewReply } from '@/lib/types';

type Props = {
  review: DisplayReview;
  viewerEmail: string | null;
  viewerUserId?: string | null;
  viewerName: string | null;
  onChange: (review: DisplayReview) => void;
  onDelete: (reviewId: string) => void;
  onInputFocus?: () => void;
  onCardLayout?: (offsetY: number) => void;
};

function isReplyMine(reply: ReviewReply, viewerEmail: string | null): boolean {
  if (!viewerEmail?.trim() || !reply.author_email) return false;
  return reply.author_email.toLowerCase() === viewerEmail.trim().toLowerCase();
}

export function GsReviewCard({
  review,
  viewerEmail,
  viewerUserId = null,
  viewerName,
  onChange,
  onDelete,
  onInputFocus,
  onCardLayout,
}: Props) {
  const ownReview = isOwnReview(review, viewerEmail, viewerUserId);
  const canInteract = Boolean(viewerEmail?.trim());
  const editable = review.viewer_can_edit === true || (ownReview && !review.source_platform);

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
      Alert.alert('Yararlı', err instanceof Error ? err.message : 'Islem basarisiz');
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
      onChange({
        ...review,
        replies: [...replies, saved],
      });
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
    Alert.alert('Yorumu sil', 'Bu yorum kalici olarak silinecek.', [
      { text: 'Vazgec', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteReview(review.id, viewerEmail);
              onDelete(review.id);
            } catch (err) {
              Alert.alert('Silinemedi', err instanceof Error ? err.message : 'Hata');
            }
          })();
        },
      },
    ]);
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
      Alert.alert('Cevap', err instanceof Error ? err.message : 'Guncellenemedi');
    }
  }

  function confirmDeleteReply(replyId: string) {
    if (!viewerEmail) return;
    Alert.alert('Cevabi sil', 'Bu cevap kalici olarak silinecek.', [
      { text: 'Vazgec', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteReviewReply(review.id, replyId, viewerEmail);
              onChange({
                ...review,
                replies: replies.filter((row) => row.id !== replyId),
              });
            } catch (err) {
              Alert.alert('Silinemedi', err instanceof Error ? err.message : 'Hata');
            }
          })();
        },
      },
    ]);
  }

  return (
    <View
      style={styles.card}
      onLayout={(event) => onCardLayout?.(event.nativeEvent.layout.y)}>
      <View style={styles.head}>
        <View style={styles.authorRow}>
          <UserAvatar
            avatarUrl={review.author_avatar_url}
            avatarPreset={review.author_avatar_preset}
            size={28}
            fallbackLabel={review.author_name ?? '?'}
          />
          <View style={styles.authorMeta}>
            <Text style={styles.author}>{review.author_name ?? 'GastroSkor Üyesi'}</Text>
            {ownReview ? (
              <View style={styles.ownBadge}>
                <Text style={styles.ownBadgeText}>Senin yorumun</Text>
              </View>
            ) : null}
          </View>
        </View>
        {review.created_at ? (
          <Text style={styles.date}>{formatReviewDate(review.created_at)}</Text>
        ) : null}
      </View>

      {editing ? (
        <View style={styles.editBox}>
          <StarRatingPicker value={editRating} onChange={setEditRating} />
          <TextInput
            value={editText}
            onFocus={onInputFocus}
            onChangeText={setEditText}
            placeholder="Yorumunuz"
            placeholderTextColor={GastroColors.placeholder}
            style={styles.editInput}
            multiline
            textAlignVertical="top"
          />
          <View style={styles.editActions}>
            <Pressable style={styles.ghostBtn} onPress={() => setEditing(false)}>
              <Text style={styles.ghostBtnText}>Vazgec</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={() => void saveEdit()} disabled={editBusy}>
              <Text style={styles.primaryBtnText}>{editBusy ? 'Kaydediliyor...' : 'Kaydet'}</Text>
            </Pressable>
          </View>
          {editError ? <Text style={styles.error}>{editError}</Text> : null}
        </View>
      ) : (
        <>
          <Text style={styles.stars}>{renderStarRow(review.rating)}</Text>
          {review.review_text.trim() ? <Text style={styles.text}>{review.review_text}</Text> : null}
          {(review.image_urls?.length ?? 0) > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {review.image_urls!.map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.photo} contentFit="cover" />
              ))}
            </ScrollView>
          ) : null}
        </>
      )}

      {!editing ? (
        <View style={styles.actions}>
          <Pressable
            style={[styles.helpfulBtn, markedHelpful && styles.helpfulBtnActive]}
            onPress={() => void onToggleHelpful()}
            disabled={!canInteract || ownReview || helpfulBusy}>
            {helpfulBusy ? (
              <ActivityIndicator size="small" color={GastroColors.accent} />
            ) : (
              <Text style={[styles.helpfulText, markedHelpful && styles.helpfulTextActive]}>
                Yararlı{helpfulCount > 0 ? ` · ${helpfulCount}` : ''}
              </Text>
            )}
          </Pressable>

          {canInteract ? (
            <Pressable style={styles.linkBtn} onPress={() => setReplyOpen((v) => !v)}>
              <Text style={styles.linkBtnText}>
                {replyOpen ? 'Vazgec' : replies.length > 0 ? `Cevapla · ${replies.length}` : 'Cevapla'}
              </Text>
            </Pressable>
          ) : null}

          {editable ? (
            <>
              <Pressable style={styles.linkBtn} onPress={() => {
                setEditRating(review.rating);
                setEditText(review.review_text);
                setEditing(true);
              }}>
                <Text style={styles.linkBtnText}>Duzenle</Text>
              </Pressable>
              <Pressable style={styles.linkBtn} onPress={confirmDeleteReview}>
                <Text style={styles.deleteText}>Sil</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      ) : null}

      {replies.length > 0 ? (
        <View style={styles.replyList}>
          {replies.map((reply) => {
            const mine = isReplyMine(reply, viewerEmail);
            const isEditingThis = editingReplyId === reply.id;
            return (
              <View key={reply.id} style={styles.replyRow}>
                <Text style={styles.replyAuthor}>{reply.author_name ?? 'Uye'}</Text>
                {isEditingThis ? (
                  <>
                    <TextInput
                      value={editingReplyText}
                      onFocus={onInputFocus}
                      onChangeText={setEditingReplyText}
                      style={styles.replyInput}
                      multiline
                      textAlignVertical="top"
                    />
                    <View style={styles.editActions}>
                      <Pressable style={styles.ghostBtn} onPress={() => setEditingReplyId(null)}>
                        <Text style={styles.ghostBtnText}>Vazgec</Text>
                      </Pressable>
                      <Pressable
                        style={styles.primaryBtn}
                        onPress={() => void saveReplyEdit(reply.id)}>
                        <Text style={styles.primaryBtnText}>Kaydet</Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.replyText}>{reply.reply_text}</Text>
                    {mine ? (
                      <View style={styles.replyActions}>
                        <Pressable
                          onPress={() => {
                            setEditingReplyId(reply.id);
                            setEditingReplyText(reply.reply_text);
                          }}>
                          <Text style={styles.linkBtnText}>Duzenle</Text>
                        </Pressable>
                        <Pressable onPress={() => confirmDeleteReply(reply.id)}>
                          <Text style={styles.deleteText}>Sil</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </>
                )}
              </View>
            );
          })}
        </View>
      ) : null}

      {replyOpen && canInteract ? (
        <View style={styles.replyComposer}>
          <TextInput
            value={replyText}
            onFocus={onInputFocus}
            onChangeText={setReplyText}
            placeholder="Deneyimini ekle..."
            placeholderTextColor={GastroColors.placeholder}
            style={styles.replyInput}
            multiline
            textAlignVertical="top"
          />
          <Pressable
            style={[styles.primaryBtn, styles.replySubmit]}
            onPress={() => void submitReply()}
            disabled={replyBusy || !replyText.trim()}>
            <Text style={styles.primaryBtnText}>{replyBusy ? 'Gonderiliyor...' : 'Gonder'}</Text>
          </Pressable>
          {replyError ? <Text style={styles.error}>{replyError}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: GastroColors.input,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GastroColors.border,
    padding: 12,
    gap: 8,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  authorMeta: { flex: 1, gap: 4 },
  author: { color: GastroColors.text, fontSize: 14, fontWeight: '700' },
  ownBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 107, 0, 0.14)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  ownBadgeText: { color: GastroColors.accent, fontSize: 10, fontWeight: '700' },
  date: { color: GastroColors.muted, fontSize: 11 },
  stars: { color: GastroColors.gold, fontSize: 14, letterSpacing: 1 },
  text: { color: GastroColors.text, fontSize: 14, lineHeight: 20 },
  photo: { width: 72, height: 72, borderRadius: 8, marginRight: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  helpfulBtn: {
    borderWidth: 1,
    borderColor: GastroColors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 88,
    alignItems: 'center',
  },
  helpfulBtnActive: {
    borderColor: GastroColors.accent,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
  },
  helpfulText: { color: GastroColors.muted, fontSize: 12, fontWeight: '700' },
  helpfulTextActive: { color: GastroColors.accent },
  linkBtn: { paddingVertical: 4, paddingHorizontal: 2 },
  linkBtnText: { color: GastroColors.accent, fontSize: 12, fontWeight: '700' },
  deleteText: { color: GastroColors.bad, fontSize: 12, fontWeight: '700' },
  replyList: {
    borderTopWidth: 1,
    borderTopColor: GastroColors.border,
    paddingTop: 8,
    gap: 10,
  },
  replyRow: { gap: 4, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: GastroColors.border },
  replyAuthor: { color: GastroColors.muted, fontSize: 11, fontWeight: '700' },
  replyText: { color: GastroColors.text, fontSize: 13, lineHeight: 18 },
  replyActions: { flexDirection: 'row', gap: 12 },
  replyComposer: { gap: 8 },
  replyInput: {
    minHeight: 64,
    backgroundColor: GastroColors.panel,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GastroColors.border,
    padding: 10,
    color: GastroColors.text,
    fontSize: 13,
  },
  replySubmit: { alignSelf: 'flex-start' },
  editBox: { gap: 8 },
  editInput: {
    minHeight: 72,
    backgroundColor: GastroColors.panel,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GastroColors.border,
    padding: 10,
    color: GastroColors.text,
    fontSize: 14,
  },
  editActions: { flexDirection: 'row', gap: 8 },
  ghostBtn: {
    borderWidth: 1,
    borderColor: GastroColors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ghostBtnText: { color: GastroColors.text, fontSize: 12, fontWeight: '600' },
  primaryBtn: {
    backgroundColor: GastroColors.accent,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  primaryBtnText: { color: GastroColors.accentDark, fontSize: 12, fontWeight: '800' },
  error: { color: GastroColors.bad, fontSize: 12 },
});
