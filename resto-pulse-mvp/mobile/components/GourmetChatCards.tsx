import { Pressable, StyleSheet, Text, View } from 'react-native';

import { UserAvatar } from '@/components/UserAvatar';
import { GastroColors, GastroStyles } from '@/constants/theme';
import type { GourmetChatAuthor } from '@/lib/types';

type Props = {
  author: GourmetChatAuthor;
  createdAt?: string;
  tagLabel?: string | null;
};

function formatWhen(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export function GourmetChatAuthorRow({ author, createdAt, tagLabel }: Props) {
  return (
    <View style={styles.row}>
      <UserAvatar
        avatarUrl={author.avatar_url}
        avatarPreset={author.avatar_preset}
        size={34}
        fallbackLabel={author.nickname}
      />
      <View style={styles.meta}>
        <Text style={styles.nickname}>{author.nickname}</Text>
        {createdAt ? <Text style={styles.when}>{formatWhen(createdAt)}</Text> : null}
      </View>
      {tagLabel ? (
        <View style={styles.tag}>
          <Text style={styles.tagText}>{tagLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

type QuestionCardProps = {
  body: string;
  author: GourmetChatAuthor;
  createdAt: string;
  tagLabel?: string | null;
  answerCount: number;
  onPress: () => void;
};

export function GourmetChatQuestionCard({
  body,
  author,
  createdAt,
  tagLabel,
  answerCount,
  onPress,
}: QuestionCardProps) {
  return (
    <Pressable style={({ pressed }) => [GastroStyles.card, pressed && styles.pressed]} onPress={onPress}>
      <GourmetChatAuthorRow author={author} createdAt={createdAt} tagLabel={tagLabel} />
      <Text style={styles.body} numberOfLines={4}>
        {body}
      </Text>
      <Text style={styles.answers}>{answerCount > 0 ? `${answerCount} cevap` : 'Henüz cevap yok'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  meta: { flex: 1, gap: 2 },
  nickname: { color: GastroColors.text, fontWeight: '700', fontSize: 14 },
  when: { color: GastroColors.muted, fontSize: 12 },
  tag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: GastroColors.accentSoft,
    borderWidth: 1,
    borderColor: GastroColors.accent,
  },
  tagText: { color: GastroColors.accent, fontSize: 11, fontWeight: '700' },
  pressed: { opacity: 0.92 },
  body: { color: GastroColors.text, fontSize: 15, lineHeight: 22, marginTop: 10 },
  answers: { color: GastroColors.muted, fontSize: 12, marginTop: 10, fontWeight: '600' },
});
