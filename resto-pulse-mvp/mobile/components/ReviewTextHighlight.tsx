import { StyleSheet, Text, View } from 'react-native';

import { GastroColors } from '@/constants/theme';
import { buildHighlightedSegments } from '@/lib/review-moderation';

type Props = {
  text: string;
  highlights: string[];
};

export function ReviewTextHighlight({ text, highlights }: Props) {
  if (!text.trim()) return null;
  const segments = buildHighlightedSegments(text, highlights);

  return (
    <View style={styles.wrap}>
      <Text style={styles.body}>
        {segments.map((segment, index) => (
          <Text
            key={`${index}-${segment.text}`}
            style={segment.flagged ? styles.flagged : undefined}>
            {segment.text}
          </Text>
        ))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.45)',
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    padding: 12,
  },
  body: {
    color: GastroColors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  flagged: {
    color: '#f87171',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});
