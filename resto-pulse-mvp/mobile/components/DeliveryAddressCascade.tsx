import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { GastroColorsLight } from '@/constants/theme';
import { listDeliveryAddressChildren, validateDeliveryAddress } from '@/lib/api';
import type {
  AddressNodeItem,
  DeliveryAddressSelection,
  StoredDeliveryAddress,
} from '@/lib/delivery-address-types';
import { resolveDeviceCoords } from '@/lib/device-location';

type Props = {
  value: StoredDeliveryAddress | null;
  onChange: (address: StoredDeliveryAddress | null) => void;
  onReadyChange?: (ready: boolean) => void;
};

type PickerKey = 'district' | 'neighborhood' | 'street';

const BURSA_PROVINCE_ID = 16;

function emptySelection(): DeliveryAddressSelection {
  return {
    district: null,
    neighborhood: null,
    street: null,
    doorNumber: '',
    note: '',
  };
}

export function DeliveryAddressCascade({ value, onChange, onReadyChange }: Props) {
  const { t } = useTranslation();
  const [selection, setSelection] = useState<DeliveryAddressSelection>(emptySelection());
  const [options, setOptions] = useState<Record<PickerKey, AddressNodeItem[]>>({
    district: [],
    neighborhood: [],
    street: [],
  });
  const [loadingKey, setLoadingKey] = useState<PickerKey | 'validate' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickerKey, setPickerKey] = useState<PickerKey | null>(null);
  const [validated, setValidated] = useState<StoredDeliveryAddress | null>(value);

  const ready = validated != null;

  useEffect(() => {
    onReadyChange?.(ready);
  }, [ready, onReadyChange]);

  useEffect(() => {
    if (value) {
      setValidated(value);
      setSelection({
        district: { id: 0, name: value.district, level: 'district', parent_id: BURSA_PROVINCE_ID },
        neighborhood: { id: 0, name: value.neighborhood, level: 'neighborhood', parent_id: null },
        street: { id: value.streetNodeId, name: value.street, level: 'street', parent_id: null },
        doorNumber: value.doorNumber,
        note: value.note ?? '',
      });
    }
  }, [value]);

  const loadDistricts = useCallback(async () => {
    setLoadingKey('district');
    setError(null);
    try {
      const res = await listDeliveryAddressChildren({ parent_id: BURSA_PROVINCE_ID, level: 'admin' });
      setOptions((prev) => ({ ...prev, district: res.items }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('deliveryAddress.loadError'));
    } finally {
      setLoadingKey(null);
    }
  }, [t]);

  useEffect(() => {
    void loadDistricts();
  }, [loadDistricts]);

  const loadChildren = useCallback(
    async (key: PickerKey, parentId: number) => {
      setLoadingKey(key);
      setError(null);
      try {
        const res = await listDeliveryAddressChildren({ parent_id: parentId, level: 'admin' });
        setOptions((prev) => ({ ...prev, [key]: res.items }));
      } catch (err) {
        setError(err instanceof Error ? err.message : t('deliveryAddress.loadError'));
      } finally {
        setLoadingKey(null);
      }
    },
    [t],
  );

  const resetFrom = useCallback(
    (key: PickerKey) => {
      setValidated(null);
      onChange(null);
      setSelection((prev) => {
        if (key === 'district') {
          return { ...emptySelection(), note: prev.note, doorNumber: prev.doorNumber };
        }
        if (key === 'neighborhood') {
          return { ...prev, neighborhood: null, street: null };
        }
        return { ...prev, street: null };
      });
    },
    [onChange],
  );

  const onPick = useCallback(
    async (key: PickerKey, item: AddressNodeItem) => {
      setPickerKey(null);
      resetFrom(key);
      setSelection((prev) => {
        const next = { ...prev, [key]: item };
        if (key === 'district') {
          next.neighborhood = null;
          next.street = null;
        } else if (key === 'neighborhood') {
          next.street = null;
        }
        return next;
      });
      if (key === 'district') {
        await loadChildren('neighborhood', item.id);
      } else if (key === 'neighborhood') {
        await loadChildren('street', item.id);
      }
    },
    [loadChildren, resetFrom],
  );

  const runValidate = useCallback(async () => {
    const street = selection.street;
    const door = selection.doorNumber.trim();
    if (!street || !selection.district || !selection.neighborhood || !door) {
      setError(t('deliveryAddress.incomplete'));
      return;
    }
    setLoadingKey('validate');
    setError(null);
    try {
      const coords = await resolveDeviceCoords({ requestPermission: true });
      if (!coords) {
        setError(t('deliveryAddress.locationRequired'));
        return;
      }
      const res = await validateDeliveryAddress({
        street_node_id: street.id,
        door_number: door,
        address_note: selection.note.trim() || undefined,
        device_lat: coords.lat,
        device_lng: coords.lng,
      });
      const stored: StoredDeliveryAddress = {
        streetNodeId: res.street_node_id,
        doorNumber: res.door_number,
        formatted: res.formatted_address,
        latitude: res.latitude,
        longitude: res.longitude,
        note: selection.note.trim() || undefined,
        district: selection.district.name,
        neighborhood: selection.neighborhood.name,
        street: street.name,
      };
      setValidated(stored);
      onChange(stored);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('deliveryAddress.validateFailed'));
      setValidated(null);
      onChange(null);
    } finally {
      setLoadingKey(null);
    }
  }, [onChange, selection, t]);

  useEffect(() => {
    if (selection.street && selection.doorNumber.trim().length >= 1) {
      void runValidate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- validate when street + door ready
  }, [selection.street?.id, selection.doorNumber]);

  const pickerRows = useMemo(
    () =>
      [
        { key: 'district' as const, label: t('deliveryAddress.district'), value: selection.district },
        {
          key: 'neighborhood' as const,
          label: t('deliveryAddress.neighborhood'),
          value: selection.neighborhood,
          disabled: !selection.district,
        },
        {
          key: 'street' as const,
          label: t('deliveryAddress.street'),
          value: selection.street,
          disabled: !selection.neighborhood,
        },
      ] as const,
    [selection, t],
  );

  const activeOptions = pickerKey ? options[pickerKey] : [];

  return (
    <View style={styles.wrap}>
      <Text style={styles.lead}>{t('deliveryAddress.lead')}</Text>
      <Text style={styles.city}>{t('deliveryAddress.cityBursa')}</Text>

      {pickerRows.map((row) => (
        <View key={row.key} style={styles.field}>
          <Text style={styles.label}>{row.label}</Text>
          <Pressable
            style={[styles.select, row.disabled && styles.selectDisabled]}
            disabled={row.disabled || loadingKey === row.key}
            onPress={() => setPickerKey(row.key)}>
            <Text style={[styles.selectText, !row.value && styles.placeholder]}>
              {row.value?.name ?? t('deliveryAddress.selectPlaceholder')}
            </Text>
            {loadingKey === row.key ? (
              <ActivityIndicator size="small" color={GastroColorsLight.text} />
            ) : null}
          </Pressable>
        </View>
      ))}

      <View style={styles.field}>
        <Text style={styles.label}>{t('deliveryAddress.buildingNo')}</Text>
        <TextInput
          style={styles.noteInput}
          value={selection.doorNumber}
          onChangeText={(text) => {
            setSelection((prev) => ({ ...prev, doorNumber: text }));
            setValidated(null);
            onChange(null);
          }}
          placeholder={t('deliveryAddress.doorPlaceholder')}
          placeholderTextColor={GastroColorsLight.placeholder}
          keyboardType="default"
          maxLength={20}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t('deliveryAddress.noteOptional')}</Text>
        <TextInput
          style={styles.noteInput}
          value={selection.note}
          onChangeText={(text) => {
            setSelection((prev) => ({ ...prev, note: text }));
            setValidated(null);
            onChange(null);
          }}
          onBlur={() => {
            if (selection.street && selection.doorNumber.trim()) void runValidate();
          }}
          placeholder={t('deliveryAddress.notePlaceholder')}
          placeholderTextColor={GastroColorsLight.placeholder}
        />
      </View>

      {validated ? (
        <Text style={styles.ok}>{validated.formatted}</Text>
      ) : loadingKey === 'validate' ? (
        <Text style={styles.hint}>{t('deliveryAddress.validating')}</Text>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={pickerKey != null} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerKey(null)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>
            {pickerKey ? pickerRows.find((row) => row.key === pickerKey)?.label : ''}
          </Text>
          <ScrollView keyboardShouldPersistTaps="handled">
            {activeOptions.length === 0 ? (
              <Text style={styles.emptyList}>{t('deliveryAddress.emptyList')}</Text>
            ) : (
              activeOptions.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.modalItem}
                  onPress={() => void onPick(pickerKey!, item)}>
                  <Text style={styles.modalItemText}>{item.name}</Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  lead: { color: GastroColorsLight.muted, fontSize: 13, lineHeight: 18 },
  city: { color: GastroColorsLight.text, fontSize: 14, fontWeight: '800' },
  field: { gap: 6 },
  label: { color: GastroColorsLight.text, fontSize: 13, fontWeight: '800' },
  select: {
    borderWidth: 1,
    borderColor: GastroColorsLight.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectDisabled: { opacity: 0.45 },
  selectText: { color: GastroColorsLight.text, fontSize: 15, flex: 1 },
  placeholder: { color: GastroColorsLight.placeholder },
  noteInput: {
    borderWidth: 1,
    borderColor: GastroColorsLight.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: GastroColorsLight.text,
    backgroundColor: '#FFFFFF',
    fontSize: 15,
  },
  ok: { color: '#16A34A', fontSize: 12, lineHeight: 17, fontWeight: '700' },
  hint: { color: GastroColorsLight.muted, fontSize: 12 },
  error: { color: '#DC2626', fontSize: 13, lineHeight: 18 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  modalSheet: {
    maxHeight: '55%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    gap: 8,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: GastroColorsLight.text },
  modalItem: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  modalItemText: { fontSize: 15, color: GastroColorsLight.text },
  emptyList: { color: GastroColorsLight.muted, fontSize: 13, paddingVertical: 12 },
});
