import { EglenceCollapsibleLeaderboard } from '@/components/eglence/EglenceCollapsibleLeaderboard';
import { EglenceGameLobbyTitle } from '@/components/eglence/EglenceGameLobbyTitle';
import { EglenceZorlukSecici } from '@/components/eglence/EglenceZorlukSecici';
import { eglenceLobbyTheme, EglenceGameLobbyScreen } from '@/components/eglence/EglenceGameLobbyScreen';
import { SofraDatePicker } from '@/components/kelime-sofrasi/SofraDatePicker';
import type { EglenceZorluk } from '@/constants/eglence-zorluk';
import { sofraKelimeHedefEtiket, sofraPuzzleKey } from '@/constants/eglence-zorluk';
import { SOFRA_GUNLUK_TAMAMLAMA_LIMIT_PROD } from '@/constants/kelime-sofrasi';
import { useSession } from '@/context/session-context';
import { fetchArchiveUnlocks, unlockArchiveDay } from '@/lib/eglence-archive-api';
import { warmEglenceGame } from '@/lib/eglence-warm';
import {
  prefetchSofraBackgroundForPuzzle,
  prefetchSofraOtherZorluklarIdle,
  prefetchSofraPuzzlesForToday,
  ensureSofraPuzzleAsync,
} from '@/lib/kelime-sofrasi/puzzle-cache';
import { isSofraArchiveDay } from '@/lib/kelime-sofrasi/sofra-archive';
import { loadSofraMetaStatus, resolveSofraSessionTur } from '@/lib/kelime-sofrasi/storage';
import type { SofraPuzzle } from '@/lib/kelime-sofrasi/types';
import { activePuzzleId, formatNextResetHint, formatPuzzlePeriodLabel } from '@/lib/mini-sudoku/schedule';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function KelimeSofrasiLobbyScreen() {
  const router = useRouter();
  const { user } = useSession();
  const t = eglenceLobbyTheme('kelime-sofrasi');
  const { t: tr } = useTranslation();
  const [selectedGunId, setSelectedGunId] = useState(() => activePuzzleId());
  const [zorluk, setZorluk] = useState<EglenceZorluk>('orta');
  const [puzzle, setPuzzle] = useState<SofraPuzzle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const [tamamlamaSayisi, setTamamlamaSayisi] = useState(0);
  const [limitDoldu, setLimitDoldu] = useState(false);
  const [unlockedGunIds, setUnlockedGunIds] = useState<Set<string>>(() => new Set());

  const refreshUnlocks = useCallback(() => {
    if (!user?.email) {
      setUnlockedGunIds(new Set());
      return;
    }
    void fetchArchiveUnlocks(user.email, 'kelime_sofrasi').then((res) => {
      if (res) setUnlockedGunIds(new Set(res.gun_ids));
    });
  }, [user?.email]);

  useFocusEffect(
    useCallback(() => {
      refreshUnlocks();
    }, [refreshUnlocks]),
  );

  const handleRequestUnlock = useCallback(
    async (gunId: string) => {
      if (!user?.email) return false;
      try {
        const res = await unlockArchiveDay({
          userEmail: user.email,
          game: 'kelime_sofrasi',
          gunId,
        });
        if (res.ok) {
          setUnlockedGunIds((prev) => new Set(prev).add(gunId));
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [user?.email],
  );

  useEffect(() => {
    void loadSofraMetaStatus(selectedGunId, zorluk).then((meta) => {
      setTamamlamaSayisi(meta.tamamlamaSayisi);
      setLimitDoldu(meta.completed);
    });
  }, [selectedGunId, zorluk]);

  useFocusEffect(
    useCallback(() => {
      void loadSofraMetaStatus(selectedGunId, zorluk).then((meta) => {
        setTamamlamaSayisi(meta.tamamlamaSayisi);
        setLimitDoldu(meta.completed);
      });
    }, [selectedGunId, zorluk]),
  );

  useEffect(() => {
    let cancelled = false;
    setPuzzle(null);
    setLoadError(null);
    warmEglenceGame('kelime-sofrasi');

    void (async () => {
      try {
        const tur = await resolveSofraSessionTur(selectedGunId, zorluk);
        if (cancelled) return;
        prefetchSofraPuzzlesForToday(selectedGunId, zorluk);
        const loaded = await ensureSofraPuzzleAsync(selectedGunId, zorluk, tur, user?.email);
        if (cancelled) return;
        setPuzzle(loaded);
        prefetchSofraBackgroundForPuzzle(loaded.id);
      } catch (err) {
        if (!cancelled) {
          setLoadError(tr('eglence.kelimeSofrasi.loadErrorHint'));
          if (__DEV__) console.warn('[sofra-lobby]', err);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedGunId, zorluk, retryTick, user?.email]);

  useEffect(() => {
    if (puzzle?.zorluk === zorluk) {
      prefetchSofraOtherZorluklarIdle(selectedGunId, zorluk);
    }
  }, [puzzle?.zorluk, selectedGunId, zorluk]);

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

  const hedefKelime = sofraKelimeHedefEtiket(zorluk);
  // Arkadaş tablosu: aynı gün+zorluk için tüm turların en iyi süresi (backend birleştirir).
  const leaderboardPeriodKey = sofraPuzzleKey(selectedGunId, zorluk, 0);
  const sofraHazir = puzzle?.zorluk === zorluk;
  const kalanTur = Math.max(0, SOFRA_GUNLUK_TAMAMLAMA_LIMIT_PROD - tamamlamaSayisi);
  const oyunAcik = sofraHazir && !limitDoldu;
  const archiveDay = isSofraArchiveDay(selectedGunId);

  const handlePrimaryPress = () => {
    if (loadError) {
      setRetryTick((n) => n + 1);
      return;
    }
    router.push(
      `/oyun/kelime-sofrasi/oyun?zorluk=${zorluk}&gun_id=${selectedGunId}` as Href,
    );
  };

  return (
    <EglenceGameLobbyScreen gameId="kelime-sofrasi" scroll={false} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <EglenceGameLobbyTitle gameId="kelime-sofrasi" title={tr('eglence.kelimeSofrasi.title')} />
        <Text style={styles.alt}>{tr('eglence.kelimeSofrasi.subtitle')}</Text>

        <SofraDatePicker
          value={selectedGunId}
          onChange={setSelectedGunId}
          userEmail={user?.email}
          unlockedGunIds={unlockedGunIds}
          onRequestUnlock={handleRequestUnlock}
        />

        <View style={styles.schedulePill}>
          <Text style={styles.scheduleTitle}>
            {archiveDay ? tr('eglence.kelimeSofrasi.arsivGunu') : formatPuzzlePeriodLabel(selectedGunId)}
          </Text>
          <Text style={styles.scheduleHint}>
            {archiveDay
              ? `${formatPuzzlePeriodLabel(selectedGunId)} · ${tr('eglence.kelimeSofrasi.gecmisSofra')}`
              : formatNextResetHint()}
          </Text>
        </View>

        <EglenceZorlukSecici mode="sofra" value={zorluk} onChange={setZorluk} gameId="kelime-sofrasi" />

        <View style={styles.kutu}>
          <Text style={styles.kutuBaslik}>{tr('eglence.kelimeSofrasi.kurallar')}</Text>
          <Text style={styles.madde}>{tr('eglence.kelimeSofrasi.kural1')}</Text>
          <Text style={styles.madde}>
            {tr('eglence.kelimeSofrasi.kural2Base', { hedef: hedefKelime })}
            {puzzle
              ? tr('eglence.kelimeSofrasi.kural2Loaded', { wheel: puzzle.wheel.length, bonus: puzzle.bonusKelimeler.length })
              : loadError
                ? ` ${loadError}`
                : tr('eglence.kelimeSofrasi.kural2Loading')}
          </Text>
          <Text style={styles.madde}>{tr('eglence.kelimeSofrasi.kural3')}</Text>
          <Text style={styles.madde}>
            {tr('eglence.kelimeSofrasi.kural4Base', { max: SOFRA_GUNLUK_TAMAMLAMA_LIMIT_PROD })}
            {limitDoldu
              ? tr('eglence.kelimeSofrasi.kural4Doldu')
              : kalanTur > 0 && kalanTur < SOFRA_GUNLUK_TAMAMLAMA_LIMIT_PROD
                ? tr('eglence.kelimeSofrasi.kural4Kalan', { n: kalanTur })
                : ''}
          </Text>
          <Text style={styles.madde}>{formatNextResetHint()}</Text>
        </View>

        <EglenceCollapsibleLeaderboard
          game="kelime_sofrasi"
          periodKey={leaderboardPeriodKey}
          gameId="kelime-sofrasi"
        />

        <Pressable
          style={[styles.buton, !oyunAcik && !loadError ? styles.butonDisabled : null]}
          disabled={!oyunAcik && !loadError}
          onPress={handlePrimaryPress}>
          <Text style={styles.butonYazi}>
            {limitDoldu
              ? tr('eglence.kelimeSofrasi.btnLimitDoldu')
              : loadError
                ? tr('eglence.kelimeSofrasi.btnTekrarDene')
                : sofraHazir
                  ? kalanTur > 0 && kalanTur < SOFRA_GUNLUK_TAMAMLAMA_LIMIT_PROD
                    ? tr('eglence.kelimeSofrasi.btnOturKalan', { n: kalanTur })
                    : tr('eglence.kelimeSofrasi.btnOtur')
                  : tr('eglence.kelimeSofrasi.btnHazırlaniyor')}
          </Text>
        </Pressable>

        {loadError ? (
          <Text style={[styles.alt, { color: '#f87171' }]}>
            {__DEV__
              ? `${loadError} · Dönem: ${selectedGunId}`
              : tr('eglence.kelimeSofrasi.loadErrorHint')}
          </Text>
        ) : null}
      </ScrollView>
    </EglenceGameLobbyScreen>
  );
}
