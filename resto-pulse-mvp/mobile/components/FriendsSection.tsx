import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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
import { addFriend, listFriends, removeFriend, startDmThread } from '@/lib/api';
import type { FriendListItem } from '@/lib/types';

type Props = {
  userEmail: string;
};

export function FriendsSection({ userEmail }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<FriendListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listFriends(userEmail)
      .then((data) => setItems(data.items))
      .catch((err) => {
        setItems([]);
        setError(err instanceof Error ? err.message : 'Arkadas listesi yuklenemedi.');
      })
      .finally(() => setLoading(false));
  }, [userEmail]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onAddFriend() {
    const nick = nicknameInput.trim();
    if (!nick) return;
    setBusy(true);
    try {
      await addFriend(userEmail, nick);
      setNicknameInput('');
      load();
    } catch (err) {
      Alert.alert('Arkadas eklenemedi', err instanceof Error ? err.message : 'Hata');
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
      Alert.alert('Mesaj', err instanceof Error ? err.message : 'Sohbet acilamadi.');
    }
  }

  async function onRemove(peerNickname: string) {
    Alert.alert('Arkadaslik', `@${peerNickname} listeden cikarilsin mi?`, [
      { text: 'Vazgec', style: 'cancel' },
      {
        text: 'Cikar',
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
    <View style={styles.card}>
      <Text style={styles.title}>Arkadaslarim</Text>
      <Text style={styles.sub}>
        Takma ad ile arkadas ekle. Sohbette birine dokunarak da ekleyebilirsin.
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
          <Text style={styles.addBtnText}>{busy ? '…' : 'Ekle'}</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={GastroColors.accent} style={{ marginVertical: 12 }} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : items.length === 0 ? (
        <Text style={styles.muted}>Henuz arkadas yok. Gurme sohbetten veya yukaridan ekle.</Text>
      ) : (
        <View style={styles.list}>
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
