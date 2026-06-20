import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EglenceGameLobbyTitle } from '@/components/eglence/EglenceGameLobbyTitle';
import { eglenceLobbyTheme, EglenceGameLobbyScreen } from '@/components/eglence/EglenceGameLobbyScreen';
import { formatNextResetHint, formatPuzzlePeriodLabel, activePuzzleId } from '@/lib/mini-sudoku/schedule';

export default function GunlukKelimeLobbyScreen() {
  const router = useRouter();
  const t = eglenceLobbyTheme('gunluk-kelime');
  const puzzleId = activePuzzleId();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: { padding: 16, gap: 16, paddingBottom: 32 },
        alt: { fontSize: 14, color: t.muted, textAlign: 'center', lineHeight: 20 },
        kutu: {
          backgroundColor: t.panel,
          borderRadius: 12,
          padding: 16,
          gap: 8,
          borderWidth: 1,
          borderColor: t.border,
        },
        madde: { fontSize: 14, color: t.muted, lineHeight: 20 },
        schedulePill: {
          backgroundColor: t.accentSoft,
          borderWidth: 1,
          borderColor: t.borderStrong,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          gap: 4,
        },
        scheduleTitle: { color: t.text, fontSize: 13, fontWeight: '800' },
        scheduleHint: { color: t.muted, fontSize: 12, lineHeight: 17 },
        buton: {
          backgroundColor: t.accent,
          borderRadius: 12,
          paddingVertical: 16,
          alignItems: 'center',
        },
        butonYazi: { fontSize: 17, fontWeight: '800', color: '#fff' },
      }),
    [t],
  );

  return (
    <EglenceGameLobbyScreen gameId="gunluk-kelime" scroll={false} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <EglenceGameLobbyTitle gameId="gunluk-kelime" title="Günlük Kelime" />
        <Text style={styles.alt}>Wordle tarzı · 5 harf · 6 deneme · her gün tek kelime</Text>

        <View style={styles.schedulePill}>
          <Text style={styles.scheduleTitle}>{formatPuzzlePeriodLabel(puzzleId)}</Text>
          <Text style={styles.scheduleHint}>{formatNextResetHint()}</Text>
        </View>

        <View style={styles.kutu}>
          <Text style={styles.madde}>🟩 Doğru yer · 🟨 Yanlış yer · ⬛ Yok</Text>
          <Text style={styles.madde}>TDK havuzundan 5 harfli Türkçe kelimeler.</Text>
        </View>

        <Pressable style={styles.buton} onPress={() => router.push('/oyun/gunluk-kelime/oyun')}>
          <Text style={styles.butonYazi}>Oyna</Text>
        </Pressable>
      </ScrollView>
    </EglenceGameLobbyScreen>
  );
}
