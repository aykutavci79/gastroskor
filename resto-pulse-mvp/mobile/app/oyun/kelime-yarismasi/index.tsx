import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { InteractionManager, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EglenceGameLobbyTitle } from '@/components/eglence/EglenceGameLobbyTitle';
import { eglenceLobbyTheme, EglenceGameLobbyScreen } from '@/components/eglence/EglenceGameLobbyScreen';
import {
  CEVAP_SURE_MS,
  JOKER_SURE_BONUS_MS,
  TUR_SAYISI,
} from '@/constants/kelime-yarismasi';
export default function KelimeYarismasiLobbyScreen() {
  const router = useRouter();
  const t = eglenceLobbyTheme('kelime-yarismasi');
  const [bos, setBos] = useState<boolean | null>(null);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      void import('@/lib/kelime-yarismasi/soru-paketi').then((m) => {
        m.warmSoruBankasi();
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
        <EglenceGameLobbyTitle gameId="kelime-yarismasi" title="Kelime Yarışması" />
        <Text style={styles.alt}>
          Günlük {TUR_SAYISI} tur · ipucu okurken süre işler · reklamsız
        </Text>

        <View style={styles.kutu}>
          <Text style={styles.kutuBaslik}>Kurallar</Text>
          <Text style={styles.madde}>
            İpucu okurken yarışma süresi işler; “Cevap ver” deyince durur.
          </Text>
          <Text style={styles.madde}>
            Cevap modunda {CEVAP_SURE_MS / 1000} sn yazarsın; dolarsa veya yanlışsa puan yok.
          </Text>
          <Text style={styles.madde}>Sıralamada önce puan, eşitlikte daha kısa süre üstte.</Text>
          <Text style={styles.madde}>
            Joker: rastgele harf açar; her basış +{JOKER_SURE_BONUS_MS / 1000} sn (soru başına max
            +15 sn); puan = harf − joker.
          </Text>
          <Text style={styles.madde}>
            Günlük {TUR_SAYISI} tur. Pazar 13 harf; Salı/Cuma 12 harf; diğer günler 4–11 aralığı.
          </Text>
        </View>

        {bos ? (
          <View style={styles.uyari}>
            <Text style={styles.uyariBaslik}>Soru bankası yüklenemedi</Text>
            <Text style={styles.uyariMetin}>Uygulamayı yenileyin veya daha sonra tekrar deneyin.</Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.buton, bos !== false && styles.butonPasif]}
          disabled={bos !== false}
          onPress={() => router.push('/oyun/kelime-yarismasi/oyun')}>
          <Text style={styles.butonYazi}>{bos === null ? 'Hazırlanıyor…' : 'Oyuna Başla'}</Text>
        </Pressable>
      </ScrollView>
    </EglenceGameLobbyScreen>
  );
}
