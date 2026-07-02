import { useGastroPostHog } from '@/lib/gastro-posthog';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

import { GastroVoiceMicButton } from '@/components/GastroVoiceMicButton';
import { SpeechMicErrorBoundary } from '@/components/SpeechMicErrorBoundary';
import { GastroColors } from '@/constants/theme';
import {
  getOrderPhoneStatus,
  sendOrderPhoneOtp,
  submitRestaurantOrder,
  verifyOrderPhoneOtp,
} from '@/lib/api';
import { coercePriceTl, formatPriceTl } from '@/lib/format-price-tl';
import {
  parseVoiceOrderConfirmIntent,
  polishVoiceOrderCommandTranscript,
} from '@/lib/voice-order-stt-fix';
import { ensureGastroPlaybackReady, gastroSpeakOrderConfirm, gastroStopSpeaking } from '@/lib/gastro-speak';
import { applyOrderPhoneSendOtpResult, tryAutoVerifyOrderPhoneBypass } from '@/lib/order-phone-otp';
import { DeliveryAddressCascade } from '@/components/DeliveryAddressCascade';
import { readStoredDeliveryAddress, writeStoredDeliveryAddress } from '@/lib/delivery-address-storage';
import { resolveDeviceCoords } from '@/lib/device-location';
import type { StoredDeliveryAddress } from '@/lib/delivery-address-types';
import { readStoredOrderPhone, writeStoredOrderPhone } from '@/lib/order-contact-secure-storage';
import { formatTrMobileDisplay, normalizeTrMobileInput } from '@/lib/phone-tr';
import {
  formatVoiceOrderCommandSummary,
  resolveVoiceMenuLines,
  type VoiceOrderCommand,
} from '@/lib/parse-voice-order-command';
import type { RestaurantListItem, VoiceMenuMatch } from '@/lib/types';

type Props = {
  visible: boolean;
  command: VoiceOrderCommand | null;
  restaurant: RestaurantListItem | null;
  userEmail: string | null;
  initialSelectedByLine?: Record<number, VoiceMenuMatch>;
  onClose: () => void;
  onSuccess: () => void;
};

