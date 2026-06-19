import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EglenceZorlukSecici } from '@/components/eglence/EglenceZorlukSecici';
import { Screen } from '@/components/ui/Screen';
import type { EglenceZorluk } from '@/constants/eglence-zorluk';
import { SOFRA_KELIME_HEDEF } from '@/constants/eglence-zorluk';
import { SOFRA_GUNLUK_TAMAMLAMA_LIMIT } from '@/constants/kelime-sofrasi';
import { useGastroTheme } from '@/context/theme-context';
import {
  prefetchSofraOtherZorluklarIdle,
  prefetchSofraPuzzlesForToday,
  scheduleSofraPuzzleWarm,
} from '@/lib/kelime-sofrasi/puzzle-cache';
import { loadSofraMetaStatus } from '@/lib/kelime-sofrasi/storage';
import type { SofraPuzzle } from '@/lib/kelime-sofrasi/types';
import { activePuzzleId, formatNextResetHint, formatPuzzlePeriodLabel } from '@/lib/mini-sudoku/schedule';

export default function KelimeSofrasiLobbyScreen() {
  const router = useRouter();
  const { colors } = useGastroTheme();
  const puzzleId = activePuzzleId();
  const [zorluk, setZorluk] = useState<EglenceZorluk>('orta');
  const [puzzle, setPuzzle] = useState<SofraPuzzle | null>(null);
  const [tamamlamaSayisi, setTamamlamaSayisi] = useState(0);
  const [limitDoldu, setLimitDoldu] = useState(false);

  useEffect(() => {
    void loadSofraMetaStatus(puzzleId).then((meta) => {
      setTamamlamaSayisi(meta.tamamlamaSayisi);
      setLimitDoldu(meta.completed);
    });
  }, [puzzleId]);

  useFocusEffect(
    useCallback(() => {
      void loadSofraMetaStatus(puzzleId).then((meta) => {
        setTamamlamaSayisi(meta.tamamlamaSayisi);
        setLimitDoldu(meta.completed);
      });
    }, [puzzleId]),
  );

  useEffect(() => {
    setPuzzle(null);
    prefetchSofraPuzzlesForToday(puzzleId, zorluk);
    return scheduleSofraPuzzleWarm(puzzleId, zorluk, setPuzzle);
  }, [puzzleId, zorluk]);

  useEffect(() => {
    if (puzzle?.zorluk === zorluk) {
      prefetchSofraOtherZorluklarIdle(puzzleId, zorluk);
    }
  }, [puzzle?.zorluk, puzzleId, zorluk]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: { padding: 16, gap: 16, paddingBottom: 32 },
        topBack: {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: 2,
        },
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
        butonDisabled: { opacity: 0.45 },
        butonYazi: { fontSize: 17, fontWeight: '800', color: '#fff' },
      }),
    [colors],
  );

  const hedefKelime = SOFRA_KELIME_HEDEF[zorluk];
  const sofraHazir = puzzle?.zorluk === zorluk;
  const kalanTur = Math.max(0, SOFRA_GUNLUK_TAMAMLAMA_LIMIT - tamamlamaSayisi);
  const oyunAcik = sofraHazir && !limitDoldu;

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          style={styles.topBack}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/eglence' as Href);
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Geri">
          <Ionicons name="chevron-back" size={22} color={colors.accent} />
          <Text style={styles.topBackText}>Geri</Text>
        </Pressable>

        <Text style={styles.baslik}>Kelime Sofrası</Text>
        <Text style={styles.alt}>Harf çarkı · çapraz kelime · reklamsız</Text>

        <View style={styles.schedulePill}>
          <Text style={styles.scheduleTitle}>{formatPuzzlePeriodLabel(puzzleId)}</Text>
          <Text style={styles.scheduleHint}>{formatNextResetHint()}</Text>
        </View>

        <EglenceZorlukSecici mode="sofra" value={zorluk} onChange={setZorluk} />

        <View style={styles.kutu}>
          <Text style={styles.kutuBaslik}>Kurallar</Text>
          <Text style={styles.madde}>Harf çarkından kelime oluştur — her harf bir kez kullanılır.</Text>
          <Text style={styles.madde}>
            Bu seviyede {hedefKelime} ızgara kelimesi.
            {puzzle
              ? ` Çarkta ${puzzle.wheel.length} harf, ${puzzle.bonusKelimeler.length} bonus kelime.`
              : ' Sofra hazırlanıyor…'}
          </Text>
          <Text style={styles.madde}>Takılırsan İpucu ile ızgarada rastgele bir harf açılır.</Text>
          <Text style={styles.madde}>
            Aynı günlük sofrayı günde {SOFRA_GUNLUK_TAMAMLAMA_LIMIT} kez bitirebilirsin.
            {limitDoldu
              ? ' Bugünlük hakkın doldu.'
              : kalanTur < SOFRA_GUNLUK_TAMAMLAMA_LIMIT
                ? ` Kalan: ${kalanTur} tur.`
                : ''}
          </Text>
          <Text style={styles.madde}>{formatNextResetHint()}</Text>
        </View>

        <Pressable
          style={[styles.buton, !oyunAcik ? styles.butonDisabled : null]}
          disabled={!oyunAcik}
          onPress={() => router.push(`/oyun/kelime-sofrasi/oyun?zorluk=${zorluk}` as Href)}>
          <Text style={styles.butonYazi}>
            {limitDoldu
              ? 'Bugünlük hak doldu'
              : sofraHazir
                ? kalanTur < SOFRA_GUNLUK_TAMAMLAMA_LIMIT
                  ? `Sofraya Otur (${kalanTur} tur kaldı)`
                  : 'Sofraya Otur'
                : 'Sofra hazırlanıyor…'}
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
