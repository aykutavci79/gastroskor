import * as Linking from 'expo-linking';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GastroColors } from '@/constants/theme';
import { CATEGORY_LABELS, type LivePlaceDetails, type PlaceAnalysis } from '@/lib/types';

function categoryTitle(key: string): string {
  return CATEGORY_LABELS[key] ?? key;
}

export type GastroScoreSnapshot = {
  gastro_score: number;
  distance_score: number;
  rating_score: number;
  distance_meters: number | null;
  distance_origin: 'user' | 'city_center';
  google_rating: number | null;
};

type Props = {
  live: LivePlaceDetails | null;
  gastroScores: GastroScoreSnapshot | null;
};

function formatDistance(meters: number | null): string {
  if (meters == null) return '—';
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function AiAnalysisBlock({ analysis }: { analysis: PlaceAnalysis }) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>AI Analiz</Text>
      <Text style={styles.blockHint}>
        Google ve GastroSkor yorumları birleştirilerek hazırlandı.
      </Text>
      <Text style={styles.summary}>{analysis.summary}</Text>
      {analysis.categories.map((row) => (
        <View key={row.category} style={styles.aiRow}>
          <View style={styles.aiHead}>
            <Text style={styles.aiLabel}>{categoryTitle(row.category)}</Text>
            <Text style={styles.aiScore}>
              {row.score != null ? `${row.score.toFixed(1)}/10` : '—'}
            </Text>
          </View>
          {row.reason ? <Text style={styles.aiReason}>{row.reason}</Text> : null}
        </View>
      ))}
    </View>
  );
}

export function PlaceDetailInfo({ live, gastroScores }: Props) {
  if (!live && !gastroScores) return null;

  return (
    <View style={styles.wrap}>
      {live?.phone_number || live?.website ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>İletişim</Text>
          {live.phone_number ? (
            <Pressable onPress={() => void Linking.openURL(`tel:${live.phone_number}`)}>
              <Text style={styles.link}>📞 {live.phone_number}</Text>
            </Pressable>
          ) : null}
          {live.website ? (
            <Pressable onPress={() => void Linking.openURL(live.website!)}>
              <Text style={styles.link}>🌐 Web sitesi</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {live?.opening_hours?.weekday_text?.length ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Çalışma saatleri</Text>
          <Text style={styles.blockHint}>
            {live.opening_hours.open_now ? 'Şu an açık' : 'Şu an kapalı'}
          </Text>
          {live.opening_hours.weekday_text.map((line) => (
            <Text key={line} style={styles.hourLine}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}

      {live?.analysis ? <AiAnalysisBlock analysis={live.analysis} /> : null}

      {gastroScores ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>GastroSkor puanı</Text>
          <View style={styles.scoreGrid}>
            <View style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>Toplam</Text>
              <Text style={styles.scoreValueGold}>{gastroScores.gastro_score.toFixed(1)}</Text>
            </View>
            <View style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>Mesafe</Text>
              <Text style={styles.scoreValue}>{gastroScores.distance_score}</Text>
              <Text style={styles.scoreMeta}>
                {formatDistance(gastroScores.distance_meters)} ·{' '}
                {gastroScores.distance_origin === 'user' ? 'konumuna göre' : 'merkeze göre'}
              </Text>
            </View>
            <View style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>Lezzet (yıldız)</Text>
              <Text style={styles.scoreValue}>{gastroScores.rating_score}</Text>
              <Text style={styles.scoreMeta}>
                Google: {gastroScores.google_rating?.toFixed(1) ?? '—'}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {live && (live.member_review_count > 0 || live.member_avg_rating != null) ? (
        <View style={styles.memberStats}>
          <Text style={styles.memberStatsText}>
            GastroSkor üye: {live.member_review_count} yorum
            {live.member_avg_rating != null ? ` · Ort. ${live.member_avg_rating.toFixed(1)}` : ''}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  block: {
    borderWidth: 1,
    borderColor: GastroColors.border,
    borderRadius: 14,
    backgroundColor: GastroColors.input,
    padding: 14,
    gap: 8,
  },
  blockTitle: { color: GastroColors.text, fontSize: 16, fontWeight: '800' },
  blockHint: { color: GastroColors.muted, fontSize: 12, lineHeight: 17 },
  link: { color: GastroColors.accent, fontSize: 14, fontWeight: '600' },
  hourLine: { color: GastroColors.muted, fontSize: 12, lineHeight: 18 },
  summary: { color: GastroColors.text, fontSize: 13, lineHeight: 20 },
  aiRow: {
    borderTopWidth: 1,
    borderTopColor: GastroColors.border,
    paddingTop: 10,
    marginTop: 4,
    gap: 4,
  },
  aiHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  aiLabel: { color: GastroColors.text, fontWeight: '700', fontSize: 13 },
  aiScore: { color: GastroColors.accent, fontWeight: '700', fontSize: 13 },
  aiReason: { color: GastroColors.muted, fontSize: 12, lineHeight: 17 },
  scoreGrid: { gap: 8 },
  scoreCard: {
    borderWidth: 1,
    borderColor: GastroColors.border,
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  scoreLabel: { color: GastroColors.muted, fontSize: 11, fontWeight: '600' },
  scoreValueGold: { color: GastroColors.gold, fontSize: 22, fontWeight: '800' },
  scoreValue: { color: GastroColors.text, fontSize: 18, fontWeight: '700' },
  scoreMeta: { color: GastroColors.muted, fontSize: 11 },
  memberStats: {
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  memberStatsText: { color: GastroColors.accent, fontSize: 13, fontWeight: '600' },
});