export function VoiceOrderConfirmSheet({
  visible,
  command,
  restaurant,
  userEmail,
  initialSelectedByLine,
  onClose,
  onSuccess,
}: Props) {
  const { t } = useTranslation();
  const posthog = useGastroPostHog();
  const insets = useSafeAreaInsets();
  const [deliveryAddress, setDeliveryAddress] = useState<StoredDeliveryAddress | null>(null);
  const [addressReady, setAddressReady] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifiedPhoneE164, setVerifiedPhoneE164] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpInfo, setOtpInfo] = useState<string | null>(null);
  const [selectedByLine, setSelectedByLine] = useState<Record<number, VoiceMenuMatch>>({});
  const [submitting, setSubmitting] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmMicActive, setConfirmMicActive] = useState(false);
  const spokeConfirmRef = useRef(false);
  const submittingRef = useRef(false);
  const autoBypassAttemptRef = useRef<string | null>(null);
  const orderStartedRef = useRef(false);

  const resolved = useMemo(() => {
    if (!command || !restaurant) return { rows: [], blockingIssue: null };
    return resolveVoiceMenuLines(restaurant.voice_menu_matches, command);
  }, [command, restaurant]);

  const activeRows = useMemo(
    () =>
      resolved.rows.map((row) => ({
        ...row,
        active: selectedByLine[row.index] ?? row.line,
      })),
    [resolved.rows, selectedByLine],
  );

  const allLinesReady = activeRows.length > 0 && activeRows.every((row) => row.active != null);

  const orderTotal = useMemo(() => {
    return activeRows.reduce((sum, row) => {
      if (!row.active) return sum;
      const unit = coercePriceTl(row.active.price_tl);
      return unit != null ? sum + unit * row.intent.quantity : sum;
    }, 0);
  }, [activeRows]);

  const budgetExceeded =
    command?.priceMaxBudget != null && orderTotal > command.priceMaxBudget;

  useEffect(() => {
    if (!visible) {
      orderStartedRef.current = false;
      setSelectedByLine({});
      setError(null);
      setOtpCode('');
      setOtpSent(false);
      setOtpInfo(null);
      return;
    }
    if (!restaurant || !command || orderStartedRef.current) return;
    orderStartedRef.current = true;
    posthog.capture('order_started', {
      restaurant_id: restaurant.id,
      item_count: command.lines.length,
    });
  }, [visible, restaurant, command, posthog]);

  useEffect(() => {
    if (!visible) {
      setSelectedByLine({});
      setError(null);
      setOtpCode('');
      setOtpSent(false);
      setOtpInfo(null);
      return;
    }
    if (!userEmail) return;

    let cancelled = false;

    void (async () => {
      const [storedAddress, storedPhone] = await Promise.all([
        readStoredDeliveryAddress().catch(() => null),
        readStoredOrderPhone().catch(() => null),
      ]);
      if (cancelled) return;
      if (storedAddress) {
        setDeliveryAddress(storedAddress);
        setAddressReady(true);
      }
      if (storedPhone) setPhone(storedPhone);

      const status = await getOrderPhoneStatus(userEmail).catch(() => null);
      if (cancelled || !status) return;

      if (status.verified && status.phone_e164) {
        setVerifiedPhoneE164(status.phone_e164);
        setPhone(formatTrMobileDisplay(status.phone_e164));
        setPhoneVerified(true);
        return;
      }

      const phoneCandidate = (storedPhone ?? phone).trim();
      if (!phoneCandidate) return;

      await tryAutoVerifyOrderPhoneBypass({
        userEmail,
        phoneInput: phoneCandidate,
        setVerifiedPhoneE164,
        setPhoneVerified,
        setOtpSent,
        setOtpCode,
        setOtpInfo,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, userEmail]);

  useEffect(() => {
    if (!visible || !userEmail || phoneVerified) return;
    const normalized = normalizeTrMobileInput(phone);
    if (!normalized || normalized === autoBypassAttemptRef.current) return;

    const timer = setTimeout(() => {
      autoBypassAttemptRef.current = normalized;
      void tryAutoVerifyOrderPhoneBypass({
        userEmail,
        phoneInput: phone,
        setVerifiedPhoneE164,
        setPhoneVerified,
        setOtpSent,
        setOtpCode,
        setOtpInfo,
      }).then((verified) => {
        if (!verified) autoBypassAttemptRef.current = null;
      });
    }, 700);

    return () => clearTimeout(timer);
  }, [visible, userEmail, phone, phoneVerified]);

  useEffect(() => {
    if (!visible) autoBypassAttemptRef.current = null;
  }, [visible]);

  useEffect(() => {
    setSelectedByLine(initialSelectedByLine ?? {});
  }, [command?.rawText, restaurant?.id, initialSelectedByLine]);

  const normalizedPhone = normalizeTrMobileInput(phone);
  const phoneOk = Boolean(phoneVerified && verifiedPhoneE164 && normalizedPhone === verifiedPhoneE164);

  useEffect(() => {
    if (!visible) {
      spokeConfirmRef.current = false;
      submittingRef.current = false;
      setConfirmMicActive(false);
      gastroStopSpeaking();
      return;
    }
    if (spokeConfirmRef.current || !command || !restaurant || !allLinesReady) return;

    setConfirmMicActive(false);
    void ensureGastroPlaybackReady().then(() => {
      gastroSpeakOrderConfirm(
        {
          restaurantName: restaurant.name,
          lines: activeRows.map((row) => ({
            quantity: row.intent.quantity,
            productLabel: row.active!.label,
          })),
          totalTl: formatPriceTl(orderTotal, 0),
          paymentNote: command.paymentNote,
        },
        () => setConfirmMicActive(true),
      );
    });
    spokeConfirmRef.current = true;
  }, [visible, command, restaurant, activeRows, allLinesReady, orderTotal]);

  async function onSendOtp() {
    if (!userEmail || !normalizedPhone) {
      setError(t('voice.invalidPhone'));
      return;
    }
    setOtpSending(true);
    setError(null);
    try {
      const result = await sendOrderPhoneOtp(userEmail, phone.trim());
      await applyOrderPhoneSendOtpResult({
        result,
        phoneInput: phone,
        setVerifiedPhoneE164,
        setPhoneVerified,
        setOtpSent,
        setOtpCode,
        setOtpInfo,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('voice.smsSendFailed'));
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
        setOtpInfo(t('voice.phoneVerified'));
        await writeStoredOrderPhone(phone);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('phone.verifyFailed'));
    } finally {
      setOtpVerifying(false);
    }
  }

  async function onConfirm() {
    if (submittingRef.current) return;
    if (!userEmail) {
      Alert.alert(t('auth.loginRequired'), t('voice.loginRequiredBody'));
      return;
    }
    if (!restaurant || !command || !allLinesReady) {
      setError(resolved.blockingIssue ?? t('voice.lineSelectFailed'));
      return;
    }
    if (budgetExceeded) {
      setError(
        t('voice.budgetExceeded', { total: formatPriceTl(orderTotal, 0) ?? orderTotal, budget: command.priceMaxBudget }),
      );
      return;
    }
    if (!phoneOk) {
      setError(t('voice.phoneRequired'));
      return;
    }
    if (!deliveryAddress || !addressReady) {
      setError(t('voice.addressRequired'));
      return;
    }

    setSubmitting(true);
    submittingRef.current = true;
    setError(null);
    try {
      const note = [
        command.paymentNote,
        t('voice.orderNote'),
        phoneVerified ? t('voice.phoneVerifiedNote') : null,
      ]
        .filter(Boolean)
        .join(' ');

      await writeStoredOrderPhone(phone);
      await writeStoredDeliveryAddress(deliveryAddress);
      const deviceCoords = await resolveDeviceCoords({ requestPermission: true });

      const order = await submitRestaurantOrder(restaurant.id, {
        user_email: userEmail,
        customer_phone: phone.trim(),
        delivery_street_node_id: deliveryAddress.streetNodeId,
        delivery_door_number: deliveryAddress.doorNumber,
        delivery_address_note: deliveryAddress.note,
        device_lat: deviceCoords?.lat,
        device_lng: deviceCoords?.lng,
        note,
        payment_method: 'cash',
        lines: activeRows.map((row) => ({
          menu_item_id: row.active!.menu_item_id,
          quantity: row.intent.quantity,
        })),
      });
      posthog.capture('order_completed', {
        restaurant_id: restaurant.id,
        order_total: order.total_tl,
        payment_method: command.paymentNote?.trim() || 'online',
      });
      onSuccess();
      onClose();
      Alert.alert(
        t('voice.successTitle'),
        t('voice.successBody', { name: restaurant.name }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t('voice.submitFailed'));
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  }

  function handleConfirmVoice(text: string, isFinal: boolean) {
    if (!isFinal || submitting) return;
    const intent = parseVoiceOrderConfirmIntent(polishVoiceOrderCommandTranscript(text));
    if (intent === 'cancel') {
      setConfirmMicActive(false);
      onClose();
      return;
    }
    if (intent === 'confirm') {
      void onConfirm();
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
              <Text style={styles.kicker}>{t('voice.confirmTitle')}</Text>
              <Text style={styles.title}>{formatVoiceOrderCommandSummary(command)}</Text>
              <Text style={styles.sub}>{restaurant.name}</Text>

              {activeRows.map((row) => {
                const unit = row.active ? coercePriceTl(row.active.price_tl) : null;
                const rowTotal = unit != null ? unit * row.intent.quantity : null;
                return (
                  <View key={row.index}>
                    {row.active ? (
                      <View style={styles.lineCard}>
                        <Text style={styles.lineName}>
                          {row.intent.quantity}× {row.active.label}
                        </Text>
                        <Text style={styles.linePrice}>
                          {formatPriceTl(rowTotal, 0) ?? '—'} TL
                        </Text>
                      </View>
                    ) : null}

                    {row.choices.length > 0 ? (
                      <View style={styles.choiceBox}>
                        <Text style={styles.choiceLabel}>{row.issue}</Text>
                        {row.choices.map((choice) => {
                          const on = selectedByLine[row.index]?.menu_item_id === choice.menu_item_id;
                          return (
                            <Pressable
                              key={choice.menu_item_id}
                              style={[styles.choiceRow, on && styles.choiceRowOn]}
                              onPress={() =>
                                setSelectedByLine((prev) => ({ ...prev, [row.index]: choice }))
                              }>
                              <Text style={[styles.choiceText, on && styles.choiceTextOn]}>
                                {choice.label} · {formatPriceTl(choice.price_tl, 0) ?? '—'} TL
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : row.issue && !row.active ? (
                      <Text style={styles.error}>{row.issue}</Text>
                    ) : null}
                  </View>
                );
              })}

              {allLinesReady ? (
                <View style={styles.lineCard}>
                  <Text style={styles.lineName}>{t('voice.totalLabel')}</Text>
                  <Text style={styles.linePrice}>{formatPriceTl(orderTotal, 0) ?? '—'} TL</Text>
                  <Text style={styles.linePay}>{command.paymentNote}</Text>
                  {command.priceMaxBudget != null ? (
                    <Text style={[styles.linePay, budgetExceeded && styles.error]}>
                      {t('voice.budgetLabel', { n: command.priceMaxBudget })}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              <DeliveryAddressCascade
                value={deliveryAddress}
                onChange={(next) => {
                  setDeliveryAddress(next);
                  setAddressReady(next != null);
                  if (next) void writeStoredDeliveryAddress(next);
                }}
                onReadyChange={setAddressReady}
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
                placeholder={t('phone.phonePlaceholder')}
                placeholderTextColor={GastroColors.muted}
                keyboardType="phone-pad"
                style={styles.input}
              />

              {!phoneOk ? (
                <View style={styles.otpRow}>
                  <Pressable style={styles.otpBtn} onPress={() => void onSendOtp()} disabled={otpSending}>
                    <Text style={styles.otpBtnText}>{otpSending ? '...' : t('phone.sendSmsBtn')}</Text>
                  </Pressable>
                  {otpSent ? (
                    <>
                      <TextInput
                        value={otpCode}
                        onChangeText={setOtpCode}
                        placeholder={t('phone.codePlaceholder')}
                        placeholderTextColor={GastroColors.muted}
                        keyboardType="number-pad"
                        style={[styles.input, styles.otpInput]}
                      />
                      <Pressable style={styles.otpBtn} onPress={() => void onVerifyOtp()} disabled={otpVerifying}>
                        <Text style={styles.otpBtnText}>{otpVerifying ? '...' : t('phone.verifyBtn')}</Text>
                      </Pressable>
                    </>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.verified}>{t('phone.verifiedTick')}</Text>
              )}

              {otpInfo ? <Text style={styles.info}>{otpInfo}</Text> : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}

              {Platform.OS === 'ios' && confirmMicActive && !submitting ? (
                <View style={styles.voiceConfirmRow}>
                  <Text style={styles.voiceConfirmHint}>{t('voice.voiceConfirmHint')}</Text>
                  <SpeechMicErrorBoundary compact>
                    <GastroVoiceMicButton
                      compact
                      active={confirmMicActive}
                      autoStart={false}
                      disabled={submitting}
                      onTranscript={handleConfirmVoice}
                    />
                  </SpeechMicErrorBoundary>
                </View>
              ) : null}

              <View style={styles.actions}>
                <Pressable style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
                  <Text style={styles.cancelText}>{t('voice.cancelBtn')}</Text>
                </Pressable>
                <Pressable
                  style={[styles.confirmBtn, (!allLinesReady || submitting || budgetExceeded) && styles.confirmBtnDisabled]}
                  onPress={() => void onConfirm()}
                  disabled={!allLinesReady || submitting || budgetExceeded}>
                  {submitting ? (
                    <ActivityIndicator color="#141414" />
                  ) : (
                    <Text style={styles.confirmText}>{t('voice.confirmBtn')}</Text>
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
  voiceConfirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.35)',
    backgroundColor: 'rgba(255,107,53,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  voiceConfirmHint: { flex: 1, color: GastroColors.muted, fontSize: 12, lineHeight: 16 },
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



