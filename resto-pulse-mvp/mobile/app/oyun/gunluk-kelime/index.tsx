import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { EglenceGameLobbyTitle } from '@/components/eglence/EglenceGameLobbyTitle';
import { eglenceLobbyTheme, EglenceGameLobbyScreen } from '@/components/eglence/EglenceGameLobbyScreen';
import { EGLENCE_GUNLUK_TEK_OYUN } from '@/constants/eglence-games';
import { warmEglenceGame } from '@/lib/eglence-warm';
import { loadGunlukKelimeMetaStatus } from '@/lib/gunluk-kelime/storage';
import { formatNextResetHint, formatPuzzlePeriodLabel, activePuzzleId } from '@/lib/mini-sudoku/schedule';
import { useFocusEffect } from '@react-navigation/native';

export default function GunlukKelimeLobbyScreen() {
  const router = useRouter();
  const t = eglenceLobbyTheme('gunluk-kelime');
  const { t: tr } = useTranslation();
  const puzzleId = activePuzzleId();
  const [inProgress, setInProgress] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [bestScore, setBestScore] = useState<number | null>(null);

  const refreshMeta = useCallback(() => {
    void loadGunlukKelimeMetaStatus(puzzleId).then((meta) => {
      setInProgress(meta.inProgress);
      setCompleted(meta.completed);
      setBestScore(meta.score ?? null);
    });
  }, [puzzleId]);

  useFocusEffect(
    useCallback(() => {
      refreshMeta();
      warmEglenceGame('gunluk-kelime');
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
        },
        butonYazi: { fontSize: 17, fontWeight: '800', color: '#fff' },
      }),
    [t],
  );

  const oturum =
    completed && EGLENCE_GUNLUK_TEK_OYUN
      ? 'sonuc'
      : inProgress && !completed
        ? 'devam'
        : 'yeni';
  const butonYazi =
    completed && EGLENCE_GUNLUK_TEK_OYUN
      ? tr('eglence.gunlukKelime.sonuclariGor')
      : inProgress && !completed
        ? tr('eglence.common.devamEt')
        : completed
          ? tr('eglence.common.tekrarOyna')
          : tr('eglence.common.oyna');

  return (
    <EglenceGameLobbyScreen gameId="gunluk-kelime" scroll={false} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <EglenceGameLobbyTitle gameId="gunluk-kelime" title={tr('eglence.gunlukKelime.title')} />
        <Text style={styles.alt}>{tr('eglence.gunlukKelime.subtitle')}</Text>

        <View style={styles.schedulePill}>
          <Text style={styles.scheduleTitle}>{formatPuzzlePeriodLabel(puzzleId)}</Text>
          <Text style={styles.scheduleHint}>{formatNextResetHint()}</Text>
        </View>

        <View style={styles.kutu}>
          <Text style={styles.madde}>{tr('eglence.gunlukKelime.legendColors')}</Text>
          <Text style={styles.madde}>{tr('eglence.gunlukKelime.tdk5Harf')}</Text>
          {completed && bestScore != null ? (
            <Text style={styles.madde}>{tr('eglence.gunlukKelime.bugunScore', { score: bestScore })}</Text>
          ) : null}
        </View>

        <Pressable
          style={styles.buton}
          onPress={() => router.push(`/oyun/gunluk-kelime/oyun?oturum=${oturum}`)}>
          <Text style={styles.butonYazi}>{butonYazi}</Text>
        </Pressable>
      </ScrollView>
    </EglenceGameLobbyScreen>
  );
}
