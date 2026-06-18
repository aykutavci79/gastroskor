import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EglenceZorlukSecici } from '@/components/eglence/EglenceZorlukSecici';
import { Screen } from '@/components/ui/Screen';
import type { EglenceZorluk } from '@/constants/eglence-zorluk';
import { useGastroTheme } from '@/context/theme-context';
import { activePuzzleId, formatNextResetHint, formatPuzzlePeriodLabel } from '@/lib/mini-sudoku/schedule';
import { isSudokuZorluk } from '@/lib/mini-sudoku/puzzle-cache';

export default function MiniSudokuLobbyScreen() {
  const router = useRouter();
  const { colors } = useGastroTheme();
  const puzzleId = activePuzzleId();
  const [zorluk, setZorluk] = useState<EglenceZorluk>('orta');

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: { padding: 16, gap: 16, paddingBottom: 32 },
        topBack: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 2 },
        topBackText: { color: colors.accent, fontSize: 16, fontWeight: '700' },
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
        butonOff: { opacity: 0.45 },
        butonYazi: { fontSize: 17, fontWeight: '800', color: '#fff' },
      }),
    [colors],
  );

  const canPlay = isSudokuZorluk(zorluk);

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          style={styles.topBack}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/eglence' as Href);
          }}
          hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.accent} />
          <Text style={styles.topBackText}>Geri</Text>
        </Pressable>

        <Text style={styles.baslik}>Mini Sudoku</Text>
        <Text style={styles.alt}>Günlük bulmaca · satır, sütun ve kutu kuralı</Text>

        <View style={styles.schedulePill}>
          <Text style={styles.scheduleTitle}>{formatPuzzlePeriodLabel(puzzleId)}</Text>
          <Text style={styles.scheduleHint}>{formatNextResetHint()}</Text>
        </View>

        <EglenceZorlukSecici mode="sudoku" value={zorluk} onChange={setZorluk} />

        <View style={styles.kutu}>
          <Text style={styles.madde}>Kolay ve orta: 6×6 tablo — fark başlangıçtaki dolu hücre sayısı.</Text>
          <Text style={styles.madde}>Zor seviye 9×9 yakında eklenecek.</Text>
        </View>

        <Pressable
          style={[styles.buton, !canPlay && styles.butonOff]}
          disabled={!canPlay}
          onPress={() => router.push(`/oyun/mini-sudoku/oyun?zorluk=${zorluk}` as Href)}>
          <Text style={styles.butonYazi}>Bulmacayı Başlat</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
