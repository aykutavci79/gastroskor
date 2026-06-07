import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { UserAvatar } from '@/components/UserAvatar';
import { GastroColors, GastroStyles } from '@/constants/theme';
import { useAppBadges } from '@/context/app-badges-context';
import {
  acceptFriendRequest,
  addFriend,
  cancelFriendRequest,
  listFriendRequests,
  listFriends,
  rejectFriendRequest,
  removeFriend,
  startDmThread,
} from '@/lib/api';
import type { FriendListItem, FriendRequestItem } from '@/lib/types';

type Props = {
  userEmail: string;
  compact?: boolean;
};

export function FriendsSection({ userEmail, compact = false }: Props) {
  const router = useRouter();
  const { refresh: refreshBadges } = useAppBadges();
  const [items, setItems] = useState<FriendListItem[]>([]);
  const [incoming, setIncoming] = useState<FriendRequestItem[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([listFriends(userEmail), listFriendRequests(userEmail)])
      .then(([friends, requests]) => {
        setItems(friends.items);
        setIncoming(requests.incoming);
        setOutgoing(requests.outgoing);
        void refreshBadges();
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Arkadaş listesi yüklenemedi.');
      })
      .finally(() => setLoading(false));
  }, [userEmail, refreshBadges]);

  useEffect(() => {
    load();
  }, [load]);

  async function onAddFriend() {
    const nick = nicknameInput.trim();
    if (!nick) return;
    setBusy(true);
    try {
      await addFriend(userEmail, nick);
      setNicknameInput('');
      Alert.alert('İstek gönderildi', `@${nick} kullanıcısına arkadaşlık isteği iletildi.`);
      load();
    } catch (err) {
      Alert.alert('İstek gönderilemedi', err instanceof Error ? err.message : 'Hata');
    } finally {
      setBusy(false);
    }
  }

  async function onAccept(requestId: string) {
    setBusy(true);
    try {
      await acceptFriendRequest(userEmail, requestId);
      load();
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Kabul edilemedi.');
    } finally {
      setBusy(false);
    }
  }

  async function onReject(requestId: string) {
    setBusy(true);
    try {
      await rejectFriendRequest(userEmail, requestId);
      load();
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Reddedilemedi.');
    } finally {
      setBusy(false);
    }
  }

  async function onCancelOutgoing(nickname: string) {
    setBusy(true);
    try {
      await cancelFriendRequest(userEmail, nickname);
      load();
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'İptal edilemedi.');
    } finally {
      setBusy(false);
    }
  }

  async function openDm(peerNickname: string) {
    try {
      const payload = await startDmThread(userEmail, peerNickname);
      router.push({
        pathname: '/dm/[threadId]',
        params: { threadId: payload.thread_id, nickname: payload.peer.nickname },
      } as never);
    } catch (err) {
      Alert.alert('Mesaj', err instanceof Error ? err.message : 'Sohbet açılamadı.');
    }
  }

  async function onRemove(peerNickname: string) {
    Alert.alert('Arkadaşlık', `@${peerNickname} listeden çıkarılsın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Çıkar',
        style: 'destructive',
        onPress: () => {
          void removeFriend(userEmail, peerNickname)
            .then(() => load())
            .catch((err) =>
              Alert.alert('Hata', err instanceof Error ? err.message : 'Silinemedi.'),
            );
        },
      },
    ]);
  }

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <Text style={styles.title}>Arkadaşlarım</Text>
      <Text style={styles.sub}>
        Takma ad ile istek gönder. Karşı taraf kabul edince mesajlaşabilirsiniz.
      </Text>

      <View style={styles.addRow}>
        <TextInput
          style={[GastroStyles.input, styles.input]}
          placeholder="@takmaad"
          placeholderTextColor={GastroColors.placeholder}
          value={nicknameInput}
          onChangeText={setNicknameInput}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!busy}
        />
        <Pressable
          style={[styles.addBtn, (busy || !nicknameInput.trim()) && styles.addBtnDisabled]}
          onPress={() => void onAddFriend()}
          disabled={busy || !nicknameInput.trim()}>
          <Text style={styles.addBtnText}>{busy ? '…' : 'İstek gönder'}</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={GastroColors.accent} style={{ marginVertical: 12 }} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <>
          {incoming.length > 0 ? (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Gelen istekler ({incoming.length})</Text>
              {incoming.map((request) => (
                <View key={request.id} style={styles.row}>
                  <UserAvatar
                    avatarUrl={request.peer.avatar_url}
                    avatarPreset={request.peer.avatar_preset}
                    size={36}
                    fallbackLabel={request.peer.nickname}
                  />
                  <View style={styles.rowMeta}>
                    <Text style={styles.rowName}>@{request.peer.nickname}</Text>
                  </View>
                  <Pressable
                    style={styles.acceptBtn}
                    onPress={() => void onAccept(request.id)}
                    disabled={busy}>
                    <Text style={styles.acceptBtnText}>Kabul</Text>
                  </Pressable>
                  <Pressable onPress={() => void onReject(request.id)} hitSlop={8} disabled={busy}>
                    <Text style={styles.rejectText}>Reddet</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          {outgoing.length > 0 ? (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Giden istekler ({outgoing.length})</Text>
              {outgoing.map((request) => (
                <View key={request.id} style={styles.row}>
                  <UserAvatar
                    avatarUrl={request.peer.avatar_url}
                    avatarPreset={request.peer.avatar_preset}
                    size={36}
                    fallbackLabel={request.peer.nickname}
                  />
                  <View style={styles.rowMeta}>
                    <Text style={styles.rowName}>@{request.peer.nickname}</Text>
                    <Text style={styles.rowScore}>Bekliyor</Text>
                  </View>
                  <Pressable onPress={() => void onCancelOutgoing(request.peer.nickname)} hitSlop={8}>
                    <Text style={styles.rejectText}>İptal</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          {items.length === 0 ? (
            <Text style={styles.muted}>Henüz arkadaş yok. Gurme sohbetten veya yukarıdan ekle.</Text>
          ) : (
            <View style={styles.list}>
              <Text style={styles.sectionLabel}>Arkadaşlar ({items.length})</Text>
              {items.map((friend) => (
                <View key={friend.id} style={styles.row}>
                  <UserAvatar
                    avatarUrl={friend.avatar_url}
                    avatarPreset={friend.avatar_preset}
                    size={36}
                    fallbackLabel={friend.nickname}
                  />
                  <View style={styles.rowMeta}>
                    <Text style={styles.rowName}>@{friend.nickname}</Text>
                    {friend.gastro_score != null ? (
                      <Text style={styles.rowScore}>Gastro {friend.gastro_score.toFixed(1)}</Text>
                    ) : null}
                  </View>
                  <Pressable style={styles.msgBtn} onPress={() => void openDm(friend.nickname)}>
                    <Text style={styles.msgBtnText}>Mesaj</Text>
                  </Pressable>
                  <Pressable onPress={() => void onRemove(friend.nickname)} hitSlop={8}>
                    <Text style={styles.removeText}>×</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.panel,
    padding: 16,
    gap: 10,
  },
  cardCompact: { marginTop: 0 },
  title: { color: GastroColors.text, fontSize: 16, fontWeight: '800' },
  sub: { color: GastroColors.muted, fontSize: 12, lineHeight: 18 },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { flex: 1, minHeight: 44 },
  addBtn: {
    backgroundColor: GastroColors.accent,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  addBtnDisabled: { opacity: 0.45 },
  addBtnText: { color: GastroColors.accentDark, fontWeight: '800' },
  muted: { color: GastroColors.muted, fontSize: 13 },
  error: { color: '#f87171', fontSize: 13 },
  sectionBlock: { gap: 8 },
  sectionLabel: { color: GastroColors.text, fontSize: 13, fontWeight: '700' },
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GastroColors.border,
    padding: 10,
  },
  rowMeta: { flex: 1, gap: 2 },
  rowName: { color: GastroColors.text, fontWeight: '700', fontSize: 14 },
  rowScore: { color: GastroColors.muted, fontSize: 11 },
  acceptBtn: {
    borderRadius: 10,
    backgroundColor: GastroColors.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  acceptBtnText: { color: GastroColors.accentDark, fontWeight: '800', fontSize: 12 },
  rejectText: { color: '#f87171', fontWeight: '700', fontSize: 12, paddingHorizontal: 4 },
  msgBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GastroColors.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  msgBtnText: { color: GastroColors.accent, fontWeight: '700', fontSize: 12 },
  removeText: { color: GastroColors.muted, fontSize: 22, fontWeight: '300', paddingHorizontal: 4 },
});
