import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { GastroColors } from '@/constants/theme';
import type { FoodcastReportReason } from '@/lib/foodcast-types';

const REASONS: { id: FoodcastReportReason; label: string }[] = [
  { id: 'inappropriate', label: 'Uygunsuz içerik' },
  { id: 'spam', label: 'Spam / reklam' },
  { id: 'wrong_place', label: 'Yanlış mekan' },
  { id: 'other', label: 'Diğer' },
];

type Props = {
  visible: boolean;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (reason: FoodcastReportReason) => void;
};

export function FoodcastReportSheet({ visible, busy, onClose, onSubmit }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Fotoğrafı bildir</Text>
          <Text style={styles.sub}>Uygunsuz veya yanıltıcı içerikleri bildir; hızlıca inceleriz.</Text>
          <View style={styles.list}>
            {REASONS.map((row) => (
              <Pressable
                key={row.id}
                style={styles.reasonBtn}
                disabled={busy}
                onPress={() => onSubmit(row.id)}>
                <Text style={styles.reasonText}>{row.label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Vazgeç</Text>
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
    backgroundColor: GastroColors.panel,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: GastroColors.border,
  },
  title: { color: GastroColors.text, fontSize: 16, fontWeight: '800' },
  sub: { color: GastroColors.muted, fontSize: 12, lineHeight: 18 },
  list: { gap: 8, marginTop: 4 },
  reasonBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.input,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  reasonText: { color: GastroColors.text, fontSize: 14, fontWeight: '600' },
  cancelBtn: { alignSelf: 'center', paddingVertical: 10 },
  cancelText: { color: GastroColors.muted, fontSize: 13, fontWeight: '600' },
});
