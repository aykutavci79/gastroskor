import { useRouter, type Href } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { GastroColors } from '@/constants/theme';
import type { KesfetReviewTickerItem } from '@/lib/kesfet-review-ticker';

type Props = {
  item: KesfetReviewTickerItem | null;
  onClose: () => void;
};

export function KesfetReviewTickerSheet({ item, onClose }: Props) {
  const router = useRouter();

  if (!item) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.eyebrow}>GS yorumu · ★ {item.rating}</Text>
          <Text style={styles.place}>{item.restaurant_name}</Text>
          {item.author_label ? <Text style={styles.author}>{item.author_label}</Text> : null}
          <Text style={styles.body}>{item.review_text}</Text>
          <View style={styles.actions}>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => {
                onClose();
                router.push(`/restaurant/${item.restaurant_id}` as Href);
              }}>
              <Text style={styles.primaryText}>Mekana git</Text>
            </Pressable>
            <Pressable onPress={onClose} style={styles.secondaryBtn}>
              <Text style={styles.secondaryText}>Kapat</Text>
            </Pressable>
          </View>
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
    gap: 8,
    borderWidth: 1,
    borderColor: GastroColors.border,
  },
  eyebrow: { color: GastroColors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  place: { color: GastroColors.text, fontSize: 17, fontWeight: '800' },
  author: { color: GastroColors.muted, fontSize: 12, fontWeight: '600' },
  body: { color: GastroColors.text, fontSize: 14, lineHeight: 21, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  primaryBtn: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: GastroColors.accentSoft,
    borderWidth: 1,
    borderColor: GastroColors.accent,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryText: { color: GastroColors.accent, fontSize: 13, fontWeight: '800' },
  secondaryBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GastroColors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  secondaryText: { color: GastroColors.muted, fontSize: 13, fontWeight: '700' },
});
