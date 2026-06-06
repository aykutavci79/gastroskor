import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { UserAvatar } from '@/components/UserAvatar';
import { GastroColors, GastroStyles } from '@/constants/theme';
import { useSession } from '@/context/session-context';
import { listDmMessages, sendDmMessage } from '@/lib/api';
import type { DmMessageItem, PublicUserCard } from '@/lib/types';

const POLL_MS = 10_000;

function param(value: string | string[] | undefined, fallback = '') {
  return Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;
}

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export default function DmThreadScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<Record<string, string | string[] | undefined>>();
  const threadId = param(params.threadId);
  const fallbackNickname = param(params.nickname, 'Gurme');
  const { user } = useSession();

  const listRef = useRef<FlatList<DmMessageItem>>(null);
  const [peer, setPeer] = useState<PublicUserCard | null>(null);
  const [messages, setMessages] = useState<DmMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated }));
  }, []);

  const load = useCallback(
    async (silent = false) => {
      if (!user?.email || !threadId) return;
      if (!silent) setError(null);
      try {
        const payload = await listDmMessages(user.email, threadId);
        setPeer(payload.peer);
        setMessages(payload.items);
      } catch (err) {
        if (!silent) setError(err instanceof Error ? err.message : 'Mesajlar yuklenemedi.');
      } finally {
        setLoading(false);
      }
    },
    [threadId, user?.email],
  );

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(true), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom(true);
  }, [messages.length, scrollToBottom]);

  const submitMessage = async () => {
    if (!user?.email || !threadId) return;
    const trimmed = body.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const created = await sendDmMessage(user.email, threadId, trimmed);
      setBody('');
      setMessages((prev) => [...prev, created]);
      scrollToBottom(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Mesaj gonderilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayNickname = peer?.nickname ?? fallbackNickname;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.back}>← Geri</Text>
          </Pressable>
          <View style={styles.headerMeta}>
            <UserAvatar
              avatarUrl={peer?.avatar_url}
              avatarPreset={peer?.avatar_preset}
              size={36}
              fallbackLabel={displayNickname}
            />
            <View>
              <Text style={styles.headerTitle}>@{displayNickname}</Text>
              <Text style={styles.headerSub}>Ozel mesaj</Text>
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
            ListEmptyComponent={
              <Text style={styles.empty}>Ilk mesaji sen gonder — merhaba de!</Text>
            }
            renderItem={({ item }) => (
              <View style={[styles.bubbleWrap, item.is_own && styles.bubbleWrapOwn]}>
                <View style={[styles.bubble, item.is_own && styles.bubbleOwn]}>
                  <Text style={styles.bubbleText}>{item.body}</Text>
                  <Text style={styles.when}>{formatWhen(item.created_at)}</Text>
                </View>
              </View>
            )}
            onContentSizeChange={() => scrollToBottom(false)}
          />
        )}

        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          {formError ? <Text style={styles.formError}>{formError}</Text> : null}
          <View style={styles.composerRow}>
            <TextInput
              style={[GastroStyles.input, styles.composerInput]}
              placeholder="Ozel mesaj yaz…"
              placeholderTextColor={GastroColors.placeholder}
              value={body}
              onChangeText={setBody}
              multiline
              maxLength={800}
              editable={!submitting}
            />
            <Pressable
              style={[styles.sendBtn, (submitting || !body.trim()) && styles.sendBtnDisabled]}
              onPress={() => void submitMessage()}
              disabled={submitting || !body.trim()}>
              <Text style={styles.sendBtnText}>{submitting ? '…' : 'Gonder'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  headerTitle: { color: GastroColors.text, fontSize: 18, fontWeight: '800' },
  headerSub: { color: GastroColors.muted, fontSize: 12 },
  loader: { marginTop: 32 },
  messageList: { padding: 16, paddingBottom: 12, gap: 8, flexGrow: 1 },
  empty: { color: GastroColors.muted, textAlign: 'center', marginTop: 40, lineHeight: 22 },
  error: { color: GastroColors.bad, paddingHorizontal: 16 },
  bubbleWrap: { alignItems: 'flex-start', marginBottom: 6 },
  bubbleWrapOwn: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '86%',
    backgroundColor: GastroColors.panel,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GastroColors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  bubbleOwn: {
    backgroundColor: GastroColors.accentSoft,
    borderColor: GastroColors.accent,
  },
  bubbleText: { color: GastroColors.text, fontSize: 15, lineHeight: 22 },
  when: { color: GastroColors.muted, fontSize: 10, textAlign: 'right' },
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
  formError: { color: GastroColors.bad, fontSize: 12 },
});
