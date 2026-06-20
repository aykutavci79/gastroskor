import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GastroColors } from '@/constants/theme';

type Props = {
  visible: boolean;
  balance: number | null;
  onClose: () => void;
};

const EARN_TASKS = [
  { icon: 'calendar' as const, title: 'Gunluk giris', reward: '+10 jeton', note: 'Her gun bir kez' },
  { icon: 'cart' as const, title: 'Online siparis', reward: '+15 jeton', note: 'Ilk siparis +5 bonus (toplam 20)' },
  { icon: 'heart' as const, title: '3 farkli restoran takibi', reward: '+10 jeton', note: 'Ayni gun 3. yeni takipte' },
  { icon: 'people' as const, title: 'Arkadas daveti', reward: '+10 jeton', note: 'Davetli ilk giris yaptiginda' },
  { icon: 'gift' as const, title: 'Hos geldin hediyesi', reward: '+10 jeton', note: 'Hesap acilisinda bir kez' },
];

const SPEND_RULES = [
  'Kelime Sofrasi: ilk 2 ipucu ucretsiz',
  '3–8. ipuclar: 5 jeton / ipucu',
  'Market: oyun haklari 8–12 jeton',
];

const COMING_SOON = [
  'Restoran paylasimi',
  'GS yorum / puan odulu',
];

export function JetonEarnSheet({ visible, balance, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>Jeton & gorevler</Text>
          <Text style={styles.balance}>
            Bakiye: <Text style={styles.balanceValue}>{balance ?? '—'}</Text> jeton
          </Text>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Jeton kazan</Text>
            {EARN_TASKS.map((task) => (
              <View key={task.title} style={styles.row}>
                <Ionicons name={task.icon} size={18} color={GastroColors.accent} />
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{task.title}</Text>
                  <Text style={styles.rowNote}>{task.note}</Text>
                </View>
                <Text style={styles.reward}>{task.reward}</Text>
              </View>
            ))}

            <Text style={styles.sectionTitle}>Ipucu harcama</Text>
            {SPEND_RULES.map((line) => (
              <Text key={line} style={styles.bullet}>
                · {line}
              </Text>
            ))}

            <Text style={styles.sectionTitle}>Yakinda</Text>
            {COMING_SOON.map((line) => (
              <Text key={line} style={styles.comingSoon}>
                · {line}
              </Text>
            ))}
          </ScrollView>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Kapat</Text>
          </Pressable>
        </Pressable>
      </Pressable>
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
  title: { color: GastroColors.text, fontSize: 20, fontWeight: '800' },
  balance: { color: GastroColors.muted, fontSize: 14, marginTop: 4, marginBottom: 12 },
  balanceValue: { color: GastroColors.gold, fontWeight: '800' },
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
  reward: { color: GastroColors.accent, fontSize: 12, fontWeight: '800' },
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
