import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { GastroColors } from '@/constants/theme';
import { useSession } from '@/context/session-context';
import { listMyReviews } from '@/lib/api';
import { formatReviewDate, renderStarRow } from '@/lib/review-display';
import type { MyReview } from '@/lib/types';

export default function YorumlarimScreen() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.email) {
      setReviews([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listMyReviews(user.email, { limit: 100 });
      setReviews(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yorumlar yuklenemedi');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen>
      <Text style={styles.title}>Yorumlarım</Text>
      <Text style={styles.sub}>Tum GastroSkor yorumlarin tek listede.</Text>

      {sessionLoading || loading ? (
        <ActivityIndicator color={GastroColors.accent} style={styles.loader} />
      ) : !user?.email ? (
        <Pressable style={styles.cta} onPress={() => router.push('/(tabs)/profil')}>
          <Text style={styles.ctaText}>Giris yap →</Text>
        </Pressable>
      ) : error ? (
        <View style={styles.empty}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={() => void load()}>
            <Text style={styles.retry}>Tekrar dene</Text>
          </Pressable>
        </View>
      ) : reviews.length === 0 ? (
        <Text style={styles.emptyText}>Henuz yorum yazmadin.</Text>
      ) : (
        <View style={styles.list}>
          {reviews.map((review) => (
            <Pressable
              key={review.id}
              style={styles.card}
              onPress={() => router.push(`/restaurant/${review.restaurant_id}`)}>
              <Text style={styles.restaurant}>{review.restaurant_name}</Text>
              <Text style={styles.meta}>
                {renderStarRow(review.rating)}
                {review.review_kind === 'online_order' ? ' · Teslimat' : ' · Mekan'}
                {review.created_at ? ` · ${formatReviewDate(review.created_at)}` : ''}
              </Text>
              {review.review_text.trim() ? (
                <Text style={styles.preview} numberOfLines={3}>
                  {review.review_text}
                </Text>
              ) : (
                <Text style={styles.previewMuted}>Metin yok</Text>
              )}
              {(review.image_urls?.length ?? 0) > 0 ? (
                <Text style={styles.photoHint}>📸 {review.image_urls!.length} fotograf</Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: GastroColors.text, fontSize: 24, fontWeight: '800' },
  sub: { color: GastroColors.muted, fontSize: 13, marginTop: 4, marginBottom: 16 },
  loader: { marginTop: 24 },
  list: { gap: 10 },
  card: {
    backgroundColor: GastroColors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GastroColors.border,
    padding: 14,
    gap: 6,
  },
  restaurant: { color: GastroColors.text, fontSize: 16, fontWeight: '700' },
  meta: { color: GastroColors.muted, fontSize: 12 },
  preview: { color: GastroColors.text, fontSize: 14, lineHeight: 20 },
  previewMuted: { color: GastroColors.muted, fontSize: 13, fontStyle: 'italic' },
  photoHint: { color: GastroColors.muted, fontSize: 12 },
  empty: { gap: 8, marginTop: 12 },
  emptyText: { color: GastroColors.muted, marginTop: 12 },
  error: { color: GastroColors.bad, fontSize: 14 },
  retry: { color: GastroColors.accent, fontWeight: '700' },
  cta: { marginTop: 12 },
  ctaText: { color: GastroColors.accent, fontWeight: '700' },
});
