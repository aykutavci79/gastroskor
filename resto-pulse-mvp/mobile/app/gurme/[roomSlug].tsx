import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GourmetChatQuestionCard } from '@/components/GourmetChatCards';
import { GastroColors, GastroStyles } from '@/constants/theme';
import { useSession } from '@/context/session-context';
import {
  ReviewModerationApiError,
  createGourmetChatQuestion,
  listGourmetChatQuestions,
  listGourmetChatTags,
} from '@/lib/api';
import type { GourmetChatQuestion, GourmetChatTag } from '@/lib/types';

function param(value: string | string[] | undefined, fallback = '') {
  return Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;
}

export default function GurmeRoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string | string[] | undefined>>();
  const roomSlug = param(params.roomSlug);
  const roomTitle = param(params.title, 'Oda');
  const roomEmoji = param(params.emoji, '💬');
  const city = param(params.city, 'Bursa');
  const { user } = useSession();

  const [questions, setQuestions] = useState<GourmetChatQuestion[]>([]);
  const [tags, setTags] = useState<GourmetChatTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const [body, setBody] = useState('');
  const [tag, setTag] = useState('genel');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const tagLabelById = useMemo(() => {
    const map = new Map<string, string>();
    tags.forEach((item) => map.set(item.id, item.label));
    return map;
  }, [tags]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [questionPayload, tagPayload] = await Promise.all([
        listGourmetChatQuestions(roomSlug, city),
        listGourmetChatTags(),
      ]);
      setQuestions(questionPayload.items);
      setTags(tagPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sorular yuklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [roomSlug, city]);

  useEffect(() => {
    void load();
  }, [load]);

  const openAsk = () => {
    if (!user?.email) {
      Alert.alert('Giris gerekli', 'Soru sormak icin once hesabinla giris yap.');
      return;
    }
    if (user.needsNicknameSetup) {
      Alert.alert('Takma ad gerekli', 'Soru sormak icin once bir takma ad sec.');
      return;
    }
    setFormError(null);
    setAskOpen(true);
  };

  const submitQuestion = async () => {
    if (!user?.email) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const created = await createGourmetChatQuestion(roomSlug, {
        user_email: user.email,
        city,
        tag,
        body: body.trim(),
      });
      setAskOpen(false);
      setBody('');
      setTag('genel');
      setQuestions((prev) => [created, ...prev]);
    } catch (err) {
      if (err instanceof ReviewModerationApiError) {
        setFormError(err.message);
      } else {
        setFormError(err instanceof Error ? err.message : 'Soru gonderilemedi.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>← Geri</Text>
        </Pressable>
        <View style={styles.headerMeta}>
          <Text style={styles.headerEmoji}>{roomEmoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{roomTitle}</Text>
            <Text style={styles.headerCity}>{city === 'Istanbul' ? 'İstanbul' : city}</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={GastroColors.accent} style={{ marginTop: 32 }} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
          {questions.length === 0 ? (
            <Text style={styles.empty}>Bu odada henuz soru yok. Ilk soruyu sen sor!</Text>
          ) : (
            questions.map((item) => (
              <GourmetChatQuestionCard
                key={item.id}
                body={item.body}
                author={item.author}
                createdAt={item.created_at}
                tagLabel={tagLabelById.get(item.tag) ?? item.tag}
                answerCount={item.answer_count}
                onPress={() =>
                  router.push({
                    pathname: '/gurme/soru/[id]',
                    params: { id: item.id, roomTitle, roomEmoji },
                  })
                }
              />
            ))
          )}
        </ScrollView>
      )}

      <Pressable style={styles.fab} onPress={openAsk}>
        <Text style={styles.fabText}>+ Soru sor</Text>
      </Pressable>

      <Modal visible={askOpen} animationType="slide" transparent onRequestClose={() => setAskOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalWrap}>
          <Pressable style={styles.modalBackdrop} onPress={() => setAskOpen(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Yeni soru</Text>
            <Text style={styles.modalHint}>Etiket sec, sorunu yaz. Sistem odalarinda sadece metin cevaplar.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagRow}>
              {(tags.length ? tags : [{ id: 'genel', label: 'Genel' }]).map((item) => {
                const active = tag === item.id;
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.tagChip, active && styles.tagChipActive]}
                    onPress={() => setTag(item.id)}>
                    <Text style={[styles.tagChipText, active && styles.tagChipTextActive]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <TextInput
              style={[GastroStyles.input, styles.input]}
              placeholder="Ornek: Bursada en iyi doner nerede?"
              placeholderTextColor={GastroColors.placeholder}
              value={body}
              onChangeText={setBody}
              multiline
              maxLength={500}
            />
            {formError ? <Text style={styles.error}>{formError}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setAskOpen(false)} disabled={submitting}>
                <Text style={styles.cancelText}>Vazgec</Text>
              </Pressable>
              <Pressable
                style={[GastroStyles.btnPrimary, styles.sendBtn, submitting && { opacity: 0.6 }]}
                onPress={() => void submitQuestion()}
                disabled={submitting || body.trim().length < 8}>
                <Text style={GastroStyles.btnPrimaryText}>{submitting ? 'Gonderiliyor…' : 'Gonder'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: GastroColors.bg },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 10 },
  back: { color: GastroColors.accent, fontWeight: '700' },
  headerMeta: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  headerEmoji: { fontSize: 32 },
  headerTitle: { color: GastroColors.text, fontSize: 22, fontWeight: '800' },
  headerCity: { color: GastroColors.muted, fontSize: 13, marginTop: 2 },
  list: { padding: 16, paddingBottom: 96, gap: 12 },
  empty: { color: GastroColors.muted, lineHeight: 22, textAlign: 'center', marginTop: 24 },
  error: { color: GastroColors.bad, lineHeight: 20, paddingHorizontal: 16 },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    backgroundColor: GastroColors.accent,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  fabText: { color: GastroColors.accentDark, fontWeight: '800' },
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  modalCard: {
    backgroundColor: GastroColors.panel,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderColor: GastroColors.border,
  },
  modalTitle: { color: GastroColors.text, fontSize: 20, fontWeight: '800' },
  modalHint: { color: GastroColors.muted, fontSize: 13, lineHeight: 18 },
  tagRow: { gap: 8, paddingVertical: 4 },
  tagChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: GastroColors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: GastroColors.input,
  },
  tagChipActive: { borderColor: GastroColors.accent, backgroundColor: GastroColors.accentSoft },
  tagChipText: { color: GastroColors.muted, fontWeight: '700', fontSize: 12 },
  tagChipTextActive: { color: GastroColors.accent },
  input: { minHeight: 110, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 12 },
  cancelText: { color: GastroColors.muted, fontWeight: '700' },
  sendBtn: { paddingHorizontal: 18 },
});
