import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { UserAvatar } from '@/components/UserAvatar';
import { GastroColors } from '@/constants/theme';

type Props = {
  visible: boolean;
  nickname: string;
  avatarUrl?: string | null;
  avatarPreset?: string | null;
  isFriend?: boolean;
  friendRequestStatus?: string | null;
  isSelf?: boolean;
  onClose: () => void;
  onWhisper: () => void;
  onAddFriend: () => void;
  onAcceptFriend?: () => void;
  onRejectFriend?: () => void;
  onCancelFriendRequest?: () => void;
  onRemoveFriend: () => void;
  onSendDm: () => void;
};

export function NicknameActionSheet({
  visible,
  nickname,
  avatarUrl,
  avatarPreset,
  isFriend = false,
  friendRequestStatus = null,
  isSelf = false,
  onClose,
  onWhisper,
  onAddFriend,
  onAcceptFriend,
  onRejectFriend,
  onCancelFriendRequest,
  onRemoveFriend,
  onSendDm,
}: Props) {
  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <UserAvatar
              avatarUrl={avatarUrl}
              avatarPreset={avatarPreset}
              size={44}
              fallbackLabel={nickname}
            />
            <View style={styles.headerText}>
              <Text style={styles.nickname}>@{nickname}</Text>
              {!isSelf ? <Text style={styles.sub}>Ne yapmak istersin?</Text> : null}
            </View>
          </View>

          {isSelf ? (
            <Text style={styles.selfHint}>Bu senin takma adın.</Text>
          ) : (
            <View style={styles.actions}>
              <ActionButton label="Fısılda (@etiketle)" onPress={onWhisper} accent />
              {isFriend ? (
                <>
                  <ActionButton label="Özel mesaj gönder" onPress={onSendDm} />
                  <ActionButton label="Arkadaş listesinden çıkar" onPress={onRemoveFriend} danger />
                </>
              ) : friendRequestStatus === 'pending_incoming' ? (
                <>
                  <ActionButton label="Arkadaşlık isteğini kabul et" onPress={onAcceptFriend ?? onClose} accent />
                  <ActionButton label="Reddet" onPress={onRejectFriend ?? onClose} danger />
                </>
              ) : friendRequestStatus === 'pending_outgoing' ? (
                <>
                  <Text style={styles.pendingHint}>Arkadaşlık isteği bekliyor.</Text>
                  <ActionButton label="İsteği iptal et" onPress={onCancelFriendRequest ?? onClose} />
                </>
              ) : friendRequestStatus === 'blocked' || friendRequestStatus === 'cooldown' ? (
                <Text style={styles.pendingHint}>
                  {friendRequestStatus === 'blocked'
                    ? 'Bu kullanıcıya istek gönderemezsiniz.'
                    : 'Reddedildi. Bir süre sonra tekrar deneyebilirsiniz.'}
                </Text>
              ) : (
                <>
                  <ActionButton label="Arkadaşlık isteği gönder" onPress={onAddFriend} />
                </>
              )}
            </View>
          )}

          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Kapat</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ActionButton({
  label,
  onPress,
  accent = false,
  danger = false,
}: {
  label: string;
  onPress: () => void;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      style={[
        styles.actionBtn,
        accent && styles.actionBtnAccent,
        danger && styles.actionBtnDanger,
      ]}
      onPress={onPress}>
      <Text
        style={[
          styles.actionText,
          accent && styles.actionTextAccent,
          danger && styles.actionTextDanger,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  sheet: {
    backgroundColor: GastroColors.panel,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: GastroColors.border,
    padding: 16,
    gap: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1, gap: 2 },
  nickname: { color: GastroColors.text, fontSize: 18, fontWeight: '800' },
  sub: { color: GastroColors.muted, fontSize: 13 },
  selfHint: { color: GastroColors.muted, fontSize: 14, lineHeight: 20 },
  pendingHint: { color: GastroColors.muted, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  actions: { gap: 8 },
  actionBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GastroColors.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: GastroColors.bg,
  },
  actionBtnAccent: {
    borderColor: GastroColors.accent,
    backgroundColor: GastroColors.accentSoft,
  },
  actionBtnDanger: { borderColor: '#f87171' },
  actionText: { color: GastroColors.text, fontWeight: '700', fontSize: 15, textAlign: 'center' },
  actionTextAccent: { color: GastroColors.accent },
  actionTextDanger: { color: '#f87171' },
  cancelBtn: { paddingVertical: 10 },
  cancelText: { color: GastroColors.muted, textAlign: 'center', fontWeight: '600' },
});
