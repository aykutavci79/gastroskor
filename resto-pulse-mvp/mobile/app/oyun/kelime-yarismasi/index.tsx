import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import {
  CEVAP_SURE_MS,
  JOKER_SURE_BONUS_MS,
  TUR_SAYISI,
} from '@/constants/kelime-yarismasi';
import { useGastroTheme } from '@/context/theme-context';
import { soruBankasiBosMu } from '@/lib/kelime-yarismasi/soru-paketi';

export default function KelimeYarismasiLobbyScreen() {
  const router = useRouter();
  const { colors } = useGastroTheme();
  const bos = soruBankasiBosMu();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: { padding: 16, gap: 16, paddingBottom: 32 },
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
        buton: {
          backgroundColor: colors.accent,
          borderRadius: 12,
          paddingVertical: 16,
          alignItems: 'center',
        },
        butonPasif: { opacity: 0.45 },
        butonYazi: { fontSize: 17, fontWeight: '800', color: '#fff' },
        uyari: {
          backgroundColor: colors.accentSoft,
          borderRadius: 12,
          padding: 14,
          borderWidth: 1,
          borderColor: colors.accent,
        },
        uyariBaslik: { fontSize: 15, fontWeight: '700', color: colors.accent },
        uyariMetin: { fontSize: 13, color: colors.muted, lineHeight: 19, marginTop: 6 },
      }),
    [colors],
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.baslik}>Kelime Yarışması</Text>
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
          style={[styles.buton, bos && styles.butonPasif]}
          disabled={bos}
          onPress={() => router.push('/oyun/kelime-yarismasi/oyun')}>
          <Text style={styles.butonYazi}>Oyuna Başla</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
