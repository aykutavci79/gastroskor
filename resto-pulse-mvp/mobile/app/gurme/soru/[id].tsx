import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GourmetChatAuthorRow } from '@/components/GourmetChatCards';
import { GastroColors, GastroStyles } from '@/constants/theme';
import { useSession } from '@/context/session-context';
import { ReviewModerationApiError, createGourmetChatAnswer, getGourmetChatQuestion } from '@/lib/api';
import type { GourmetChatQuestionDetail } from '@/lib/types';

function param(value: string | string[] | undefined, fallback = '') {
  return Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;
}

export default function GurmeQuestionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const questionId = param(params.id);
  const roomTitle = param(params.roomTitle, 'Gurme Sohbet');
  const { user } = useSession();

  const [detail, setDetail] = useState<GourmetChatQuestionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answerBody, setAnswerBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const payload = await getGourmetChatQuestion(questionId);
      setDetail(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Soru yuklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [questionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitAnswer = async () => {
    if (!user?.email) {
      Alert.alert('Giris gerekli', 'Cevap yazmak icin once hesabinla giris yap.');
      return;
    }
    if (user.needsNicknameSetup) {
      Alert.alert('Takma ad gerekli', 'Cevap yazmak icin once bir takma ad sec.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const created = await createGourmetChatAnswer(questionId, {
        user_email: user.email,
        body: answerBody.trim(),
      });
      setAnswerBody('');
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              answer_count: prev.answer_count + 1,
              answers: [...prev.answers, created],
            }
          : prev,
      );
    } catch (err) {
      if (err instanceof ReviewModerationApiError) {
        setFormError(err.message);
      } else {
        setFormError(err instanceof Error ? err.message : 'Cevap gonderilemedi.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.back}>← {roomTitle}</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={GastroColors.accent} style={{ marginTop: 32 }} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : detail ? (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={[GastroStyles.card, styles.questionCard]}>
              <GourmetChatAuthorRow author={detail.author} createdAt={detail.created_at} />
              <Text style={styles.questionBody}>{detail.body}</Text>
            </View>

            <Text style={styles.sectionTitle}>
              {detail.answer_count > 0 ? `${detail.answer_count} cevap` : 'Henuz cevap yok'}
            </Text>

            {detail.answers.map((answer) => (
              <View key={answer.id} style={[GastroStyles.card, styles.answerCard]}>
                <GourmetChatAuthorRow author={answer.author} createdAt={answer.created_at} />
                <Text style={styles.answerBody}>{answer.body}</Text>
              </View>
            ))}

            <View style={[GastroStyles.card, styles.replyBox]}>
              <Text style={styles.replyTitle}>Cevap yaz</Text>
              <TextInput
                style={[GastroStyles.input, styles.replyInput]}
                placeholder="Tavsiyeni paylas…"
                placeholderTextColor={GastroColors.placeholder}
                value={answerBody}
                onChangeText={setAnswerBody}
                multiline
                maxLength={1200}
              />
              {formError ? <Text style={styles.error}>{formError}</Text> : null}
              <Pressable
                style={[GastroStyles.btnPrimary, submitting && { opacity: 0.6 }]}
                onPress={() => void submitAnswer()}
                disabled={submitting || answerBody.trim().length < 2}>
                <Text style={GastroStyles.btnPrimaryText}>{submitting ? 'Gonderiliyor…' : 'Cevapla'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: GastroColors.bg },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  back: { color: GastroColors.accent, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  questionCard: { gap: 12 },
  questionBody: { color: GastroColors.text, fontSize: 17, lineHeight: 24, fontWeight: '600' },
  sectionTitle: { color: GastroColors.muted, fontWeight: '700', fontSize: 13, marginTop: 4 },
  answerCard: { gap: 10 },
  answerBody: { color: GastroColors.text, fontSize: 15, lineHeight: 22 },
  replyBox: { gap: 10, marginTop: 8 },
  replyTitle: { color: GastroColors.text, fontWeight: '800', fontSize: 16 },
  replyInput: { minHeight: 96, textAlignVertical: 'top' },
  error: { color: GastroColors.bad, lineHeight: 20 },
});
