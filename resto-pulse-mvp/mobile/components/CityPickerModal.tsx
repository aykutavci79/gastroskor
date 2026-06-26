import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  cityDisplayLabel,
  normalizeCityInput,
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
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr');
    if (!q) return [...SUPPORTED_CITIES];
    return SUPPORTED_CITIES.filter((city) => city.toLocaleLowerCase('tr').includes(q));
  }, [query]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>İl seç</Text>
          <Text style={styles.sub}>
            Konumundan otomatik il seçilir. İstersen 81 ilden birini elle de seçebilirsin.
          </Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="İl ara…"
            placeholderTextColor={GastroColors.muted}
            style={styles.search}
            autoCorrect={false}
            autoCapitalize="none"
          />
          <FlatList
            data={filtered}
            keyExtractor={(city) => city}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item: city }) => {
              const active = normalizeCityInput(city) === normalizeCityInput(selected);
              return (
                <Pressable
                  style={[styles.row, active && styles.rowActive]}
                  onPress={() => {
                    onSelect(city);
                    setQuery('');
                    onClose();
                  }}>
                  <Text style={[styles.rowText, active && styles.rowTextActive]}>{cityDisplayLabel(city)}</Text>
                  {active ? <Text style={styles.check}>✓</Text> : null}
                </Pressable>
              );
            }}
            ListEmptyComponent={<Text style={styles.empty}>Eşleşen il yok</Text>}
          />
          {onUseLocation ? (
            <Pressable
              style={styles.locationBtn}
              onPress={() => {
                onUseLocation();
                setQuery('');
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
    maxHeight: '82%',
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
    marginBottom: 10,
  },
  search: {
    borderWidth: 1,
    borderColor: GastroColors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: GastroColors.text,
    marginBottom: 8,
  },
  list: {
    maxHeight: 360,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  rowActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
  },
  rowText: {
    color: GastroColors.text,
    fontSize: 15,
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
  empty: {
    color: GastroColors.muted,
    textAlign: 'center',
    paddingVertical: 16,
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
