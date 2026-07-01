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
import { useTranslation } from 'react-i18next';

import { GastroColors, GastroStyles } from '@/constants/theme';
import {
  ACCOUNT_DELETION_CONFIRMATION,
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

export function AccountDeletionFlow({ visible, onClose, onDeleted }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmationText, setConfirmationText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lossItems = [
    t('deletion.loss1'),
    t('deletion.loss2'),
    t('deletion.loss3'),
    t('deletion.loss4'),
    t('deletion.loss5'),
    t('deletion.loss6'),
  ];

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
      setError(t('deletion.confirmError', { phrase: ACCOUNT_DELETION_CONFIRMATION }));
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
      Alert.alert(t('deletion.deletedTitle'), t('deletion.deletedMsg'));
    } catch (err) {
      if (err instanceof AccountDeletionApiError && err.status === 409) {
        const detail = err.message.toLowerCase();
        if (detail.includes('bekleyen')) {
          setError(t('deletion.pendingOrderError'));
        } else if (detail.includes('panel') || detail.includes('restoran')) {
          setError(t('deletion.panelOwnerError'));
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : t('deletion.genericError'));
      }
    } finally {
      setBusy(false);
    }
  }, [confirmationText, onClose, onDeleted, reset, t]);

  const canSubmit = isAccountDeletionConfirmed(confirmationText) && !busy;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {step === 1 ? (
            <>
              <Text style={styles.title}>{t('deletion.title')}</Text>
              <Text style={styles.warningBadge}>{t('deletion.irreversible')}</Text>
              <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                <Text style={styles.sub}>{t('deletion.intro')}</Text>
                {lossItems.map((item) => (
                  <View key={item} style={styles.bulletRow}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.actions}>
                <Pressable style={styles.cancelBtn} onPress={handleClose}>
                  <Text style={styles.cancelText}>{t('deletion.cancel')}</Text>
                </Pressable>
                <Pressable style={styles.continueBtn} onPress={handleContinue}>
                  <Text style={styles.continueText}>{t('deletion.continue')}</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>{t('deletion.step2Title')}</Text>
              <Text style={styles.sub}>
                {t('deletion.step2SubBefore')}{' '}
                <Text style={styles.confirmPhrase}>{ACCOUNT_DELETION_CONFIRMATION}</Text>{' '}
                {t('deletion.step2SubAfter')}
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
                accessibilityLabel={t('deletion.confirmLabel')}
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
                  <Text style={styles.cancelText}>{t('deletion.back')}</Text>
                </Pressable>
                <Pressable
                  style={[styles.deleteBtn, !canSubmit && styles.deleteBtnDisabled]}
                  disabled={!canSubmit}
                  onPress={() => void handleSubmit()}>
                  {busy ? (
                    <ActivityIndicator color={GastroColors.text} />
                  ) : (
                    <Text style={styles.deleteText}>{t('deletion.deleteBtn')}</Text>
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
