import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { GastroColors, GastroStyles } from '@/constants/theme';
import {
  ACCOUNT_DELETION_CONFIRMATION,
  accountDeletionErrorMessage,
  isAccountDeletionConfirmed,
  normalizeDeletionConfirmation,
} from '@/lib/account-deletion';
import { AccountDeletionApiError, deleteMyAccount } from '@/lib/api';
import { loadRefreshToken } from '@/lib/auth-token';

type Props = {
  visible: boolean;
  onClose: () => void;
  onDeleted: () => Promise<void>;
};

const LOSS_ITEMS = [
  'Hesap bilgilerin (e-posta, ad, profil fotografi) kalici olarak silinir veya anonimlestirilir.',
  'GastroSkor yorumlarin anonimlesir; metin restoran istatistikleri icin kalabilir.',
  'GastroCoin bakiyen ve cüzdan kaydın silinir.',
  'Arkadasliklarin ve ozel mesajlarin tamamen silinir.',
  'Gurme sohbet mesajlarin "[silindi]" olarak isaretlenir.',
  'Tamamlanmis siparis kayitlarindaki kisisel bilgiler anonimlestirilir (tutar/tarih yasal saklama icin kalir).',
];

export function AccountDeletionFlow({ visible, onClose, onDeleted }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmationText, setConfirmationText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStep(1);
    setConfirmationText('');
    setBusy(false);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    if (busy) return;
    reset();
    onClose();
  }, [busy, onClose, reset]);

  const handleContinue = useCallback(() => {
    setError(null);
    setStep(2);
  }, []);

  const handleSubmit = useCallback(async () => {
    const confirmation = normalizeDeletionConfirmation(confirmationText);
    if (!isAccountDeletionConfirmed(confirmation)) {
      setError(`Onay icin tam olarak "${ACCOUNT_DELETION_CONFIRMATION}" yazin.`);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const refreshToken = await loadRefreshToken();
      await deleteMyAccount({
        confirmation: ACCOUNT_DELETION_CONFIRMATION,
        refresh_token: refreshToken,
      });
      await onDeleted();
      reset();
      onClose();
      Alert.alert(
        'Hesabiniz silindi',
        'Kisisel verileriniz isleme alindi. Ayni Google hesabiyla istediginiz zaman yeniden kayit olabilirsiniz.',
      );
    } catch (err) {
      if (err instanceof AccountDeletionApiError && err.status === 409) {
        const detail = err.message.toLowerCase();
        if (detail.includes('bekleyen')) {
          setError('Once bekleyen siparisini tamamla veya iptal et, sonra tekrar dene.');
        } else if (detail.includes('panel') || detail.includes('restoran')) {
          setError('Panel/restoran sahibi hesabi buradan silinemez. Destek ile iletisime gec.');
        } else {
          setError(err.message);
        }
      } else {
        setError(accountDeletionErrorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  }, [confirmationText, onClose, onDeleted, reset]);

  const canSubmit = isAccountDeletionConfirmed(confirmationText) && !busy;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {step === 1 ? (
            <>
              <Text style={styles.title}>Hesabini silmek istedigine emin misin?</Text>
              <Text style={styles.warningBadge}>GERI ALINAMAZ</Text>
              <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                <Text style={styles.sub}>
                  Bu islem kalicidir. Asagidakiler olur; devam etmeden once oku:
                </Text>
                {LOSS_ITEMS.map((item) => (
                  <View key={item} style={styles.bulletRow}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.actions}>
                <Pressable style={styles.cancelBtn} onPress={handleClose}>
                  <Text style={styles.cancelText}>Vazgec</Text>
                </Pressable>
                <Pressable style={styles.continueBtn} onPress={handleContinue}>
                  <Text style={styles.continueText}>Devam et</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>Son onay</Text>
              <Text style={styles.sub}>
                Hesabini kalici olarak silmek icin asagiya{' '}
                <Text style={styles.confirmPhrase}>{ACCOUNT_DELETION_CONFIRMATION}</Text> yaz.
              </Text>
              <TextInput
                style={styles.input}
                value={confirmationText}
                onChangeText={(value) => {
                  setConfirmationText(value);
                  setError(null);
                }}
                placeholder={ACCOUNT_DELETION_CONFIRMATION}
                placeholderTextColor={GastroColors.placeholder}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!busy}
                accessibilityLabel="Hesap silme onay metni"
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={styles.actions}>
                <Pressable
                  style={styles.cancelBtn}
                  disabled={busy}
                  onPress={() => {
                    setStep(1);
                    setConfirmationText('');
                    setError(null);
                  }}>
                  <Text style={styles.cancelText}>Geri</Text>
                </Pressable>
                <Pressable
                  style={[styles.deleteBtn, !canSubmit && styles.deleteBtnDisabled]}
                  disabled={!canSubmit}
                  onPress={() => void handleSubmit()}>
                  {busy ? (
                    <ActivityIndicator color={GastroColors.text} />
                  ) : (
                    <Text style={styles.deleteText}>Hesabimi kalici olarak sil</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: GastroColors.panel,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: GastroColors.rose,
    maxHeight: '88%',
  },
  title: { color: GastroColors.text, fontSize: 18, fontWeight: '800' },
  warningBadge: {
    alignSelf: 'flex-start',
    color: GastroColors.bad,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    borderWidth: 1,
    borderColor: GastroColors.bad,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sub: { color: GastroColors.muted, fontSize: 13, lineHeight: 20 },
  confirmPhrase: { color: GastroColors.text, fontWeight: '800' },
  scroll: { maxHeight: 280 },
  scrollContent: { gap: 8, paddingBottom: 4 },
  bulletRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bullet: { color: GastroColors.bad, fontSize: 14, lineHeight: 20 },
  bulletText: { flex: 1, color: GastroColors.text, fontSize: 13, lineHeight: 20 },
  input: {
    ...GastroStyles.input,
    marginTop: 4,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  error: GastroStyles.errorText,
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    ...GastroStyles.btnOutline,
    borderColor: GastroColors.border,
  },
  cancelText: { color: GastroColors.muted, fontWeight: '700', textAlign: 'center' },
  continueBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: GastroColors.bad,
  },
  continueText: { color: GastroColors.text, fontWeight: '800' },
  deleteBtn: {
    flex: 1.4,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GastroColors.bad,
    minHeight: 46,
  },
  deleteBtnDisabled: {
    opacity: 0.45,
  },
  deleteText: { color: GastroColors.text, fontWeight: '800', textAlign: 'center' },
});
