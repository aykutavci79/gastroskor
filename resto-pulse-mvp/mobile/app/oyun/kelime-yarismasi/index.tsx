import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { InteractionManager, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { EglenceGameLobbyTitle } from '@/components/eglence/EglenceGameLobbyTitle';
import { eglenceLobbyTheme, EglenceGameLobbyScreen } from '@/components/eglence/EglenceGameLobbyScreen';
import { warmEglenceGame } from '@/lib/eglence-warm';
import {
  CEVAP_SURE_MS,
  JOKER_SURE_BONUS_MS,
  TUR_SAYISI,
} from '@/constants/kelime-yarismasi';
export default function KelimeYarismasiLobbyScreen() {
  const router = useRouter();
  const t = eglenceLobbyTheme('kelime-yarismasi');
  const { t: tr } = useTranslation();
  const [bos, setBos] = useState<boolean | null>(null);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      warmEglenceGame('kelime-yarismasi');
      void import('@/lib/kelime-yarismasi/soru-paketi').then((m) => {
        setBos(m.soruBankasiBosMu());
      });
    });
    return () => task.cancel();
  }, []);

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
        buton: {
          backgroundColor: t.accent,
          borderRadius: 12,
          paddingVertical: 16,
          alignItems: 'center',
          shadowColor: t.accent,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.28,
          shadowRadius: 8,
          elevation: 6,
        },
        butonPasif: { opacity: 0.45 },
        butonYazi: { fontSize: 17, fontWeight: '800', color: '#fff' },
        uyari: {
          backgroundColor: t.accentSoft,
          borderRadius: 12,
          padding: 14,
          borderWidth: 1,
          borderColor: t.borderStrong,
        },
        uyariBaslik: { fontSize: 15, fontWeight: '700', color: t.accent },
        uyariMetin: { fontSize: 13, color: t.muted, lineHeight: 19, marginTop: 6 },
      }),
    [t],
  );

  return (
    <EglenceGameLobbyScreen gameId="kelime-yarismasi" scroll={false} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <EglenceGameLobbyTitle gameId="kelime-yarismasi" title={tr('eglence.kelimeYarismasi.title')} />
        <Text style={styles.alt}>
          {tr('eglence.kelimeYarismasi.subtitle', { turSayisi: TUR_SAYISI })}
        </Text>

        <View style={styles.kutu}>
          <Text style={styles.kutuBaslik}>{tr('eglence.kelimeYarismasi.kurallar')}</Text>
          <Text style={styles.madde}>
            {tr('eglence.kelimeYarismasi.kural1')}
          </Text>
          <Text style={styles.madde}>
            {tr('eglence.kelimeYarismasi.kural2', { cevapSure: CEVAP_SURE_MS / 1000 })}
          </Text>
          <Text style={styles.madde}>{tr('eglence.kelimeYarismasi.kural3')}</Text>
          <Text style={styles.madde}>
            {tr('eglence.kelimeYarismasi.kural4', { jokerSure: JOKER_SURE_BONUS_MS / 1000 })}
          </Text>
          <Text style={styles.madde}>
            {tr('eglence.kelimeYarismasi.kural5', { turSayisi: TUR_SAYISI })}
          </Text>
        </View>

        {bos ? (
          <View style={styles.uyari}>
            <Text style={styles.uyariBaslik}>{tr('eglence.kelimeYarismasi.bankaYuklenemedi')}</Text>
            <Text style={styles.uyariMetin}>{tr('eglence.kelimeYarismasi.bankaHataMesaj')}</Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.buton, bos !== false && styles.butonPasif]}
          disabled={bos !== false}
          onPress={() => router.push('/oyun/kelime-yarismasi/oyun')}>
          <Text style={styles.butonYazi}>{bos === null ? tr('eglence.kelimeYarismasi.btnHazirlanıyor') : tr('eglence.kelimeYarismasi.btnOyunaBasla')}</Text>
        </Pressable>
      </ScrollView>
    </EglenceGameLobbyScreen>
  );
}
