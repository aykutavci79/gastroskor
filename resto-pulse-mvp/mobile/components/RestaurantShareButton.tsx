import * as Linking from 'expo-linking';
import { useMemo, useState } from 'react';
import { Alert, Modal, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { GastroColors } from '@/constants/theme';
import {
  buildRestaurantShareText,
  type RestaurantShareInput,
  whatsAppShareUrl,
} from '@/lib/restaurant-share';

type Props = {
  restaurant: RestaurantShareInput;
  googleRating?: number | null;
  gastroRating?: number | null;
  compact?: boolean;
  label?: string;
};

export function RestaurantShareButton({
  restaurant,
  googleRating,
  gastroRating,
  compact = false,
  label = 'Paylaş',
}: Props) {
  const [open, setOpen] = useState(false);
  const shareText = useMemo(
    () => buildRestaurantShareText(restaurant, { googleRating, gastroRating }),
    [restaurant, googleRating, gastroRating],
  );
  const shareUrl = useMemo(() => shareText.split('\n').pop() ?? '', [shareText]);

  async function openWhatsApp() {
    setOpen(false);
    const url = whatsAppShareUrl(shareText);
    const can = await Linking.canOpenURL(url);
    if (!can) {
      Alert.alert('WhatsApp bulunamadi', 'WhatsApp yuklu degil veya acilamadi.');
      return;
    }
    await Linking.openURL(url);
  }

  async function openSystemShare(title: string) {
    setOpen(false);
    try {
      await Share.share(
        Platform.OS === 'ios'
          ? { message: shareText, url: shareUrl }
          : { message: shareText, title },
      );
    } catch {
      /* kullanici iptal */
    }
  }

  async function openInstagram() {
    setOpen(false);
    try {
      await Share.share({ message: shareText });
    } catch {
      Alert.alert(
        'Instagram',
        'Paylasim menusunden Instagram\'i secin veya metni DM\'e yapistirin.',
      );
    }
  }

  return (
    <>
      <Pressable
        style={[styles.btn, compact && styles.btnCompact]}
        onPress={(e) => {
          e?.stopPropagation?.();
          setOpen(true);
        }}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="Restorani paylas">
        <Text style={[styles.btnText, compact && styles.btnTextCompact]}>{compact ? '↗' : label}</Text>
      </Pressable>

      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Kartı paylaş</Text>
          <Text style={styles.sheetHint} numberOfLines={3}>
            {restaurant.name}
          </Text>
          <Text style={styles.sheetNote}>
            WhatsApp, mesaj ve Instagram disinda paylasabilirsiniz. Sistem Gurme odalarina restoran karti
            gonderilemez.
          </Text>

          <Pressable style={styles.option} onPress={() => void openWhatsApp()}>
            <Text style={styles.optionEmoji}>💬</Text>
            <View style={styles.optionMeta}>
              <Text style={styles.optionTitle}>WhatsApp</Text>
              <Text style={styles.optionDesc}>Sohbete kart linki gonder</Text>
            </View>
          </Pressable>

          <Pressable style={styles.option} onPress={() => void openSystemShare('Mesaj')}>
            <Text style={styles.optionEmoji}>✉️</Text>
            <View style={styles.optionMeta}>
              <Text style={styles.optionTitle}>Mesaj / DM</Text>
              <Text style={styles.optionDesc}>SMS, Telegram ve diger uygulamalar</Text>
            </View>
          </Pressable>

          <Pressable style={styles.option} onPress={() => void openInstagram()}>
            <Text style={styles.optionEmoji}>📸</Text>
            <View style={styles.optionMeta}>
              <Text style={styles.optionTitle}>Instagram</Text>
              <Text style={styles.optionDesc}>DM veya hikaye icin paylasim menusu</Text>
            </View>
          </Pressable>

          <Pressable style={styles.cancel} onPress={() => setOpen(false)}>
            <Text style={styles.cancelText}>Vazgec</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GastroColors.accent,
    backgroundColor: GastroColors.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  btnCompact: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    minWidth: 32,
    alignItems: 'center',
  },
  btnText: { color: GastroColors.accent, fontWeight: '800', fontSize: 13 },
  btnTextCompact: { fontSize: 14, fontWeight: '900' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
    borderRadius: 18,
    backgroundColor: GastroColors.panel,
    borderWidth: 1,
    borderColor: GastroColors.border,
    padding: 16,
    gap: 10,
  },
  sheetTitle: { color: GastroColors.text, fontSize: 18, fontWeight: '800' },
  sheetHint: { color: GastroColors.muted, fontSize: 13 },
  sheetNote: { color: GastroColors.muted, fontSize: 11, lineHeight: 16 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.input,
    padding: 12,
  },
  optionEmoji: { fontSize: 22 },
  optionMeta: { flex: 1, gap: 2 },
  optionTitle: { color: GastroColors.text, fontWeight: '700', fontSize: 15 },
  optionDesc: { color: GastroColors.muted, fontSize: 12 },
  cancel: { alignItems: 'center', paddingVertical: 10 },
  cancelText: { color: GastroColors.muted, fontWeight: '700' },
});
