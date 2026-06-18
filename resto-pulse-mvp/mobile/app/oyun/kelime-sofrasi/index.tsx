import { useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { useGastroTheme } from '@/context/theme-context';
import { buildDailySofraPuzzle, todaySofraPuzzleId } from '@/lib/kelime-sofrasi/puzzle';
import { formatNextResetHint, formatPuzzlePeriodLabel } from '@/lib/mini-sudoku/schedule';

export default function KelimeSofrasiLobbyScreen() {
  const router = useRouter();
  const { colors } = useGastroTheme();
  const puzzleId = todaySofraPuzzleId();
  const puzzle = useMemo(() => buildDailySofraPuzzle(puzzleId), [puzzleId]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: { padding: 16, gap: 16, paddingBottom: 32 },
        baslik: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center' },
        alt: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
        kutu: {
          backgroundColor: colors.panel,
          borderRadius: 12,
          padding: 16,
          gap: 8,
          borderWidth: 1,
          borderColor: colors.border,
        },
        kutuBaslik: { fontSize: 16, fontWeight: '700', color: colors.text },
        madde: { fontSize: 14, color: colors.muted, lineHeight: 20 },
        schedulePill: {
          backgroundColor: colors.accentSoft,
          borderWidth: 1,
          borderColor: colors.accent,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          gap: 4,
        },
        scheduleTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
        scheduleHint: { color: colors.muted, fontSize: 12, lineHeight: 17 },
        buton: {
          backgroundColor: colors.accent,
          borderRadius: 12,
          paddingVertical: 16,
          alignItems: 'center',
        },
        butonYazi: { fontSize: 17, fontWeight: '800', color: '#fff' },
      }),
    [colors],
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.baslik}>Kelime Sofrası</Text>
        <Text style={styles.alt}>Words of Wonders tarzı · günlük tek bulmaca · reklamsız</Text>

        <View style={styles.schedulePill}>
          <Text style={styles.scheduleTitle}>{formatPuzzlePeriodLabel(puzzleId)}</Text>
          <Text style={styles.scheduleHint}>{formatNextResetHint()}</Text>
        </View>

        <View style={styles.kutu}>
          <Text style={styles.kutuBaslik}>Kurallar</Text>
          <Text style={styles.madde}>Harf çarkından kelime oluştur — her harf bir kez kullanılır.</Text>
          <Text style={styles.madde}>Izgara üzerindeki tüm kelimeleri bul; kesişen harfler paylaşılır.</Text>
          <Text style={styles.madde}>Minimum {3} harf. Bugünkü sofrada {puzzle.words.length} kelime var.</Text>
          <Text style={styles.madde}>Süre tutulur; Sudoku ile aynı gün 17:00&apos;de yeni sofra.</Text>
        </View>

        <Pressable style={styles.buton} onPress={() => router.push('/oyun/kelime-sofrasi/oyun' as Href)}>
          <Text style={styles.butonYazi}>Sofraya Otur</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
