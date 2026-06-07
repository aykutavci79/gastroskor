import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { GastroColors } from '@/constants/theme';
import { getActiveRestaurantOrder, submitRestaurantOrder } from '@/lib/api';
import type { Restaurant, RestaurantMenuItem, RestaurantOrderRead } from '@/lib/types';

const PHONE_STORAGE_KEY = 'gastroskor_order_phone';

type LineState = {
  selected: boolean;
  quantity: number;
};

type Props = {
  restaurant: Restaurant;
  userEmail: string | null;
  onOrderSent?: () => void;
};

export function OnlineOrderSection({ restaurant, userEmail, onOrderSent }: Props) {
  const menuItems = restaurant.menu ?? restaurant.menu_preview ?? [];
  const [lines, setLines] = useState<Record<string, LineState>>({});
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [pendingOrder, setPendingOrder] = useState<RestaurantOrderRead | null>(null);
  const [available, setAvailable] = useState(restaurant.online_orders_available ?? false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshActive = useCallback(async () => {
    if (!userEmail || !restaurant.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const active = await getActiveRestaurantOrder(restaurant.id, userEmail);
      setAvailable(active.online_orders_available);
      setPendingOrder(active.pending_order);
      if (!active.pending_order) {
        setLines({});
      }
    } catch {
      setAvailable(restaurant.online_orders_available ?? false);
    } finally {
      setLoading(false);
    }
  }, [restaurant.id, restaurant.online_orders_available, userEmail]);

  useEffect(() => {
    void refreshActive();
  }, [refreshActive]);

  useEffect(() => {
    if (!pendingOrder) return;
    const timer = setInterval(() => void refreshActive(), 15000);
    return () => clearInterval(timer);
  }, [pendingOrder, refreshActive]);

  useEffect(() => {
    AsyncStorage.getItem(PHONE_STORAGE_KEY)
      .then((value) => {
        if (value) setPhone(value);
      })
      .catch(() => undefined);
  }, []);

  const selectedTotal = useMemo(() => {
    return menuItems.reduce((sum, item) => {
      const row = lines[item.id];
      if (!row?.selected || row.quantity < 1) return sum;
      return sum + item.price_tl * row.quantity;
    }, 0);
  }, [lines, menuItems]);

  const selectedCount = useMemo(
    () => Object.values(lines).filter((row) => row.selected && row.quantity > 0).length,
    [lines],
  );

  if (!available && !pendingOrder) return null;

  function toggleItem(itemId: string) {
    setLines((prev) => {
      const current = prev[itemId];
      if (current?.selected) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return { ...prev, [itemId]: { selected: true, quantity: 1 } };
    });
  }

  function setQuantity(itemId: string, delta: number) {
    setLines((prev) => {
      const current = prev[itemId];
      if (!current?.selected) return prev;
      const nextQty = Math.min(99, Math.max(1, current.quantity + delta));
      return { ...prev, [itemId]: { ...current, quantity: nextQty } };
    });
  }

  async function onSubmit() {
    if (!userEmail) {
      Alert.alert('Giris gerekli', 'Siparis vermek icin once hesabiniza giris yapin.');
      return;
    }
    const payloadLines = menuItems
      .filter((item) => {
        const row = lines[item.id];
        return row?.selected && row.quantity > 0;
      })
      .map((item) => ({
        menu_item_id: item.id,
        quantity: lines[item.id]?.quantity ?? 1,
      }));
    if (payloadLines.length === 0) {
      setError('En az bir urun secin.');
      return;
    }
    if (phone.trim().length < 10) {
      setError('Telefon numaranizi girin — restoran sizi arayacak.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await AsyncStorage.setItem(PHONE_STORAGE_KEY, phone.trim());
      await submitRestaurantOrder(restaurant.id, {
        user_email: userEmail,
        customer_phone: phone.trim(),
        note: note.trim() || undefined,
        lines: payloadLines,
      });
      await refreshActive();
      onOrderSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Siparis gonderilemedi.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.wrap}>
        <ActivityIndicator color={GastroColors.accent} />
      </View>
    );
  }

  if (pendingOrder) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Online siparis</Text>
        <View style={styles.pendingCard}>
          <Text style={styles.pendingTitle}>Onay bekleniyor</Text>
          <Text style={styles.pendingBody}>
            Siparisin restorana iletildi. Onay veya red gelene kadar yeni siparis veremezsin.
          </Text>
          <Text style={styles.pendingMeta}>{pendingOrder.total_tl.toFixed(0)} TL · {pendingOrder.lines.length} kalem</Text>
        </View>
      </View>
    );
  }

  if (!menuItems.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Online siparis</Text>
      <Text style={styles.sub}>Urunleri sec, adet belirle. Restoran onaylayinca seni arayacak.</Text>

      <View style={styles.tableHead}>
        <Text style={[styles.headCell, styles.colCheck]} />
        <Text style={[styles.headCell, styles.colName]}>Urun</Text>
        <Text style={[styles.headCell, styles.colQty]}>Adet</Text>
        <Text style={[styles.headCell, styles.colPrice]}>Tutar</Text>
      </View>

      {menuItems.map((item) => (
        <OrderRow
          key={item.id}
          item={item}
          state={lines[item.id]}
          onToggle={() => toggleItem(item.id)}
          onMinus={() => setQuantity(item.id, -1)}
          onPlus={() => setQuantity(item.id, 1)}
        />
      ))}

      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="Telefon (05xx xxx xx xx)"
        placeholderTextColor={GastroColors.muted}
        keyboardType="phone-pad"
      />
      <TextInput
        style={[styles.input, styles.noteInput]}
        value={note}
        onChangeText={setNote}
        placeholder="Not (opsiyonel)"
        placeholderTextColor={GastroColors.muted}
        multiline
      />

      <View style={styles.footer}>
        <Text style={styles.totalLabel}>Toplam</Text>
        <Text style={styles.totalValue}>{selectedTotal.toFixed(0)} TL</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.submitBtn, (submitting || selectedCount === 0) && styles.submitDisabled]}
        disabled={submitting || selectedCount === 0}
        onPress={() => void onSubmit()}>
        {submitting ? (
          <ActivityIndicator color="#141414" />
        ) : (
          <Text style={styles.submitText}>Siparisi gonder</Text>
        )}
      </Pressable>
      <Text style={styles.legal}>Numaraniz yalnizca bu restorana iletilir; odeme kapida.</Text>
    </View>
  );
}

