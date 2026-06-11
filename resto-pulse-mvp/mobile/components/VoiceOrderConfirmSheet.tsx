import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GastroColors } from '@/constants/theme';
import {
  getOrderPhoneStatus,
  sendOrderPhoneOtp,
  submitRestaurantOrder,
  verifyOrderPhoneOtp,
} from '@/lib/api';
import { coercePriceTl, formatPriceTl } from '@/lib/format-price-tl';
import { applyOrderPhoneSendOtpResult } from '@/lib/order-phone-otp';
import { formatTrMobileDisplay, normalizeTrMobileInput } from '@/lib/phone-tr';
import {
  formatVoiceOrderCommandSummary,
  resolveVoiceMenuLine,
  type VoiceOrderCommand,
} from '@/lib/parse-voice-order-command';
import type { RestaurantListItem, VoiceMenuMatch } from '@/lib/types';

const PHONE_STORAGE_KEY = 'gastroskor_order_phone';
const ADDRESS_STORAGE_KEY = 'gastroskor_order_address';

type Props = {
  visible: boolean;
  command: VoiceOrderCommand | null;
  restaurant: RestaurantListItem | null;
  userEmail: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function VoiceOrderConfirmSheet({
  visible,
  command,
  restaurant,
  userEmail,
  onClose,
  onSuccess,
}: Props) {
  const insets = useSafeAreaInsets();
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifiedPhoneE164, setVerifiedPhoneE164] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpInfo, setOtpInfo] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<VoiceMenuMatch | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolved = useMemo(() => {
    if (!command || !restaurant) return { line: null, choices: [], issue: null };
    return resolveVoiceMenuLine(restaurant.voice_menu_matches, command);
  }, [command, restaurant]);

  const activeLine = selectedMatch ?? resolved.line;

  useEffect(() => {
    if (!visible) {
      setSelectedMatch(null);
      setError(null);
      setOtpCode('');
      setOtpSent(false);
      setOtpInfo(null);
      return;
    }
    AsyncStorage.getItem(ADDRESS_STORAGE_KEY)
      .then((value) => {
        if (value) setAddress(value);
      })
      .catch(() => undefined);
    AsyncStorage.getItem(PHONE_STORAGE_KEY)
      .then((value) => {
        if (value) setPhone(value);
      })
      .catch(() => undefined);
    if (!userEmail) return;
    void getOrderPhoneStatus(userEmail)
      .then((status) => {
        if (status.verified && status.phone_e164) {
          setVerifiedPhoneE164(status.phone_e164);
          setPhone(formatTrMobileDisplay(status.phone_e164));
          setPhoneVerified(true);
        }
      })
      .catch(() => undefined);
  }, [visible, userEmail]);

  useEffect(() => {
    setSelectedMatch(null);
  }, [command?.rawText, restaurant?.id]);

  const unitPrice = activeLine ? coercePriceTl(activeLine.price_tl) : null;
  const lineTotal = unitPrice != null && command ? unitPrice * command.quantity : 0;
  const normalizedPhone = normalizeTrMobileInput(phone);
  const phoneOk = Boolean(phoneVerified && verifiedPhoneE164 && normalizedPhone === verifiedPhoneE164);

  async function onSendOtp() {
    if (!userEmail || !normalizedPhone) {
      setError('Geçerli cep telefonu girin (05xx xxx xx xx).');
      return;
    }
    setOtpSending(true);
    setError(null);
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
      setError(err instanceof Error ? err.message : 'SMS gönderilemedi.');
    } finally {
      setOtpSending(false);
    }
  }

  async function onVerifyOtp() {
    if (!userEmail || !normalizedPhone) return;
    setOtpVerifying(true);
    setError(null);
    try {
      const status = await verifyOrderPhoneOtp(userEmail, phone.trim(), otpCode.trim());
      if (status.verified && status.phone_e164) {
        setVerifiedPhoneE164(status.phone_e164);
        setPhone(formatTrMobileDisplay(status.phone_e164));
        setPhoneVerified(true);
        setOtpInfo('Telefon doğrulandı.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kod doğrulanamadı.');
    } finally {
      setOtpVerifying(false);
    }
  }

  async function onConfirm() {
    if (!userEmail) {
      Alert.alert('Giriş gerekli', 'Sipariş için önce hesabına giriş yap.');
      return;
    }
    if (!restaurant || !command || !activeLine) {
      setError(resolved.issue ?? 'Sipariş satırı seçilemedi.');
      return;
    }
    if (!phoneOk) {
      setError('Sipariş için SMS ile telefon doğrulaması gerekli.');
      return;
    }
    if (address.trim().length < 10) {
      setError('Teslimat adresini yazın (en az 10 karakter).');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const note = [
        command.paymentNote,
        'Gastro Sipariş komutu ile verildi.',
        phoneVerified ? 'Telefon doğrulandı — arama gerekmez.' : null,
      ]
        .filter(Boolean)
        .join(' ');

      await AsyncStorage.setItem(PHONE_STORAGE_KEY, phone.trim());
      await AsyncStorage.setItem(ADDRESS_STORAGE_KEY, address.trim());

      await submitRestaurantOrder(restaurant.id, {
        user_email: userEmail,
        customer_phone: phone.trim(),
        customer_address: address.trim(),
        note,
        lines: [{ menu_item_id: activeLine.menu_item_id, quantity: command.quantity }],
      });
      onSuccess();
      onClose();
      Alert.alert(
        'Sipariş iletildi',
        `${restaurant.name} siparişini panelden onaylayacak. Telefonun doğrulandığı için arama beklenmez.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sipariş gönderilemedi.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!command || !restaurant) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <KeyboardAvoidingView
          style={styles.keyboardWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            contentContainerStyle={styles.scrollContent}
            bounces={false}>
            <Pressable
              style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
              onPress={(e) => e.stopPropagation()}>
              <Text style={styles.kicker}>Sipariş onayı</Text>
              <Text style={styles.title}>{formatVoiceOrderCommandSummary(command)}</Text>
              <Text style={styles.sub}>{restaurant.name}</Text>

              {activeLine ? (
                <View style={styles.lineCard}>
                  <Text style={styles.lineName}>
                    {command.quantity}× {activeLine.label}
                  </Text>
                  <Text style={styles.linePrice}>{lineTotal.toFixed(0)} TL</Text>
                  <Text style={styles.linePay}>{command.paymentNote}</Text>
                </View>
              ) : null}

              {resolved.choices.length > 0 ? (
                <View style={styles.choiceBox}>
                  <Text style={styles.choiceLabel}>{resolved.issue}</Text>
                  {resolved.choices.map((row) => {
                    const on = selectedMatch?.menu_item_id === row.menu_item_id;
                    return (
                      <Pressable
                        key={row.menu_item_id}
                        style={[styles.choiceRow, on && styles.choiceRowOn]}
                        onPress={() => setSelectedMatch(row)}>
                        <Text style={[styles.choiceText, on && styles.choiceTextOn]}>
                          {row.label} · {formatPriceTl(row.price_tl, 0) ?? '—'} TL
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="Teslimat adresi"
                placeholderTextColor={GastroColors.muted}
                style={styles.input}
                multiline
              />

              <TextInput
                value={phone}
                onChangeText={(value) => {
                  setPhone(value);
                  const next = normalizeTrMobileInput(value);
                  if (!next || next !== verifiedPhoneE164) {
                    setPhoneVerified(false);
                    setOtpSent(false);
                    setOtpInfo(null);
                  }
                }}
                placeholder="05xx xxx xx xx"
                placeholderTextColor={GastroColors.muted}
                keyboardType="phone-pad"
                style={styles.input}
              />

              {!phoneOk ? (
                <View style={styles.otpRow}>
                  <Pressable style={styles.otpBtn} onPress={() => void onSendOtp()} disabled={otpSending}>
                    <Text style={styles.otpBtnText}>{otpSending ? '...' : 'SMS kodu gönder'}</Text>
                  </Pressable>
                  {otpSent ? (
                    <>
                      <TextInput
                        value={otpCode}
                        onChangeText={setOtpCode}
                        placeholder="SMS kodu"
                        placeholderTextColor={GastroColors.muted}
                        keyboardType="number-pad"
                        style={[styles.input, styles.otpInput]}
                      />
                      <Pressable style={styles.otpBtn} onPress={() => void onVerifyOtp()} disabled={otpVerifying}>
                        <Text style={styles.otpBtnText}>{otpVerifying ? '...' : 'Doğrula'}</Text>
                      </Pressable>
                    </>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.verified}>✓ Telefon doğrulandı</Text>
              )}

              {otpInfo ? <Text style={styles.info}>{otpInfo}</Text> : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}

              <View style={styles.actions}>
                <Pressable style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
                  <Text style={styles.cancelText}>Vazgeç</Text>
                </Pressable>
                <Pressable
                  style={[styles.confirmBtn, (!activeLine || submitting) && styles.confirmBtnDisabled]}
                  onPress={() => void onConfirm()}
                  disabled={!activeLine || submitting}>
                  {submitting ? (
                    <ActivityIndicator color="#141414" />
                  ) : (
                    <Text style={styles.confirmText}>Onayla ve gönder</Text>
                  )}
                </Pressable>
              </View>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  keyboardWrap: { maxHeight: '92%' },
  scrollContent: { flexGrow: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: '#1a1210',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.35)',
    padding: 18,
    gap: 10,
  },
  kicker: {
    color: GastroColors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: { color: GastroColors.text, fontSize: 18, fontWeight: '800' },
  sub: { color: GastroColors.muted, fontSize: 14 },
  lineCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.panel,
    padding: 12,
    gap: 4,
  },
  lineName: { color: GastroColors.text, fontSize: 16, fontWeight: '700' },
  linePrice: { color: GastroColors.gold, fontSize: 18, fontWeight: '900' },
  linePay: { color: GastroColors.muted, fontSize: 13 },
  choiceBox: { gap: 8 },
  choiceLabel: { color: GastroColors.gold, fontSize: 12 },
  choiceRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GastroColors.border,
    padding: 10,
    backgroundColor: GastroColors.panel,
  },
  choiceRowOn: { borderColor: GastroColors.accent, backgroundColor: GastroColors.accentSoft },
  choiceText: { color: GastroColors.muted, fontSize: 14, fontWeight: '600' },
  choiceTextOn: { color: GastroColors.accent, fontWeight: '800' },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.panel,
    color: GastroColors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 44,
  },
  otpRow: { gap: 8 },
  otpBtn: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GastroColors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  otpBtnText: { color: GastroColors.accent, fontSize: 13, fontWeight: '700' },
  otpInput: { minHeight: 44 },
  verified: { color: GastroColors.success, fontSize: 13, fontWeight: '700' },
  info: { color: GastroColors.muted, fontSize: 12 },
  error: { color: GastroColors.bad, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GastroColors.border,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: { color: GastroColors.muted, fontWeight: '700' },
  confirmBtn: {
    flex: 1.5,
    borderRadius: 12,
    backgroundColor: GastroColors.gold,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  confirmBtnDisabled: { opacity: 0.45 },
  confirmText: { color: '#141414', fontSize: 15, fontWeight: '900' },
});
