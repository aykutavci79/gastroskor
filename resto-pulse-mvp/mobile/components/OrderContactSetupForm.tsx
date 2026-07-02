import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { DeliveryAddressCascade } from '@/components/DeliveryAddressCascade';
import { GastroColorsLight } from '@/constants/theme';
import { sendOrderPhoneOtp, verifyOrderPhoneOtp } from '@/lib/api';
import type { StoredDeliveryAddress } from '@/lib/delivery-address-types';
import { readStoredDeliveryAddress, writeStoredDeliveryAddress } from '@/lib/delivery-address-storage';
import { applyOrderPhoneSendOtpResult } from '@/lib/order-phone-otp';
import {
  readStoredOrderPhone,
  writeStoredOrderPhone,
} from '@/lib/order-contact-secure-storage';
import { formatTrMobileDisplay, normalizeTrMobileInput } from '@/lib/phone-tr';

type Props = {
  userEmail: string | null;
  onReadyChange?: (ready: boolean) => void;
};

export function OrderContactSetupForm({ userEmail, onReadyChange }: Props) {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifiedPhoneE164, setVerifiedPhoneE164] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpInfo, setOtpInfo] = useState<string | null>(null);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState<StoredDeliveryAddress | null>(null);
  const [addressReady, setAddressReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedPhone = useMemo(() => normalizeTrMobileInput(phone), [phone]);
  const phoneMatchesVerified = Boolean(
    phoneVerified && verifiedPhoneE164 && normalizedPhone === verifiedPhoneE164,
  );
  const ready = phoneMatchesVerified && addressReady;

  useEffect(() => {
    onReadyChange?.(ready);
  }, [ready, onReadyChange]);

  useEffect(() => {
    void Promise.all([readStoredOrderPhone(), readStoredDeliveryAddress()])
      .then(([storedPhone, storedAddress]) => {
        if (storedPhone) setPhone(storedPhone);
        if (storedAddress) {
          setDeliveryAddress(storedAddress);
          setAddressReady(true);
        }
      })
      .catch(() => undefined);
  }, []);

  const onAddressChange = useCallback(async (next: StoredDeliveryAddress | null) => {
    setDeliveryAddress(next);
    setAddressReady(next != null);
    if (next) await writeStoredDeliveryAddress(next);
  }, []);

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

  const onSendOtp = useCallback(async () => {
    if (!userEmail) return;
    if (!normalizedPhone) {
      setError(t('phone.invalidPhone'));
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
        setVerifiedPhoneE164,
        setPhoneVerified,
        setOtpSent,
        setOtpCode,
        setOtpInfo,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('phone.smsSendFailed'));
    } finally {
      setOtpSending(false);
    }
  }, [normalizedPhone, phone, userEmail, t]);

  const onVerifyOtp = useCallback(async () => {
    if (!userEmail) return;
    if (otpCode.trim().length < 4) {
      setError(t('phone.enterCode'));
      return;
    }
    setOtpVerifying(true);
    setError(null);
    try {
      const status = await verifyOrderPhoneOtp(userEmail, phone.trim(), otpCode.trim());
      if (status.verified && status.phone_e164) {
        setVerifiedPhoneE164(status.phone_e164);
        setPhone(formatTrMobileDisplay(status.phone_e164));
        setPhoneVerified(true);
        setOtpSent(false);
        setOtpCode('');
        await writeStoredOrderPhone(phone);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('phone.verifyFailed'));
    } finally {
      setOtpVerifying(false);
    }
  }, [otpCode, phone, userEmail, t]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.lead}>{t('phone.description')}</Text>

      <Text style={styles.label}>{t('phone.phoneLabel')}</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={onPhoneChange}
        placeholder={t('phone.phonePlaceholder')}
        placeholderTextColor={GastroColorsLight.placeholder}
        keyboardType="phone-pad"
      />
      {phoneMatchesVerified ? (
        <Text style={styles.okHint}>{t('phone.verified')}</Text>
      ) : normalizedPhone ? (
        <View style={styles.otpBlock}>
          {otpInfo ? <Text style={styles.otpInfo}>{otpInfo}</Text> : null}
          {!otpSent ? (
            <Pressable
              style={[styles.ghostBtn, otpSending && styles.disabled]}
              disabled={otpSending}
              onPress={() => void onSendOtp()}>
              {otpSending ? (
                <ActivityIndicator color={GastroColorsLight.text} />
              ) : (
                <Text style={styles.ghostBtnText}>{t('phone.sendSmsBtn')}</Text>
              )}
            </Pressable>
          ) : (
            <View style={styles.otpRow}>
              <TextInput
                style={[styles.input, styles.otpInput]}
                value={otpCode}
                onChangeText={setOtpCode}
                placeholder={t('phone.codePlaceholder')}
                placeholderTextColor={GastroColorsLight.placeholder}
                keyboardType="number-pad"
                maxLength={6}
              />
              <Pressable
                style={[styles.accentBtn, otpVerifying && styles.disabled]}
                disabled={otpVerifying}
                onPress={() => void onVerifyOtp()}>
                {otpVerifying ? (
                  <ActivityIndicator color="#141414" />
                ) : (
                  <Text style={styles.accentBtnText}>{t('phone.verifyBtn')}</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      ) : null}

      <DeliveryAddressCascade
        value={deliveryAddress}
        onChange={(next) => void onAddressChange(next)}
        onReadyChange={setAddressReady}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {ready ? <Text style={styles.okHint}>{t('phone.setupDone')}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  lead: { color: GastroColorsLight.muted, fontSize: 14, lineHeight: 20 },
  label: { color: GastroColorsLight.text, fontSize: 14, fontWeight: '800' },
  input: {
    borderWidth: 1,
    borderColor: GastroColorsLight.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: GastroColorsLight.text,
    backgroundColor: '#FFFFFF',
    fontSize: 15,
  },
  okHint: { color: '#16A34A', fontSize: 13, fontWeight: '700' },
  otpBlock: { gap: 8 },
  otpInfo: { color: '#B45309', fontSize: 12, lineHeight: 17 },
  otpRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  otpInput: { flex: 1 },
  ghostBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GastroColorsLight.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ghostBtnText: { color: GastroColorsLight.text, fontWeight: '700' },
  accentBtn: {
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 96,
    alignItems: 'center',
  },
  accentBtnText: { color: '#141414', fontWeight: '800' },
  disabled: { opacity: 0.55 },
  error: { color: '#DC2626', fontSize: 13 },
});
