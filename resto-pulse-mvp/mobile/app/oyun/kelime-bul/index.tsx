import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { EglenceGameLobbyTitle } from '@/components/eglence/EglenceGameLobbyTitle';
import { eglenceLobbyTheme, EglenceGameLobbyScreen } from '@/components/eglence/EglenceGameLobbyScreen';
import { JetonEarnSheet } from '@/components/eglence/JetonEarnSheet';
import { KelimeBulInsufficientGcModal } from '@/components/kelime-bul/KelimeBulInsufficientGcModal';
import {
  KELIME_BUL_GC_MALIYET,
  KELIME_BUL_GUNLUK_UCRETSIZ,
  KELIME_BUL_LIMIT_DISABLED,
} from '@/constants/kelime-bul';
import { GASTROCOIN_SHORT } from '@/constants/gastrocoin-theme';
import { useSession } from '@/context/session-context';
import { getJetonWallet } from '@/lib/api';
import { startKelimeBulSession, showKelimeBulLoginAlert } from '@/lib/kelime-bul/play-access';
import {
  clearGuestPlayCount,
  guestFreeRemaining,
  loadKelimeBulAccountMeta,
  loadKelimeBulLobbyMeta,
  loadKelimeBulSession,
  saveKelimeBulAccountMeta,
} from '@/lib/kelime-bul/storage';
import { formatNextResetHint, formatPuzzlePeriodLabel, activePuzzleId } from '@/lib/mini-sudoku/schedule';

export default function KelimeBulLobbyScreen() {
  const router = useRouter();
  const { user } = useSession();
  const t = eglenceLobbyTheme('kelime-bul');
  const { t: tr } = useTranslation();
  const periodId = activePuzzleId();
  const [inProgress, setInProgress] = useState(false);
  const [guestPlays, setGuestPlays] = useState(0);
  const [freeRemaining, setFreeRemaining] = useState<number | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [gcModal, setGcModal] = useState(false);
  const [earnSheet, setEarnSheet] = useState(false);

  const refreshMeta = useCallback(async () => {
    const accountFree = user?.email ? await loadKelimeBulAccountMeta(periodId) : null;
    const meta = await loadKelimeBulLobbyMeta({ accountFreeRemaining: accountFree });
    setInProgress(meta.inProgress);
    setGuestPlays(meta.guestPlaysToday);
    setFreeRemaining(accountFree);
    if (user?.email) {
      try {
        const wallet = await getJetonWallet(user.email);
        setBalance(wallet.balance);
      } catch {
        setBalance(null);
      }
    } else {
      setBalance(null);
    }
  }, [periodId, user?.email]);

  useFocusEffect(
    useCallback(() => {
      void refreshMeta();
    }, [refreshMeta]),
  );

  useEffect(() => {
    if (user?.email) {
      void clearGuestPlayCount();
    }
  }, [user?.email]);

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
          opacity: starting ? 0.7 : 1,
        },
        butonYazi: { fontSize: 17, fontWeight: '800', color: '#fff' },
      }),
    [starting, t],
  );

  const guestFree = guestFreeRemaining(guestPlays);
  const butonYazi = inProgress ? tr('eglence.common.devamEt') : tr('eglence.common.oyna');

  const hakMetni = KELIME_BUL_LIMIT_DISABLED
    ? tr('eglence.kelimeBul.devMod')
    : user?.email
      ? freeRemaining != null
        ? tr('eglence.kelimeBul.freeRemaining', { n: freeRemaining })
        : tr('eglence.kelimeBul.dailyFree', { n: KELIME_BUL_GUNLUK_UCRETSIZ, cost: KELIME_BUL_GC_MALIYET, gc: GASTROCOIN_SHORT })
      : tr('eglence.kelimeBul.guestFree', { n: guestFree, cost: KELIME_BUL_GC_MALIYET, gc: GASTROCOIN_SHORT });

  async function onPlayPress() {
    if (starting) return;
    if (inProgress) {
      const session = await loadKelimeBulSession();
      if (session?.puzzleId) {
        router.push(`/oyun/kelime-bul/oyun?puzzleId=${session.puzzleId}` as Href);
      }
      return;
    }

    setStarting(true);
    try {
      const result = await startKelimeBulSession({
        userEmail: user?.email,
        isLoggedIn: Boolean(user?.email),
      });
      if (!result.ok) {
        if (result.reason === 'login_required') {
          showKelimeBulLoginAlert(() => router.push('/(tabs)/hesap' as Href));
          return;
        }
        if (result.reason === 'insufficient_gc') {
          setBalance(result.balance ?? balance);
          setGcModal(true);
          return;
        }
        Alert.alert('', tr('eglence.kelimeBul.baglantıHatasi'));
        return;
      }
      router.push(`/oyun/kelime-bul/oyun?puzzleId=${result.puzzleId}` as Href);
      if (result.freeRemaining != null) {
        await saveKelimeBulAccountMeta({ periodId, freeRemaining: result.freeRemaining });
        setFreeRemaining(result.freeRemaining);
      }
    } finally {
      setStarting(false);
    }
  }

  return (
    <>
      <EglenceGameLobbyScreen gameId="kelime-bul" scroll={false} edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <EglenceGameLobbyTitle gameId="kelime-bul" title={tr('eglence.kelimeBul.title')} />
          <Text style={styles.alt}>{tr('eglence.kelimeBul.subtitle')}</Text>

          <View style={styles.schedulePill}>
            <Text style={styles.scheduleTitle}>{formatPuzzlePeriodLabel(periodId)}</Text>
            <Text style={styles.scheduleHint}>{formatNextResetHint()}</Text>
          </View>

          <View style={styles.kutu}>
            <Text style={styles.madde}>{tr('eglence.kelimeBul.rule1')}</Text>
            <Text style={styles.madde}>{tr('eglence.kelimeBul.rule2')}</Text>
            <Text style={styles.madde}>{hakMetni}</Text>
          </View>

          <Pressable style={styles.buton} onPress={() => void onPlayPress()} disabled={starting}>
            {starting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.butonYazi}>{butonYazi}</Text>
            )}
          </Pressable>
        </ScrollView>
      </EglenceGameLobbyScreen>

      <KelimeBulInsufficientGcModal
        visible={gcModal}
        balance={balance}
        onClose={() => setGcModal(false)}
        onEarnPress={() => {
          setGcModal(false);
          setEarnSheet(true);
        }}
      />
      <JetonEarnSheet
        visible={earnSheet}
        balance={balance}
        onClose={() => setEarnSheet(false)}
        referrerId={user?.id}
      />
    </>
  );
}
