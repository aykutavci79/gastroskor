import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { GourmetChatMessageBubble } from '@/components/GourmetChatCards';
import { NicknameActionSheet } from '@/components/NicknameActionSheet';
import { GastroColors, GastroStyles } from '@/constants/theme';
import { useSession } from '@/context/session-context';
import {
  ReviewModerationApiError,
  addFriend,
  createGourmetChatMessage,
  getPublicUserByNickname,
  listGourmetChatMessages,
  removeFriend,
  startDmThread,
} from '@/lib/api';
import type { GourmetChatAuthor, GourmetChatMessage } from '@/lib/types';

const CITY = 'Bursa';
const POLL_MS = 12_000;

function param(value: string | string[] | undefined, fallback = '') {
  return Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;
}

export default function GurmeRoomScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<Record<string, string | string[] | undefined>>();
  const roomSlug = param(params.roomSlug);
  const roomTitle = param(params.title, 'Oda');
  const roomEmoji = param(params.emoji, '💬');
  const { user } = useSession();

  const listRef = useRef<FlatList<GourmetChatMessage>>(null);
  const [messages, setMessages] = useState<GourmetChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetNickname, setSheetNickname] = useState('');
  const [sheetAuthor, setSheetAuthor] = useState<GourmetChatAuthor | null>(null);
  const [sheetIsFriend, setSheetIsFriend] = useState(false);
  const composerRef = useRef<TextInput>(null);

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated }));
  }, []);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setError(null);
      try {
        const payload = await listGourmetChatMessages(roomSlug, CITY);
        setMessages(payload.items);
      } catch (err) {
        if (!silent) setError(err instanceof Error ? err.message : 'Mesajlar yuklenemedi.');
      } finally {
        setLoading(false);
      }
    },
    [roomSlug],
  );

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(true), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom(true);
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(showEvent, () => {
      setTimeout(() => scrollToBottom(true), 50);
    });
    return () => sub.remove();
  }, [scrollToBottom]);

  const ensureCanPost = () => {
    if (!user?.email) {
      Alert.alert('Giris gerekli', 'Sohbete yazmak icin once hesabinla giris yap.');
      return false;
    }
    if (user.needsNicknameSetup) {
      Alert.alert('Takma ad gerekli', 'Mesaj yazmak icin once bir takma ad sec.');
      return false;
    }
    return true;
  };

  const openNicknameSheet = useCallback(
    async (nickname: string, author?: GourmetChatAuthor) => {
      if (!user?.email) {
        Alert.alert('Giris gerekli', 'Bu islem icin giris yap.');
        return;
      }
      if (user.nickname && nickname.toLowerCase() === user.nickname.toLowerCase()) {
        setSheetNickname(nickname);
        setSheetAuthor(author ?? { nickname });
        setSheetIsFriend(false);
        setSheetVisible(true);
        return;
      }
      setSheetNickname(nickname);
      setSheetAuthor(author ?? { nickname });
      setSheetIsFriend(false);
      setSheetVisible(true);
      try {
        const card = await getPublicUserByNickname(nickname, user.email);
        setSheetIsFriend(card.is_friend);
        setSheetAuthor({
          nickname: card.nickname,
          avatar_url: card.avatar_url,
          avatar_preset: card.avatar_preset,
        });
      } catch {
        /* keep defaults */
      }
    },
    [user],
  );

  const insertMention = useCallback((nickname: string) => {
    const token = `@${nickname} `;
    setBody((prev) => {
      const trimmed = prev.trimEnd();
      if (!trimmed) return token;
      if (trimmed.endsWith(token.trim())) return prev;
      return `${trimmed} ${token}`;
    });
    setSheetVisible(false);
    requestAnimationFrame(() => composerRef.current?.focus());
  }, []);

  const handleAddFriend = useCallback(async () => {
    if (!user?.email || !sheetNickname) return;
    try {
      await addFriend(user.email, sheetNickname);
      setSheetIsFriend(true);
      Alert.alert('Arkadas eklendi', `@${sheetNickname} artik arkadas listende.`);
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Eklenemedi.');
    }
  }, [sheetNickname, user?.email]);

  const handleRemoveFriend = useCallback(async () => {
    if (!user?.email || !sheetNickname) return;
    try {
      await removeFriend(user.email, sheetNickname);
      setSheetIsFriend(false);
      Alert.alert('Kaldirildi', `@${sheetNickname} arkadas listenden cikarildi.`);
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Silinemedi.');
    }
  }, [sheetNickname, user?.email]);

  const handleSendDm = useCallback(async () => {
    if (!user?.email || !sheetNickname) return;
    try {
      const payload = await startDmThread(user.email, sheetNickname);
      setSheetVisible(false);
      router.push({
        pathname: '/dm/[threadId]',
        params: { threadId: payload.thread_id, nickname: payload.peer.nickname },
      } as never);
    } catch (err) {
      Alert.alert('Mesaj', err instanceof Error ? err.message : 'Sohbet acilamadi.');
    }
  }, [router, sheetNickname, user?.email]);

  const submitMessage = async () => {
    if (!user?.email || !ensureCanPost()) return;
    const trimmed = body.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const created = await createGourmetChatMessage(roomSlug, {
        user_email: user.email,
        city: CITY,
        body: trimmed,
      });
      setBody('');
      setMessages((prev) => [...prev, created]);
      scrollToBottom(true);
    } catch (err) {
      if (err instanceof ReviewModerationApiError) {
        setFormError(err.message);
      } else {
        setFormError(err instanceof Error ? err.message : 'Mesaj gonderilemedi.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.back}>← Geri</Text>
          </Pressable>
          <View style={styles.headerMeta}>
            <Text style={styles.headerEmoji}>{roomEmoji}</Text>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>{roomTitle}</Text>
              <Text style={styles.headerCity}>Bursa · canli sohbet</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={GastroColors.accent} style={styles.loader} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <FlatList
            ref={listRef}
            style={styles.flex}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            ListEmptyComponent={
              <Text style={styles.empty}>Henuz mesaj yok. Ilk sohbeti sen baslat!</Text>
            }
            renderItem={({ item }) => (
              <GourmetChatMessageBubble
                message={item}
                isOwn={Boolean(user?.nickname && item.author.nickname === user.nickname)}
                onNicknamePress={(nickname, author) => void openNicknameSheet(nickname, author)}
                onMentionPress={(nickname) => void openNicknameSheet(nickname)}
              />
            )}
            onContentSizeChange={() => scrollToBottom(false)}
          />
        )}

        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          {formError ? <Text style={styles.formError}>{formError}</Text> : null}
          <View style={styles.composerRow}>
            <TextInput
              ref={composerRef}
              style={[GastroStyles.input, styles.composerInput]}
              placeholder="Mesaj yaz… @takmaad ile etiketle"
              placeholderTextColor={GastroColors.placeholder}
              value={body}
              onChangeText={setBody}
              onFocus={() => scrollToBottom(true)}
              multiline
              maxLength={800}
              editable={!submitting}
            />
            <Pressable
              style={[styles.sendBtn, (submitting || !body.trim()) && styles.sendBtnDisabled]}
              onPress={() => {
                if (!ensureCanPost()) return;
                void submitMessage();
              }}
              disabled={submitting || !body.trim()}>
              <Text style={styles.sendBtnText}>{submitting ? '…' : 'Gonder'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <NicknameActionSheet
        visible={sheetVisible}
        nickname={sheetNickname}
        avatarUrl={sheetAuthor?.avatar_url}
        avatarPreset={sheetAuthor?.avatar_preset}
        isFriend={sheetIsFriend}
        isSelf={Boolean(user?.nickname && sheetNickname.toLowerCase() === user.nickname.toLowerCase())}
        onClose={() => setSheetVisible(false)}
        onWhisper={() => insertMention(sheetNickname)}
        onAddFriend={() => void handleAddFriend()}
        onRemoveFriend={() => void handleRemoveFriend()}
        onSendDm={() => void handleSendDm()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: GastroColors.bg },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: GastroColors.border,
  },
  back: { color: GastroColors.accent, fontWeight: '700' },
  headerMeta: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  headerEmoji: { fontSize: 30 },
  headerTextWrap: { flex: 1 },
  headerTitle: { color: GastroColors.text, fontSize: 20, fontWeight: '800' },
  headerCity: { color: GastroColors.muted, fontSize: 12, marginTop: 2 },
  loader: { marginTop: 32 },
  messageList: { padding: 16, paddingBottom: 12, gap: 10, flexGrow: 1 },
  empty: { color: GastroColors.muted, lineHeight: 22, textAlign: 'center', marginTop: 40 },
  error: { color: GastroColors.bad, lineHeight: 20, paddingHorizontal: 16 },
  composer: {
    borderTopWidth: 1,
    borderTopColor: GastroColors.border,
    backgroundColor: GastroColors.panel,
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 6,
  },
  composerRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  composerInput: { flex: 1, minHeight: 44, maxHeight: 120, textAlignVertical: 'top' },
  sendBtn: {
    backgroundColor: GastroColors.accent,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 2,
  },
  sendBtnDisabled: { opacity: 0.45 },
  sendBtnText: { color: GastroColors.accentDark, fontWeight: '800', fontSize: 13 },
  formError: { color: GastroColors.bad, fontSize: 12, lineHeight: 18 },
});