function OrderRow({
  item,
  state,
  onToggle,
  onMinus,
  onPlus,
}: {
  item: RestaurantMenuItem;
  state?: LineState;
  onToggle: () => void;
  onMinus: () => void;
  onPlus: () => void;
}) {
  const selected = Boolean(state?.selected);
  const qty = state?.quantity ?? 1;
  const lineTotal = selected ? item.price_tl * qty : 0;

  return (
    <View style={styles.row}>
      <Pressable style={styles.colCheck} onPress={onToggle} accessibilityRole="checkbox" accessibilityState={{ checked: selected }}>
        <View style={[styles.checkbox, selected && styles.checkboxOn]}>
          {selected ? <Text style={styles.checkMark}>✓</Text> : null}
        </View>
      </Pressable>
      <Pressable style={styles.colName} onPress={onToggle}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.unitPrice}>{item.price_tl.toFixed(0)} TL</Text>
      </Pressable>
      <View style={styles.colQty}>
        {selected ? (
          <View style={styles.qtyWrap}>
            <Pressable style={styles.qtyBtn} onPress={onMinus}>
              <Text style={styles.qtyBtnText}>−</Text>
            </Pressable>
            <Text style={styles.qtyValue}>{qty}</Text>
            <Pressable style={styles.qtyBtn} onPress={onPlus}>
              <Text style={styles.qtyBtnText}>+</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.dash}>—</Text>
        )}
      </View>
      <Text style={styles.colPrice}>{selected ? `${lineTotal.toFixed(0)} TL` : '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  title: { color: GastroColors.text, fontSize: 18, fontWeight: '800' },
  sub: { color: GastroColors.muted, fontSize: 13, lineHeight: 18 },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: GastroColors.border,
  },
  headCell: { color: GastroColors.muted, fontSize: 11, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: GastroColors.border,
    gap: 6,
  },
  colCheck: { width: 36, alignItems: 'center' },
  colName: { flex: 1, gap: 2 },
  colQty: { width: 88, alignItems: 'center' },
  colPrice: { width: 72, textAlign: 'right', color: GastroColors.gold, fontWeight: '700', fontSize: 13 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: GastroColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: GastroColors.accent, borderColor: GastroColors.accent },
  checkMark: { color: '#141414', fontWeight: '800', fontSize: 14 },
  itemName: { color: GastroColors.text, fontSize: 14, fontWeight: '600' },
  unitPrice: { color: GastroColors.muted, fontSize: 11 },
  qtyWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GastroColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { color: GastroColors.text, fontSize: 16, fontWeight: '700' },
  qtyValue: { color: GastroColors.text, minWidth: 18, textAlign: 'center', fontWeight: '700' },
  dash: { color: GastroColors.muted },
  input: {
    borderWidth: 1,
    borderColor: GastroColors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: GastroColors.text,
    backgroundColor: GastroColors.input,
  },
  noteInput: { minHeight: 72, textAlignVertical: 'top' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  totalLabel: { color: GastroColors.muted, fontWeight: '700' },
  totalValue: { color: GastroColors.gold, fontSize: 20, fontWeight: '800' },
  error: { color: '#f87171', fontSize: 13 },
  submitBtn: {
    backgroundColor: GastroColors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#141414', fontWeight: '800', fontSize: 15 },
  legal: { color: GastroColors.muted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  pendingCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GastroColors.gold,
    backgroundColor: 'rgba(255, 193, 7, 0.08)',
    padding: 14,
    gap: 6,
  },
  pendingTitle: { color: GastroColors.gold, fontWeight: '800', fontSize: 16 },
  pendingBody: { color: GastroColors.text, fontSize: 13, lineHeight: 18 },
  pendingMeta: { color: GastroColors.muted, fontSize: 12, fontWeight: '700' },
});
