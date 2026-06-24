import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { HubPressable } from '@/components/eglence/HubPressable';
import { GastroCoinMark } from '@/components/eglence/GastroCoinMark';
import { GASTROCOIN_LABEL, GASTROCOIN_SHORT, GastroCoinTheme } from '@/constants/gastrocoin-theme';
import { GastroColors } from '@/constants/theme';
import { shareReferralInvite } from '@/lib/referral-share';

type Props = {
  visible: boolean;
  balance: number | null;
  onClose: () => void;
  /** Davet görevinden açıldıysa paylaşım bölümü öne çıkar. */
  inviteFocus?: boolean;
  referrerId?: string | null;
};

const EARN_TASKS = [
  { icon: 'calendar' as const, title: 'Günlük giriş', reward: `+10 ${GASTROCOIN_SHORT}`, note: 'Her gün bir kez' },
  { icon: 'cart' as const, title: 'Online sipariş', reward: `+15 ${GASTROCOIN_SHORT}`, note: 'İlk sipariş +5 bonus (toplam 20)' },
  { icon: 'heart' as const, title: '3 farklı restoran takibi', reward: `+10 ${GASTROCOIN_SHORT}`, note: 'Aynı gün 3. yeni takipte' },
  { icon: 'people' as const, title: 'Arkadaş daveti', reward: `+10 ${GASTROCOIN_SHORT}`, note: 'Davetli ilk giriş yaptığında' },
  { icon: 'star' as const, title: 'GS yorum / puan', reward: `+5 ${GASTROCOIN_SHORT}`, note: 'Günde bir kez, yorum gönderince otomatik' },
  { icon: 'gift' as const, title: 'Hoş geldin hediyesi', reward: `+10 ${GASTROCOIN_SHORT}`, note: 'Hesap açılışında bir kez' },
];

const SPEND_RULES = [
  'Kelime Sofrası: ilk 2 ipucu ücretsiz',
  `3–8. ipuçları: 5 ${GASTROCOIN_SHORT} / ipucu`,
  `Market: oyun hakları 8–12 ${GASTROCOIN_SHORT}`,
];

const COMING_SOON = ['Restoran paylaşımı'];

export function JetonEarnSheet({ visible, balance, onClose, inviteFocus = false, referrerId }: Props) {
  const [sharing, setSharing] = useState(false);

  async function onShareInvite() {
    if (!referrerId?.trim()) {
      Alert.alert('Giriş gerekli', 'Davet linki için önce hesabına giriş yap.');
      return;
    }
    setSharing(true);
    try {
      await shareReferralInvite(referrerId);
    } catch {
      Alert.alert('Paylaşım', 'Davet linki paylaşılamadı. Biraz sonra tekrar dene.');
    } finally {
      setSharing(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <HubPressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.hero}>
            <GastroCoinMark variant="wallet-coin" size={52} />
            <View style={styles.heroText}>
              <Text style={styles.title}>{GASTROCOIN_LABEL}</Text>
              <Text style={styles.balance}>
                Bakiye:{' '}
                <Text style={styles.balanceValue}>
                  {balance ?? '—'} {GASTROCOIN_SHORT}
                </Text>
              </Text>
              <Text style={styles.disclaimer}>Gerçek para değildir · oyun ve avantajlar için kazanılır</Text>
            </View>
          </View>

          {inviteFocus ? (
            <View style={styles.inviteCard}>
              <Text style={styles.inviteTitle}>Arkadaşını davet et</Text>
              <Text style={styles.inviteBody}>
                Linki paylaş. Arkadaşın ilk kez giriş yaptığında ikiniz de{' '}
                <Text style={styles.inviteReward}>+10 {GASTROCOIN_SHORT}</Text> kazanırsınız.
              </Text>
              <HubPressable
                style={[styles.inviteBtn, sharing && styles.inviteBtnDisabled]}
                onPress={() => void onShareInvite()}
                disabled={sharing}>
                <Ionicons name="share-social" size={18} color="#1A1A1A" />
                <Text style={styles.inviteBtnText}>{sharing ? 'Paylaşılıyor…' : 'Davet linkini paylaş'}</Text>
              </HubPressable>
            </View>
          ) : null}

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>{GASTROCOIN_SHORT} kazan</Text>
            {EARN_TASKS.map((task) => (
              <View key={task.title} style={styles.row}>
                <Ionicons name={task.icon} size={18} color={GastroCoinTheme.coinGold} />
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{task.title}</Text>
                  <Text style={styles.rowNote}>{task.note}</Text>
                </View>
                <Text style={styles.reward}>{task.reward}</Text>
              </View>
            ))}

            <Text style={styles.sectionTitle}>İpucu harcama</Text>
            {SPEND_RULES.map((line) => (
              <Text key={line} style={styles.bullet}>
                · {line}
              </Text>
            ))}

            <Text style={styles.sectionTitle}>Yakında</Text>
            {COMING_SOON.map((line) => (
              <Text key={line} style={styles.comingSoon}>
                · {line}
              </Text>
            ))}
          </ScrollView>

          <HubPressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Kapat</Text>
          </HubPressable>
        </Pressable>
      </HubPressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '86%',
    backgroundColor: GastroColors.bg,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 18,
    paddingBottom: 24,
    paddingTop: 10,
    borderWidth: 1,
    borderColor: GastroColors.border,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: GastroColors.border,
    marginBottom: 12,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: GastroCoinTheme.chipBg,
    borderWidth: 1,
    borderColor: GastroCoinTheme.chipBorder,
  },
  heroText: { flex: 1, gap: 4 },
  title: { color: GastroColors.text, fontSize: 20, fontWeight: '800' },
  balance: { color: GastroColors.muted, fontSize: 14 },
  balanceValue: { color: GastroCoinTheme.coinGoldLight, fontWeight: '800' },
  disclaimer: { color: GastroColors.muted, fontSize: 11, lineHeight: 16 },
  inviteCard: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: GastroCoinTheme.chipBg,
    borderWidth: 1,
    borderColor: GastroCoinTheme.chipBorder,
    gap: 8,
  },
  inviteTitle: { color: GastroColors.text, fontSize: 16, fontWeight: '800' },
  inviteBody: { color: GastroColors.muted, fontSize: 13, lineHeight: 19 },
  inviteReward: { color: GastroCoinTheme.coinGoldLight, fontWeight: '800' },
  inviteBtn: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: GastroCoinTheme.coinGold,
  },
  inviteBtnDisabled: { opacity: 0.7 },
  inviteBtnText: { color: '#1A1A1A', fontSize: 14, fontWeight: '800' },
  scroll: { maxHeight: 380 },
  sectionTitle: {
    color: GastroColors.text,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: GastroColors.border,
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { color: GastroColors.text, fontSize: 14, fontWeight: '700' },
  rowNote: { color: GastroColors.muted, fontSize: 12 },
  reward: { color: GastroCoinTheme.coinGold, fontSize: 12, fontWeight: '800' },
  bullet: { color: GastroColors.muted, fontSize: 13, lineHeight: 20 },
  comingSoon: { color: GastroColors.muted, fontSize: 12, lineHeight: 18, fontStyle: 'italic' },
  closeBtn: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: GastroColors.panel,
    borderWidth: 1,
    borderColor: GastroColors.border,
  },
  closeBtnText: { color: GastroColors.text, fontWeight: '700' },
});
