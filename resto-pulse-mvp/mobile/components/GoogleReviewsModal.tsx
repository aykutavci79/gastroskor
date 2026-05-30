import type { LivePlaceReview } from '@/lib/types';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GastroColors, GastroStyles } from '@/constants/theme';

type Props = {
  visible: boolean;
  title: string | null;
  loading: boolean;
  error: string | null;
  reviews: LivePlaceReview[];
  onClose: () => void;
};

export function GoogleReviewsModal({
  visible,
  title,
  loading,
  error,
  reviews,
  onClose,
}: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={2}>
              {title ?? 'Yorumlar'}
            </Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>Kapat</Text>
            </Pressable>
          </View>
          {loading ? (
            <ActivityIndicator color={GastroColors.accent} style={{ marginVertical: 24 }} />
          ) : null}
          {error ? <Text style={GastroStyles.errorText}>{error}</Text> : null}
          {!loading && !error ? (
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {reviews.length === 0 ? (
                <Text style={styles.empty}>Google yorumu bulunamadi.</Text>
              ) : (
                reviews.slice(0, 8).map((review, idx) => (
                  <View key={`${review.author_name ?? 'a'}-${idx}`} style={styles.review}>
                    <View style={styles.reviewMeta}>
                      <Text style={styles.author}>{review.author_name ?? 'Anonim'}</Text>
                      {review.rating != null ? (
                        <Text style={styles.rating}>{review.rating} yildiz</Text>
                      ) : null}
                      {review.relative_time_description ? (
                        <Text style={styles.time}>{review.relative_time_description}</Text>
                      ) : null}
                    </View>
                    {review.text ? <Text style={styles.text}>{review.text}</Text> : null}
                  </View>
                ))
              )}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '78%',
    backgroundColor: GastroColors.panel,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: GastroColors.border,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flex: 1,
    color: GastroColors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  close: {
    color: GastroColors.accent,
    fontWeight: '700',
    fontSize: 14,
  },
  list: { flexGrow: 0 },
  listContent: { gap: 10, paddingBottom: 8 },
  empty: { color: GastroColors.muted, textAlign: 'center', paddingVertical: 16 },
  review: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.input,
    padding: 12,
    gap: 6,
  },
  reviewMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  author: { color: GastroColors.text, fontWeight: '700', fontSize: 13 },
  rating: { color: GastroColors.gold, fontSize: 12, fontWeight: '700' },
  time: { color: GastroColors.muted, fontSize: 12 },
  text: { color: GastroColors.text, fontSize: 13, lineHeight: 19 },
});
