import { writeStoredOrderPhone } from '@/lib/order-contact-secure-storage';
import type { OrderPhoneSendOtpResponse } from '@/lib/types';

type ApplyAutoVerifyArgs = {
  result: OrderPhoneSendOtpResponse;
  phoneInput: string;
  setVerifiedPhoneE164: (value: string) => void;
  setPhoneVerified: (value: boolean) => void;
  setOtpSent: (value: boolean) => void;
  setOtpCode: (value: string) => void;
  setOtpInfo: (value: string | null) => void;
};

/** Test bypass numarasi: send-otp sonrasi SMS adimini atla. */
export async function applyOrderPhoneSendOtpResult({
  result,
  phoneInput,
  setVerifiedPhoneE164,
  setPhoneVerified,
  setOtpSent,
  setOtpCode,
  setOtpInfo,
}: ApplyAutoVerifyArgs): Promise<boolean> {
  if (result.auto_verified && result.order_phone?.verified && result.order_phone.phone_e164) {
    setVerifiedPhoneE164(result.order_phone.phone_e164);
    setPhoneVerified(true);
    setOtpSent(false);
    setOtpCode('');
    setOtpInfo(result.info_message ?? 'Telefon dogrulandi.');
    await writeStoredOrderPhone(phoneInput);
    return true;
  }

  setOtpSent(true);
  if (result.info_message) {
    setOtpInfo(result.info_message);
  } else if (result.delivery_mode === 'live') {
    setOtpInfo(
      `${result.phone_masked} numarasina SMS gonderildi. Kod ${result.expires_in_minutes} dk gecerli.`,
    );
  }
  return false;
}

type AutoVerifyBypassArgs = Omit<ApplyAutoVerifyArgs, 'result'> & {
  userEmail: string;
};

/** Test bypass numarasi: send-otp cagir, SMS adimini atla (Railway ORDER_PHONE_TEST_BYPASS). */
export async function tryAutoVerifyOrderPhoneBypass({
  userEmail,
  phoneInput,
  setVerifiedPhoneE164,
  setPhoneVerified,
  setOtpSent,
  setOtpCode,
  setOtpInfo,
}: AutoVerifyBypassArgs): Promise<boolean> {
  const trimmed = phoneInput.trim();
  if (!trimmed || trimmed.replace(/\D/g, '').length < 10) return false;

  const { sendOrderPhoneOtp } = await import('@/lib/api');
  try {
    const result = await sendOrderPhoneOtp(userEmail, trimmed);
    return applyOrderPhoneSendOtpResult({
      result,
      phoneInput: trimmed,
      setVerifiedPhoneE164,
      setPhoneVerified,
      setOtpSent,
      setOtpCode,
      setOtpInfo,
    });
  } catch {
    return false;
  }
}
