import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { sofraKelimeBuyuk } from '@/lib/kelime-sofrasi/turkce-harf';

type Props = {
  words: string[];
  foundWords: string[];
  theme: {
    text: string;
    muted: string;
    accent: string;
    panel: string;
    border: string;
  };
};

export function KelimeBulWordList({ words, foundWords, theme }: Props) {
  const foundSet = useMemo(() => new Set(foundWords.map(sofraKelimeBuyuk)), [foundWords]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          backgroundColor: theme.panel,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.border,
          padding: 12,
          gap: 8,
        },
        title: { color: theme.text, fontSize: 14, fontWeight: '800' },
        list: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
        chip: {
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: theme.border,
        },
        chipText: { color: theme.text, fontSize: 13, fontWeight: '700' },
        foundText: {
          color: theme.muted,
          textDecorationLine: 'line-through',
        },
      }),
    [theme],
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>
        Kelimeler ({foundWords.length}/{words.length})
      </Text>
      <View style={styles.list}>
        {words.map((word) => {
          const found = foundSet.has(sofraKelimeBuyuk(word));
          return (
            <View key={word} style={styles.chip}>
              <Text style={[styles.chipText, found && styles.foundText]}>{word}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
