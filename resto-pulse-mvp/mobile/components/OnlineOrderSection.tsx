import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGastroPostHog } from '@/lib/gastro-posthog';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  getActiveRestaurantOrder,
  sendOrderPhoneOtp,
  submitRestaurantOrder,
  verifyOrderPhoneOtp,
} from '@/lib/api';
import { ensureArray } from '@/lib/ensure-array';
import { coercePriceTl, formatPriceTl } from '@/lib/format-price-tl';
import { applyOrderPhoneSendOtpResult } from '@/lib/order-phone-otp';
import { normalizeTrMobileInput, formatTrMobileDisplay } from '@/lib/phone-tr';
import type { Restaurant, RestaurantMenuItem, RestaurantOrderRead } from '@/lib/types';

const PHONE_STORAGE_KEY = 'gastroskor_order_phone';
const ADDRESS_STORAGE_KEY = 'gastroskor_order_address';

type LineState = {
  selected: boolean;
  quantity: number;
};

type Props = {
  restaurant: Restaurant;
  userEmail: string | null;
  onOrderSent?: () => void;
  onFieldFocus?: (offsetInSection: number) => void;
};

export function OnlineOrderSection({ restaurant, userEmail, onOrderSent, onFieldFocus }: Props) {
  const posthog = useGastroPostHog();
  const menuItems = useMemo(
    () =>
      ensureArray<RestaurantMenuItem>(restaurant.menu ?? restaurant.menu_preview).filter(
        (item) => Boolean(item?.id && item?.name),
      ),
    [restaurant.menu, restaurant.menu_preview],
  );
  const [lines, setLines] = useState<Record<string, LineState>>({});
  const [phone, setPhone] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifiedPhoneE164, setVerifiedPhoneE164] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpInfo, setOtpInfo] = useState<string | null>(null);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [pendingOrder, setPendingOrder] = useState<RestaurantOrderRead | null>(null);
  const [rejectedOrder, setRejectedOrder] = useState<RestaurantOrderRead | null>(null);
  const [available, setAvailable] = useState(restaurant.online_orders_available ?? false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const phoneOffsetY = useRef(0);
  const addressOffsetY = useRef(0);
  const noteOffsetY = useRef(0);

  const focusField = useCallback(
    (offsetY: number) => {
      onFieldFocus?.(offsetY);
    },
    [onFieldFocus],
  );

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
      setRejectedOrder(active.pending_order ? null : active.recent_rejected_order ?? null);
      const orderPhone = active.order_phone;
      if (orderPhone?.verified && orderPhone.phone_e164) {
        setVerifiedPhoneE164(orderPhone.phone_e164);
        setPhone(formatTrMobileDisplay(orderPhone.phone_e164));
        setPhoneVerified(true);
      }
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
    if (pendingOrder || !rejectedOrder) return;
    const timer = setInterval(() => void refreshActive(), 30000);
    return () => clearInterval(timer);
  }, [pendingOrder, rejectedOrder, refreshActive]);

  useEffect(() => {
    AsyncStorage.getItem(PHONE_STORAGE_KEY)
      .then((value) => {
        if (value) setPhone(value);
      })
      .catch(() => undefined);
    AsyncStorage.getItem(ADDRESS_STORAGE_KEY)
      .then((value) => {
        if (value) setAddress(value);
      })
      .catch(() => undefined);
  }, []);

  const selectedTotal = useMemo(() => {
    return menuItems.reduce((sum, item) => {
      const row = lines[item.id];
      if (!row?.selected || row.quantity < 1) return sum;
      const unit = coercePriceTl(item.price_tl) ?? 0;
      return sum + unit * row.quantity;
    }, 0);
  }, [lines, menuItems]);

  const selectedCount = useMemo(
    () => Object.values(lines).filter((row) => row.selected && row.quantity > 0).length,
    [lines],
  );

  const normalizedPhone = useMemo(() => normalizeTrMobileInput(phone), [phone]);
  const phoneMatchesVerified = Boolean(
    phoneVerified && verifiedPhoneE164 && normalizedPhone === verifiedPhoneE164,
  );

  function onPhoneChange(value: string) {
    setPhone(value);
    const next = normalizeTrMobileInput(value);
    if (!next || next !== verifiedPhoneE164) {
      setPhoneVerified(false);
      setOtpSent(false);
      setOtpInfo(null);
      setOtpCode('');
    } else {
      setPhoneVerified(true);
    }
  }

  async function onSendOtp() {
    if (!userEmail) return;
    if (!normalizedPhone) {
      setError('Gecerli bir cep telefonu girin (05xx xxx xx xx).');
      return;
    }
    setOtpSending(true);
    setError(null);
    setOtpInfo(null);
    try {
      const result = await sendOrderPhoneOtp(userEmail, phone.trim());
      await applyOrderPhoneSendOtpResult({
        result,
        phoneInput: phone,
        storageKey: PHONE_STORAGE_KEY,
        setVerifiedPhoneE164,
        setPhoneVerified,
        setOtpSent,
        setOtpCode,
        setOtpInfo,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SMS kodu gonderilemedi.');
    } finally {
      setOtpSending(false);
    }
  }

  async function onVerifyOtp() {
    if (!userEmail) return;
    if (!normalizedPhone) {
      setError('Once gecerli telefon numarasi girin.');
      return;
    }
    if (otpCode.trim().length < 4) {
      setError('SMS kodunu girin.');
      return;
    }
    setOtpVerifying(true);
    setError(null);
    try {
      const status = await verifyOrderPhoneOtp(userEmail, phone.trim(), otpCode.trim());
      if (status.verified && status.phone_e164) {
        setVerifiedPhoneE164(status.phone_e164);
        setPhoneVerified(true);
        setOtpSent(false);
        setOtpCode('');
        await AsyncStorage.setItem(PHONE_STORAGE_KEY, phone.trim());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dogrulama basarisiz.');
    } finally {
      setOtpVerifying(false);
    }
  }

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
    if (!normalizedPhone) {
      setError('Gecerli bir cep telefonu girin (05xx xxx xx xx).');
      return;
    }
    if (!phoneMatchesVerified) {
      setError(
        otpSent
          ? 'SMS kodunu girip Dogrula deyin.'
          : 'Once SMS kodu gonder deyin, gelen kodu dogrulayin.',
      );
      return;
    }
    if (address.trim().length < 10) {
      setError('Teslimat adresinizi yazin (mahalle, sokak, bina).');
      return;
    }

    setSubmitting(true);
    setError(null);
    posthog.capture('order_started', {
      restaurant_id: restaurant.id,
      item_count: payloadLines.length,
    });
    try {
      await AsyncStorage.setItem(PHONE_STORAGE_KEY, phone.trim());
      await AsyncStorage.setItem(ADDRESS_STORAGE_KEY, address.trim());
      const order = await submitRestaurantOrder(restaurant.id, {
        user_email: userEmail,
        customer_phone: phone.trim(),
        customer_address: address.trim(),
        note: note.trim() || undefined,
        lines: payloadLines,
      });
      posthog.capture('order_completed', {
        restaurant_id: restaurant.id,
        order_total: order.total_tl,
        payment_method: 'online',
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
          <Text style={styles.pendingMeta}>
            {pendingOrder.order_number ? `${pendingOrder.order_number} · ` : ''}
            {formatPriceTl(pendingOrder.total_tl, 0) ?? '—'} TL ·{' '}
            {ensureArray(pendingOrder.lines).length} kalem
          </Text>
        </View>
      </View>
    );
  }

  if (rejectedOrder) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Online siparis</Text>
        <View style={styles.rejectedCard}>
          <Text style={styles.rejectedTitle}>Siparis iptal edildi</Text>
          <Text style={styles.rejectedBody}>
            {rejectedOrder.reject_message
              ? `${restaurant.name}, ${rejectedOrder.reject_message} nedeniyle siparisinizi iptal etti.`
              : `${restaurant.name} siparisinizi iptal etti.`}
          </Text>
          {rejectedOrder.order_number ? (
            <Text style={styles.pendingMeta}>Siparis no: {rejectedOrder.order_number}</Text>
          ) : null}
          <Pressable style={styles.dismissBtn} onPress={() => setRejectedOrder(null)}>
            <Text style={styles.dismissBtnText}>Tamam, yeni siparis verebilirim</Text>
          </Pressable>
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

      <View
        onLayout={(event) => {
          phoneOffsetY.current = event.nativeEvent.layout.y;
        }}>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={onPhoneChange}
          onFocus={() => focusField(phoneOffsetY.current)}
          placeholder="Telefon (05xx xxx xx xx)"
          placeholderTextColor={GastroColors.muted}
          keyboardType="phone-pad"
        />
      </View>
      {phoneMatchesVerified ? (
        <Text style={styles.verifiedHint}>Telefon dogrulandi</Text>
      ) : normalizedPhone ? (
        <View style={styles.otpBlock}>
          <Text style={styles.otpHint}>
            Sahte numaralari onlemek icin SMS ile dogrulama gerekli. Restoran sizi bu numaradan arayacak.
          </Text>
          {otpInfo ? <Text style={styles.otpInfo}>{otpInfo}</Text> : null}
          {!otpSent ? (
            <Pressable
              style={[styles.otpBtn, otpSending && styles.submitDisabled]}
              disabled={otpSending}
              onPress={() => void onSendOtp()}>
              {otpSending ? (
                <ActivityIndicator color={GastroColors.text} />
              ) : (
                <Text style={styles.otpBtnText}>SMS kodu gonder</Text>
              )}
            </Pressable>
          ) : (
            <View style={styles.otpRow}>
              <TextInput
                style={[styles.input, styles.otpInput]}
                value={otpCode}
                onChangeText={setOtpCode}
                onFocus={() => focusField(phoneOffsetY.current)}
                placeholder="6 haneli kod"
                placeholderTextColor={GastroColors.muted}
                keyboardType="number-pad"
                maxLength={6}
              />
              <Pressable
                style={[styles.otpVerifyBtn, otpVerifying && styles.submitDisabled]}
                disabled={otpVerifying}
                onPress={() => void onVerifyOtp()}>
                {otpVerifying ? (
                  <ActivityIndicator color="#141414" />
                ) : (
                  <Text style={styles.otpVerifyText}>Dogrula</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      ) : null}
      <View
        onLayout={(event) => {
          addressOffsetY.current = event.nativeEvent.layout.y;
        }}>
        <TextInput
          style={[styles.input, styles.noteInput]}
          value={address}
          onChangeText={setAddress}
          onFocus={() => focusField(addressOffsetY.current)}
          placeholder="Teslimat adresi (mahalle, sokak, bina, daire)"
          placeholderTextColor={GastroColors.muted}
          multiline
        />
      </View>
      <View
        onLayout={(event) => {
          noteOffsetY.current = event.nativeEvent.layout.y;
        }}>
        <TextInput
          style={[styles.input, styles.noteInput]}
          value={note}
          onChangeText={setNote}
          onFocus={() => focusField(noteOffsetY.current)}
          placeholder="Not (opsiyonel)"
          placeholderTextColor={GastroColors.muted}
          multiline
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.totalLabel}>Toplam</Text>
        <Text style={styles.totalValue}>{formatPriceTl(selectedTotal, 0) ?? '0'} TL</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.submitBtn, (submitting || selectedCount === 0) && styles.submitDisabled]}
        disabled={submitting || selectedCount === 0 || !phoneMatchesVerified}
        onPress={() => void onSubmit()}>
        {submitting ? (
          <ActivityIndicator color="#141414" />
        ) : (
          <Text style={styles.submitText}>Siparisi gonder</Text>
        )}
      </Pressable>
      <Text style={styles.legal}>Telefon ve adresiniz yalnizca bu restorana iletilir; odeme kapida.</Text>
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
  const unitPrice = coercePriceTl(item.price_tl) ?? 0;
  const lineTotal = selected ? unitPrice * qty : 0;

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
        <Text style={styles.unitPrice}>{formatPriceTl(item.price_tl, 0) ?? '—'} TL</Text>
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
      <Text style={styles.colPrice}>
        {selected ? `${formatPriceTl(lineTotal, 0) ?? '—'} TL` : '—'}
      </Text>
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
  verifiedHint: { color: '#4ade80', fontSize: 12, fontWeight: '700' },
  otpBlock: { gap: 8 },
  otpHint: { color: GastroColors.muted, fontSize: 12, lineHeight: 17 },
  otpInfo: { color: '#fbbf24', fontSize: 12, lineHeight: 17 },
  otpBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GastroColors.border,
    paddingVertical: 10,
    alignItems: 'center',
  },
  otpBtnText: { color: GastroColors.text, fontWeight: '700', fontSize: 13 },
  otpRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  otpInput: { flex: 1, marginBottom: 0 },
  otpVerifyBtn: {
    backgroundColor: GastroColors.accent,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 88,
    alignItems: 'center',
  },
  otpVerifyText: { color: '#141414', fontWeight: '800', fontSize: 13 },
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
  rejectedCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f87171',
    backgroundColor: 'rgba(248, 113, 113, 0.08)',
    padding: 14,
    gap: 8,
  },
  rejectedTitle: { color: '#f87171', fontWeight: '800', fontSize: 16 },
  rejectedBody: { color: GastroColors.text, fontSize: 13, lineHeight: 18 },
  dismissBtn: {
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GastroColors.border,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dismissBtnText: { color: GastroColors.text, fontWeight: '700', fontSize: 13 },
});
