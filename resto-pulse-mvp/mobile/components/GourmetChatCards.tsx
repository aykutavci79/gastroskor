import { Pressable, StyleSheet, Text, View } from 'react-native';

import { UserAvatar } from '@/components/UserAvatar';
import { GastroColors } from '@/constants/theme';
import type { GourmetChatAuthor, GourmetChatMessage } from '@/lib/types';

type Props = {
  author: GourmetChatAuthor;
  createdAt?: string;
  tagLabel?: string | null;
  onNicknamePress?: (nickname: string, author: GourmetChatAuthor) => void;
};

function formatWhen(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

const MENTION_SPLIT = /(@[a-zA-Z0-9_\u00C7\u00E7\u011E\u011F\u0130\u0131\u00D6\u00F6\u015E\u015F\u00DC\u00FC]+)/g;

function MessageBody({
  text,
  onMentionPress,
}: {
  text: string;
  onMentionPress?: (nickname: string) => void;
}) {
  const parts = text.split(MENTION_SPLIT);
  return (
    <Text style={styles.messageBody}>
      {parts.map((part, index) => {
        if (part.startsWith('@')) {
          const nickname = part.slice(1);
          if (onMentionPress && nickname) {
            return (
              <Text
                key={`${part}-${index}`}
                style={styles.mention}
                onPress={() => onMentionPress(nickname)}>
                {part}
              </Text>
            );
          }
          return (
            <Text key={`${part}-${index}`} style={styles.mention}>
              {part}
            </Text>
          );
        }
        return <Text key={`${part}-${index}`}>{part}</Text>;
      })}
    </Text>
  );
}

export function GourmetChatAuthorRow({ author, createdAt, tagLabel, onNicknamePress }: Props) {
  const nicknameNode = (
    <Text style={styles.nickname} numberOfLines={1} ellipsizeMode="tail">
      {author.nickname}
    </Text>
  );

  return (
    <View style={styles.row}>
      <UserAvatar
        avatarUrl={author.avatar_url}
        avatarPreset={author.avatar_preset}
        size={32}
        fallbackLabel={author.nickname}
      />
      {onNicknamePress ? (
        <Pressable style={styles.nicknamePress} onPress={() => onNicknamePress(author.nickname, author)}>
          {nicknameNode}
        </Pressable>
      ) : (
        nicknameNode
      )}
      {createdAt ? <Text style={styles.when}>{formatWhen(createdAt)}</Text> : null}
      {tagLabel ? (
        <View style={styles.tag}>
          <Text style={styles.tagText}>{tagLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

type BubbleProps = {
  message: GourmetChatMessage;
  isOwn?: boolean;
  onNicknamePress?: (nickname: string, author: GourmetChatAuthor) => void;
  onMentionPress?: (nickname: string) => void;
};

export function GourmetChatMessageBubble({
  message,
  isOwn = false,
  onNicknamePress,
  onMentionPress,
}: BubbleProps) {
  return (
    <View style={[styles.bubbleWrap, isOwn && styles.bubbleWrapOwn]}>
      <View style={[styles.bubble, isOwn && styles.bubbleOwn]}>
        {!isOwn ? (
          <GourmetChatAuthorRow
            author={message.author}
            createdAt={message.created_at}
            onNicknamePress={onNicknamePress}
          />
        ) : null}
        <MessageBody text={message.body} onMentionPress={onMentionPress} />
        {isOwn ? <Text style={styles.ownWhen}>{formatWhen(message.created_at)}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    minWidth: '100%',
  },
  nicknamePress: { flex: 1, flexShrink: 1 },
  nickname: {
    color: GastroColors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  when: { color: GastroColors.muted, fontSize: 11, flexShrink: 0 },
  ownWhen: { color: GastroColors.muted, fontSize: 10, marginTop: 4, textAlign: 'right' },
  tag: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: GastroColors.accentSoft,
    borderWidth: 1,
    borderColor: GastroColors.accent,
  },
  tagText: { color: GastroColors.accent, fontSize: 10, fontWeight: '700' },
  bubbleWrap: { alignItems: 'flex-start', marginBottom: 8 },
  bubbleWrapOwn: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '96%',
    minWidth: '78%',
    backgroundColor: GastroColors.panel,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GastroColors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bubbleOwn: {
    backgroundColor: GastroColors.accentSoft,
    borderColor: GastroColors.accent,
  },
  messageBody: { color: GastroColors.text, fontSize: 15, lineHeight: 22 },
  mention: { color: GastroColors.accent, fontWeight: '800' },
});
