import { EglenceGameLobbyTitle } from '@/components/eglence/EglenceGameLobbyTitle';
import { EglenceZorlukSecici } from '@/components/eglence/EglenceZorlukSecici';
import { eglenceLobbyTheme, EglenceGameLobbyScreen } from '@/components/eglence/EglenceGameLobbyScreen';
import type { EglenceZorluk } from '@/constants/eglence-zorluk';
import { SOFRA_KELIME_HEDEF } from '@/constants/eglence-zorluk';
import { SOFRA_GUNLUK_TAMAMLAMA_LIMIT } from '@/constants/kelime-sofrasi';
import {
  prefetchSofraOtherZorluklarIdle,
  prefetchSofraPuzzlesForToday,
  ensureSofraPuzzleAsync,
} from '@/lib/kelime-sofrasi/puzzle-cache';
import { loadSofraMetaStatus } from '@/lib/kelime-sofrasi/storage';
import type { SofraPuzzle } from '@/lib/kelime-sofrasi/types';
import { activePuzzleId, formatNextResetHint, formatPuzzlePeriodLabel } from '@/lib/mini-sudoku/schedule';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function KelimeSofrasiLobbyScreen() {
  const router = useRouter();
  const t = eglenceLobbyTheme('kelime-sofrasi');
  const puzzleId = activePuzzleId();
  const [zorluk, setZorluk] = useState<EglenceZorluk>('orta');
  const [puzzle, setPuzzle] = useState<SofraPuzzle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const [tamamlamaSayisi, setTamamlamaSayisi] = useState(0);
  const [limitDoldu, setLimitDoldu] = useState(false);

  useEffect(() => {
    void loadSofraMetaStatus(puzzleId, zorluk).then((meta) => {
      setTamamlamaSayisi(meta.tamamlamaSayisi);
      setLimitDoldu(meta.completed);
    });
  }, [puzzleId, zorluk]);

  useFocusEffect(
    useCallback(() => {
      void loadSofraMetaStatus(puzzleId, zorluk).then((meta) => {
        setTamamlamaSayisi(meta.tamamlamaSayisi);
        setLimitDoldu(meta.completed);
      });
    }, [puzzleId, zorluk]),
  );

  useEffect(() => {
    let cancelled = false;
    setPuzzle(null);
    setLoadError(null);
    prefetchSofraPuzzlesForToday(puzzleId, zorluk);

    void ensureSofraPuzzleAsync(puzzleId, zorluk, 0)
      .then((loaded) => {
        if (!cancelled) setPuzzle(loaded);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError('Bulmaca yüklenemedi. İnterneti kontrol edip tekrar dene.');
          if (__DEV__) console.warn('[sofra-lobby]', err);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [puzzleId, zorluk, retryTick]);

  useEffect(() => {
    if (puzzle?.zorluk === zorluk) {
      prefetchSofraOtherZorluklarIdle(puzzleId, zorluk);
    }
  }, [puzzle?.zorluk, puzzleId, zorluk]);

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
        kutuBaslik: { fontSize: 16, fontWeight: '700', color: t.text },
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
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        },
        butonDisabled: { opacity: 0.45 },
        butonYazi: { fontSize: 17, fontWeight: '800', color: '#fff' },
      }),
    [t],
  );

  const hedefKelime = SOFRA_KELIME_HEDEF[zorluk];
  const sofraHazir = puzzle?.zorluk === zorluk;
  const kalanTur = Math.max(0, SOFRA_GUNLUK_TAMAMLAMA_LIMIT - tamamlamaSayisi);
  const oyunAcik = sofraHazir && !limitDoldu;

  const handlePrimaryPress = () => {
    if (loadError) {
      setRetryTick((n) => n + 1);
      return;
    }
    router.push(`/oyun/kelime-sofrasi/oyun?zorluk=${zorluk}` as Href);
  };

  return (
    <EglenceGameLobbyScreen gameId="kelime-sofrasi" scroll={false} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <EglenceGameLobbyTitle gameId="kelime-sofrasi" title="Kelime Sofrası" />
        <Text style={styles.alt}>Harf çarkı · çapraz kelime · reklamsız</Text>

        <View style={styles.schedulePill}>
          <Text style={styles.scheduleTitle}>{formatPuzzlePeriodLabel(puzzleId)}</Text>
          <Text style={styles.scheduleHint}>{formatNextResetHint()}</Text>
        </View>

        <EglenceZorlukSecici mode="sofra" value={zorluk} onChange={setZorluk} gameId="kelime-sofrasi" />

        <View style={styles.kutu}>
          <Text style={styles.kutuBaslik}>Kurallar</Text>
          <Text style={styles.madde}>Harf çarkından kelime oluştur — her harf bir kez kullanılır.</Text>
          <Text style={styles.madde}>
            Bu seviyede {hedefKelime} ızgara kelimesi.
            {puzzle
              ? ` Çarkta ${puzzle.wheel.length} harf, ${puzzle.bonusKelimeler.length} bonus kelime.`
              : loadError
                ? ` ${loadError}`
                : ' Sofra hazırlanıyor…'}
          </Text>
          <Text style={styles.madde}>Takılırsan İpucu ile ızgarada rastgele bir harf açılır.</Text>
          <Text style={styles.madde}>
            Her turda yeni kelimeler ve düzen gelir. Günde {SOFRA_GUNLUK_TAMAMLAMA_LIMIT} tur oynayabilirsin.
            {limitDoldu
              ? ' Bugünlük hakkın doldu.'
              : kalanTur < SOFRA_GUNLUK_TAMAMLAMA_LIMIT
                ? ` Kalan: ${kalanTur} tur.`
                : ''}
          </Text>
          <Text style={styles.madde}>{formatNextResetHint()}</Text>
        </View>

        <Pressable
          style={[styles.buton, !oyunAcik && !loadError ? styles.butonDisabled : null]}
          disabled={!oyunAcik && !loadError}
          onPress={handlePrimaryPress}>
          <Text style={styles.butonYazi}>
            {limitDoldu
              ? 'Bugünlük hak doldu'
              : loadError
                ? 'Tekrar dene'
                : sofraHazir
                  ? kalanTur < SOFRA_GUNLUK_TAMAMLAMA_LIMIT
                    ? `Sofraya Otur (${kalanTur} tur kaldı)`
                    : 'Sofraya Otur'
                  : 'Sofra hazırlanıyor…'}
          </Text>
        </Pressable>

        {loadError ? (
          <Text style={[styles.alt, { color: '#f87171' }]}>
            Dönem: {puzzleId} · API: {process.env.EXPO_PUBLIC_API_URL ?? 'https://api.gastroskor.com.tr'}
          </Text>
        ) : null}
      </ScrollView>
    </EglenceGameLobbyScreen>
  );
}
