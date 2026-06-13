import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  CITY_LABELS,
  SUPPORTED_CITIES,
  type SupportedCity,
} from '@/constants/supported-cities';
import { GastroColors } from '@/constants/theme';

type Props = {
  visible: boolean;
  selected: SupportedCity;
  onSelect: (city: SupportedCity) => void;
  onClose: () => void;
  onUseLocation?: () => void;
};

export function CityPickerModal({ visible, selected, onSelect, onClose, onUseLocation }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Şehir</Text>
          <Text style={styles.sub}>
            Varsayılan olarak konumundan otomatik seçilir. İstersen elle değiştirebilirsin.
          </Text>
          {SUPPORTED_CITIES.map((city) => {
            const active = city === selected;
            return (
              <Pressable
                key={city}
                style={[styles.row, active && styles.rowActive]}
                onPress={() => {
                  onSelect(city);
                  onClose();
                }}>
                <Text style={[styles.rowText, active && styles.rowTextActive]}>{CITY_LABELS[city]}</Text>
                {active ? <Text style={styles.check}>✓</Text> : null}
              </Pressable>
            );
          })}
          {onUseLocation ? (
            <Pressable
              style={styles.locationBtn}
              onPress={() => {
                onUseLocation();
                onClose();
              }}>
              <Text style={styles.locationText}>Konumuma göre otomatik ayarla</Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    borderRadius: 16,
    backgroundColor: GastroColors.panel,
    borderWidth: 1,
    borderColor: GastroColors.border,
    padding: 16,
  },
  title: {
    color: GastroColors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  sub: {
    color: GastroColors.muted,
    fontSize: 13,
    marginTop: 6,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  rowActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
  },
  rowText: {
    color: GastroColors.text,
    fontSize: 16,
  },
  rowTextActive: {
    color: GastroColors.accent,
    fontWeight: '600',
  },
  check: {
    color: GastroColors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  locationBtn: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: GastroColors.border,
  },
  locationText: {
    color: GastroColors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
});
