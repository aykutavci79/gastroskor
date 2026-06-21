import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { HubPressable } from '@/components/eglence/HubPressable';
import { GastroCoinMark } from '@/components/eglence/GastroCoinMark';
import { GASTROCOIN_LABEL, GASTROCOIN_SHORT, GastroCoinTheme } from '@/constants/gastrocoin-theme';
import { GastroColors } from '@/constants/theme';

type Props = {
  visible: boolean;
  balance: number | null;
  onClose: () => void;
};

const EARN_TASKS = [
  { icon: 'calendar' as const, title: 'Günlük giriş', reward: `+10 ${GASTROCOIN_SHORT}`, note: 'Her gün bir kez' },
  { icon: 'cart' as const, title: 'Online sipariş', reward: `+15 ${GASTROCOIN_SHORT}`, note: 'İlk sipariş +5 bonus (toplam 20)' },
  { icon: 'heart' as const, title: '3 farklı restoran takibi', reward: `+10 ${GASTROCOIN_SHORT}`, note: 'Aynı gün 3. yeni takipte' },
  { icon: 'people' as const, title: 'Arkadaş daveti', reward: `+10 ${GASTROCOIN_SHORT}`, note: 'Davetli ilk giriş yaptığında' },
  { icon: 'gift' as const, title: 'Hoş geldin hediyesi', reward: `+10 ${GASTROCOIN_SHORT}`, note: 'Hesap açılışında bir kez' },
];

const SPEND_RULES = [
  'Kelime Sofrası: ilk 2 ipucu ücretsiz',
  `3–8. ipuçları: 5 ${GASTROCOIN_SHORT} / ipucu`,
  `Market: oyun hakları 8–12 ${GASTROCOIN_SHORT}`,
];

const COMING_SOON = ['Restoran paylaşımı', 'GS yorum / puan ödülü'];

export function JetonEarnSheet({ visible, balance, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <HubPressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.hero}>
            <GastroCoinMark variant="logo" size={44} />
            <View style={styles.heroText}>
              <Text style={styles.title}>{GASTROCOIN_LABEL}</Text>
              <Text style={styles.balance}>
                Bakiye:{' '}
                <Text style={styles.balanceValue}>
                  {balance ?? '—'} {GASTROCOIN_SHORT}
                </Text>
              </Text>
              <Text style={styles.disclaimer}>Gerçek para değildir · oyun ve avantajlar için kazanılır</Text>
            </View>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>{GASTROCOIN_SHORT} kazan</Text>
            {EARN_TASKS.map((task) => (
              <View key={task.title} style={styles.row}>
                <Ionicons name={task.icon} size={18} color={GastroCoinTheme.coinGold} />
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{task.title}</Text>
                  <Text style={styles.rowNote}>{task.note}</Text>
                </View>
                <Text style={styles.reward}>{task.reward}</Text>
              </View>
            ))}

            <Text style={styles.sectionTitle}>İpucu harcama</Text>
            {SPEND_RULES.map((line) => (
              <Text key={line} style={styles.bullet}>
                · {line}
              </Text>
            ))}

            <Text style={styles.sectionTitle}>Yakında</Text>
            {COMING_SOON.map((line) => (
              <Text key={line} style={styles.comingSoon}>
                · {line}
              </Text>
            ))}
          </ScrollView>

          <HubPressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Kapat</Text>
          </HubPressable>
        </Pressable>
      </HubPressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '82%',
    backgroundColor: GastroColors.bg,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 18,
    paddingBottom: 24,
    paddingTop: 10,
    borderWidth: 1,
    borderColor: GastroColors.border,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: GastroColors.border,
    marginBottom: 12,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: GastroCoinTheme.chipBg,
    borderWidth: 1,
    borderColor: GastroCoinTheme.chipBorder,
  },
  heroText: { flex: 1, gap: 4 },
  title: { color: GastroColors.text, fontSize: 20, fontWeight: '800' },
  balance: { color: GastroColors.muted, fontSize: 14 },
  balanceValue: { color: GastroCoinTheme.coinGoldLight, fontWeight: '800' },
  disclaimer: { color: GastroColors.muted, fontSize: 11, lineHeight: 16 },
  scroll: { maxHeight: 420 },
  sectionTitle: {
    color: GastroColors.text,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: GastroColors.border,
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { color: GastroColors.text, fontSize: 14, fontWeight: '700' },
  rowNote: { color: GastroColors.muted, fontSize: 12 },
  reward: { color: GastroCoinTheme.coinGold, fontSize: 12, fontWeight: '800' },
  bullet: { color: GastroColors.muted, fontSize: 13, lineHeight: 20 },
  comingSoon: { color: GastroColors.muted, fontSize: 12, lineHeight: 18, fontStyle: 'italic' },
  closeBtn: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: GastroColors.panel,
    borderWidth: 1,
    borderColor: GastroColors.border,
  },
  closeBtnText: { color: GastroColors.text, fontWeight: '700' },
});
