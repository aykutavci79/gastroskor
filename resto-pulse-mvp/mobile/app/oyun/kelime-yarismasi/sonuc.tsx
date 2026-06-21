import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EglenceResultModal } from '@/components/eglence/EglenceResultModal';
import { Screen } from '@/components/ui/Screen';
import { useGastroTheme } from '@/context/theme-context';
import { eglenceActivityDayKey } from '@/lib/eglence-activity-day';
import { EGLENCE_LOBBY_ROUTES } from '@/lib/eglence-lobby-routes';
import { scoreKelimeYarismasi } from '@/lib/eglence-scoring';
import { sureMetni } from '@/lib/kelime-yarismasi/sure-yardimci';

export default function KelimeYarismasiSonucScreen() {
  const router = useRouter();
  const { colors } = useGastroTheme();
  const { puan, sure, maksimum } = useLocalSearchParams<{
    puan?: string;
    sure?: string;
    maksimum?: string;
  }>();
  const toplam = Number.parseInt(puan ?? '0', 10) || 0;
  const sureMs = Number.parseInt(sure ?? '0', 10) || 0;
  const maksimumPuan = Number.parseInt(maksimum ?? '0', 10) || 0;
  const periodKey = eglenceActivityDayKey();
  const [resultModalOpen, setResultModalOpen] = useState(true);
  const scoreResult = scoreKelimeYarismasi({ rawScore: toplam, maxScore: maksimumPuan });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: {
          flexGrow: 1,
          padding: 24,
          justifyContent: 'center',
          alignItems: 'center',
          gap: 12,
        },
        baslik: { fontSize: 22, fontWeight: '700', color: colors.muted },
        puan: { fontSize: 56, fontWeight: '800', color: colors.accent },
        alt: { fontSize: 14, color: colors.muted },
        sure: { fontSize: 22, fontWeight: '700', color: colors.gold },
        buton: {
          width: '100%',
          backgroundColor: colors.accent,
          borderRadius: 12,
          paddingVertical: 16,
          alignItems: 'center',
          marginTop: 8,
        },
        butonYazi: { fontSize: 17, fontWeight: '700', color: '#fff' },
        butonIkincil: { width: '100%', paddingVertical: 14, alignItems: 'center' },
        butonIkincilYazi: { fontSize: 15, color: colors.muted, fontWeight: '600' },
      }),
    [colors],
  );

  return (
    <Screen scroll={false}>
      <View style={styles.content}>
        <Text style={styles.baslik}>Oyun bitti</Text>
        <Text style={styles.puan}>{toplam}</Text>
        <Text style={styles.alt}>puan · en fazla {maksimumPuan}</Text>
        <Text style={styles.sure}>Süre: {sureMetni(sureMs)}</Text>

        <Pressable style={styles.buton} onPress={() => router.replace('/oyun/kelime-yarismasi/oyun')}>
          <Text style={styles.butonYazi}>Tekrar oyna</Text>
        </Pressable>
        <Pressable style={styles.butonIkincil} onPress={() => router.replace('/(tabs)/eglence')}>
          <Text style={styles.butonIkincilYazi}>Eğlenceye dön</Text>
        </Pressable>
      </View>

      <EglenceResultModal
        visible={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
        onDone={() => {
          setResultModalOpen(false);
          router.replace(EGLENCE_LOBBY_ROUTES['kelime-yarismasi']);
        }}
        game="kelime_yarismasi"
        periodKey={periodKey}
        score={scoreResult.score}
        scoreDetail={scoreResult.detail}
        elapsedMs={sureMs}
      />
    </Screen>
  );
}
