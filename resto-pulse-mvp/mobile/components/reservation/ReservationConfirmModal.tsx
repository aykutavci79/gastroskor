import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ReservationTheme } from '@/constants/reservation-theme';
import { formatSlotDateTimeTr, type ReservationSlot } from '@/lib/reservation-datetime';
import { formatTableCodeLong } from '@/lib/reservation-table-code';
import { reservationOccasionI18nKey, type ReservationOccasionType } from '@/lib/reservation-occasion';
import type { FloorPlanTable } from '@/lib/types';

type Props = {
  visible: boolean;
  restaurantName: string;
  table: FloorPlanTable;
  slot: ReservationSlot;
  partySize: number;
  customerName: string;
  customerPhone: string;
  occasionType: ReservationOccasionType | null;
  note: string;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ReservationConfirmModal({
  visible,
  restaurantName,
  table,
  slot,
  partySize,
  customerName,
  customerPhone,
  occasionType,
  note,
  submitting,
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useTranslation();
  const tableCode = formatTableCodeLong(table.zone, table.label);
  const occasionKey = reservationOccasionI18nKey(occasionType);
  const occasionLabel = occasionKey ? t(occasionKey) : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('rezervasyon.confirmModalTitle')}</Text>
          <Text style={styles.restaurant}>{restaurantName}</Text>

          <View style={styles.block}>
            <Text style={styles.line}>
              <Text style={styles.key}>{t('rezervasyon.confirmDateLabel')}</Text>
              {formatSlotDateTimeTr(slot)}
            </Text>
            <Text style={styles.line}>
              <Text style={styles.key}>{t('rezervasyon.confirmTableLabel')}</Text>
              {tableCode}
            </Text>
            <Text style={styles.line}>
              <Text style={styles.key}>{t('rezervasyon.confirmPersonLabel')}</Text>
              {partySize}
            </Text>
            <Text style={styles.line}>
              <Text style={styles.key}>{t('rezervasyon.confirmNameLabel')}</Text>
              {customerName}
            </Text>
            <Text style={styles.line}>
              <Text style={styles.key}>{t('rezervasyon.confirmPhoneLabel')}</Text>
              {customerPhone}
            </Text>
            {occasionLabel ? (
              <Text style={styles.line}>
                <Text style={styles.key}>{t('rezervasyon.confirmOccasionLabel')}</Text>
                {occasionLabel}
              </Text>
            ) : null}
            {note.trim() ? (
              <Text style={styles.line}>
                <Text style={styles.key}>{t('rezervasyon.confirmNoteLabel')}</Text>
                {note.trim()}
              </Text>
            ) : null}
          </View>

          <Text style={styles.hint}>
            {t('rezervasyon.confirmHint')}
          </Text>

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} disabled={submitting} onPress={onCancel}>
              <Text style={styles.cancelText}>{t('rezervasyon.confirmCancelBtn')}</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmBtn, submitting && styles.confirmDisabled]}
              disabled={submitting}
              onPress={onConfirm}>
              <Text style={styles.confirmText}>
                {submitting ? t('rezervasyon.confirmSending') : t('rezervasyon.confirmSendBtn')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 18,
    backgroundColor: ReservationTheme.bgElevated,
    borderWidth: 1,
    borderColor: ReservationTheme.border,
    padding: 18,
    gap: 10,
  },
  title: { color: ReservationTheme.text, fontSize: 18, fontWeight: '800' },
  restaurant: { color: ReservationTheme.textMuted, fontSize: 14 },
  block: {
    borderRadius: 12,
    backgroundColor: ReservationTheme.panel,
    borderWidth: 1,
    borderColor: ReservationTheme.borderSoft,
    padding: 12,
    gap: 6,
  },
  line: { color: ReservationTheme.text, fontSize: 14, lineHeight: 20 },
  key: { color: ReservationTheme.textSoft, fontWeight: '600' },
  hint: { color: ReservationTheme.textSoft, fontSize: 12, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ReservationTheme.borderSoft,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelText: { color: ReservationTheme.text, fontWeight: '700' },
  confirmBtn: {
    flex: 1.4,
    borderRadius: 12,
    backgroundColor: ReservationTheme.accent,
    paddingVertical: 13,
    alignItems: 'center',
  },
  confirmDisabled: { opacity: 0.6 },
  confirmText: { color: ReservationTheme.ctaText, fontWeight: '800', fontSize: 15 },
});
