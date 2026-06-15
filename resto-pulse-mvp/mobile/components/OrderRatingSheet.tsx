import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { StarRatingPicker } from '@/components/StarRatingPicker';
import type { GastroColorScheme } from '@/constants/theme';
import { GastroStyles } from '@/constants/theme';
import { useGastroTheme } from '@/context/theme-context';
import { createOrderReview } from '@/lib/api';
import type { RestaurantOrderRead } from '@/lib/types';

type Props = {
  visible: boolean;
  order: RestaurantOrderRead | null;
  userEmail: string;
  onClose: () => void;
  onSubmitted: () => void;
};

type RowProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  colors: GastroColorScheme;
};

function RatingRow({ label, value, onChange, colors }: RowProps) {
  return (
    <View style={rowStyles(colors).row}>
      <Text style={rowStyles(colors).label}>{label}</Text>
      <StarRatingPicker value={value} onChange={onChange} size={26} />
    </View>
  );
}

function rowStyles(colors: GastroColorScheme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    label: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      minWidth: 72,
    },
  });
}

export function OrderRatingSheet({ visible, order, userEmail, onClose, onSubmitted }: Props) {
  const { colors } = useGastroTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [lezzet, setLezzet] = useState(0);
  const [servis, setServis] = useState(0);
  const [kurye, setKurye] = useState(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = lezzet > 0 && servis > 0 && kurye > 0 && !submitting;

  function resetForm() {
    setLezzet(0);
    setServis(0);
    setKurye(0);
    setText('');
    setError(null);
    setSubmitting(false);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit() {
    if (!order || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await createOrderReview(order.id, {
        user_email: userEmail,
        lezzet,
        servis,
        kurye,
        review_text: text.trim(),
      });
      resetForm();
      onSubmitted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Puan gonderilemedi.');
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.title}>Puan ver</Text>
          <Text style={styles.sub} numberOfLines={1}>
            {order?.restaurant_name ?? 'Siparis'}
            {order?.order_number ? ` · ${order.order_number}` : ''}
          </Text>
          <Text style={styles.hint}>
            Lezzet, servis ve kurye ayri puanlanir. Baslik skor yalnizca lezzettir.
          </Text>

          <RatingRow label="Lezzet" value={lezzet} onChange={setLezzet} colors={colors} />
          <RatingRow label="Servis" value={servis} onChange={setServis} colors={colors} />
          <RatingRow label="Kurye" value={kurye} onChange={setKurye} colors={colors} />

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Kisa yorum (istege bagli)"
            placeholderTextColor={colors.placeholder}
            style={styles.input}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable style={styles.btnOutline} onPress={handleClose} disabled={submitting}>
              <Text style={styles.btnOutlineText}>Vazgec</Text>
            </Pressable>
            <Pressable
              style={[styles.btnPrimary, !canSubmit && styles.btnDisabled]}
              disabled={!canSubmit}
              onPress={() => void handleSubmit()}>
              {submitting ? (
                <ActivityIndicator color={colors.accentDark} />
              ) : (
                <Text style={styles.btnPrimaryText}>Gonder</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: GastroColorScheme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    sheet: {
      ...GastroStyles.card,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      gap: 12,
      paddingBottom: 28,
    },
    title: { color: colors.text, fontSize: 18, fontWeight: '800' },
    sub: { color: colors.muted, fontSize: 13 },
    hint: { color: colors.muted, fontSize: 12, lineHeight: 17 },
    input: {
      ...GastroStyles.input,
      minHeight: 72,
      textAlignVertical: 'top',
    },
    error: { ...GastroStyles.errorText },
    actions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    btnOutline: {
      ...GastroStyles.btnOutline,
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
    },
    btnOutlineText: GastroStyles.btnOutlineText,
    btnPrimary: {
      ...GastroStyles.btnPrimary,
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
    },
    btnPrimaryText: GastroStyles.btnPrimaryText,
    btnDisabled: { opacity: 0.5 },
  });
}
