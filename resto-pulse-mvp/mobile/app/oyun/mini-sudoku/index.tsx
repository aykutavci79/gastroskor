import { useRouter, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EglenceGameLobbyTitle } from '@/components/eglence/EglenceGameLobbyTitle';
import { EglenceZorlukSecici } from '@/components/eglence/EglenceZorlukSecici';
import { eglenceLobbyTheme, EglenceGameLobbyScreen } from '@/components/eglence/EglenceGameLobbyScreen';
import type { EglenceZorluk } from '@/constants/eglence-zorluk';
import { activePuzzleId, formatNextResetHint, formatPuzzlePeriodLabel } from '@/lib/mini-sudoku/schedule';
import { loadSudokuMetaStatus } from '@/lib/mini-sudoku/storage';
import { useFocusEffect } from '@react-navigation/native';

export default function MiniSudokuLobbyScreen() {
  const router = useRouter();
  const t = eglenceLobbyTheme('mini-sudoku');
  const puzzleId = activePuzzleId();
  const [zorluk, setZorluk] = useState<EglenceZorluk>('orta');
  const [inProgress, setInProgress] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [bestScore, setBestScore] = useState<number | null>(null);

  const refreshMeta = useCallback(() => {
    void loadSudokuMetaStatus(puzzleId).then((meta) => {
      setInProgress(meta.inProgress);
      setCompleted(meta.completed);
      setBestScore(meta.score ?? null);
    });
  }, [puzzleId]);

  useFocusEffect(
    useCallback(() => {
      refreshMeta();
    }, [refreshMeta]),
  );

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
          shadowColor: t.accent,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 6,
        },
        butonYazi: { fontSize: 17, fontWeight: '800', color: '#fff' },
        scoreHint: { color: t.muted, fontSize: 13, textAlign: 'center' },
      }),
    [t],
  );

  const oturum = inProgress && !completed ? 'devam' : 'yeni';
  const butonYazi =
    inProgress && !completed ? 'Devam Et' : completed ? 'Tekrar Oyna' : 'Bulmacayı Başlat';

  return (
    <EglenceGameLobbyScreen gameId="mini-sudoku" scroll={false} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <EglenceGameLobbyTitle gameId="mini-sudoku" title="Sudoku" />
        <Text style={styles.alt}>Klasik 9×9 · günlük bulmaca · satır, sütun ve 3×3 kutu kuralı</Text>

        <View style={styles.schedulePill}>
          <Text style={styles.scheduleTitle}>{formatPuzzlePeriodLabel(puzzleId)}</Text>
          <Text style={styles.scheduleHint}>{formatNextResetHint()}</Text>
        </View>

        <EglenceZorlukSecici mode="sudoku" value={zorluk} onChange={setZorluk} gameId="mini-sudoku" />

        <View style={styles.kutu}>
          <Text style={styles.madde}>Kolay, orta ve zor: aynı 9×9 tablo — fark başlangıçtaki dolu hücre sayısı.</Text>
          <Text style={styles.madde}>Not modu ile aday rakamları işaretleyebilirsin.</Text>
          {completed && bestScore != null ? (
            <Text style={styles.madde}>Bugünkü skorun: {bestScore} puan</Text>
          ) : null}
        </View>

        <Pressable
          style={styles.buton}
          onPress={() =>
            router.push(`/oyun/mini-sudoku/oyun?zorluk=${zorluk}&oturum=${oturum}` as Href)
          }>
          <Text style={styles.butonYazi}>{butonYazi}</Text>
        </Pressable>
      </ScrollView>
    </EglenceGameLobbyScreen>
  );
}
