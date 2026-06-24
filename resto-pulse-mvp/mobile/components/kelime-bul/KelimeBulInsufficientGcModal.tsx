import { Modal, Pressable, StyleSheet, Text } from 'react-native';

import { HubPressable } from '@/components/eglence/HubPressable';
import { GastroCoinMark } from '@/components/eglence/GastroCoinMark';
import { GASTROCOIN_SHORT, GastroCoinTheme } from '@/constants/gastrocoin-theme';
import { KELIME_BUL_GC_MALIYET } from '@/constants/kelime-bul';

type Props = {
  visible: boolean;
  balance: number | null;
  onClose: () => void;
  onEarnPress: () => void;
};

export function KelimeBulInsufficientGcModal({ visible, balance, onClose, onEarnPress }: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <GastroCoinMark variant="wallet-coin" size={48} />
          <Text style={styles.title}>GastroCoin yetmiyor</Text>
          <Text style={styles.body}>
            Yeni bulmaca için {KELIME_BUL_GC_MALIYET} {GASTROCOIN_SHORT} gerekir.
            {balance != null ? `\nBakiyen: ${balance} ${GASTROCOIN_SHORT}` : ''}
          </Text>
          <Text style={styles.hint}>Görevleri tamamla veya Gastro-Market’ten hak al.</Text>
          <HubPressable style={styles.primaryBtn} onPress={onEarnPress}>
            <Text style={styles.primaryText}>GC kazan veya satın al</Text>
          </HubPressable>
          <HubPressable style={styles.secondaryBtn} onPress={onClose}>
            <Text style={styles.secondaryText}>Vazgeç</Text>
          </HubPressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.35)',
  },
  title: { color: '#F5F5F5', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  body: { color: '#CFCFCF', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  hint: { color: '#9CA3AF', fontSize: 13, lineHeight: 18, textAlign: 'center' },
  primaryBtn: {
    width: '100%',
    backgroundColor: GastroCoinTheme.coinGold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryText: { color: '#1A1208', fontSize: 15, fontWeight: '800' },
  secondaryBtn: { paddingVertical: 8 },
  secondaryText: { color: '#9CA3AF', fontSize: 14, fontWeight: '600' },
});
