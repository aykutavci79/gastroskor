import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GastroColors } from '@/constants/theme';
import type { AuthorNameDisplayMode } from '@/lib/display-name';
import { previewAuthorName } from '@/lib/display-name';

type Props = {
  fullName: string | null | undefined;
  value: AuthorNameDisplayMode;
  onChange: (mode: AuthorNameDisplayMode) => void;
};

export function ReviewNameDisplayPicker({ fullName, value, onChange }: Props) {
  const preview = previewAuthorName(fullName, value);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Yorumda adın nasıl görünsün?</Text>
      <View style={styles.row}>
        <Pressable
          style={[styles.option, value === 'full' && styles.optionActive]}
          onPress={() => onChange('full')}>
          <Text style={[styles.optionText, value === 'full' && styles.optionTextActive]}>
            Tam ad
          </Text>
        </Pressable>
        <Pressable
          style={[styles.option, value === 'masked' && styles.optionActive]}
          onPress={() => onChange('masked')}>
          <Text style={[styles.optionText, value === 'masked' && styles.optionTextActive]}>
            Gizli
          </Text>
        </Pressable>
      </View>
      <Text style={styles.preview}>
        Önizleme: <Text style={styles.previewName}>{preview}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { color: GastroColors.muted, fontSize: 12, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8 },
  option: {
    flex: 1,
    borderWidth: 1,
    borderColor: GastroColors.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    backgroundColor: GastroColors.input,
  },
  optionActive: {
    borderColor: GastroColors.accent,
    backgroundColor: GastroColors.accentSoft,
  },
  optionText: { color: GastroColors.muted, fontSize: 13, fontWeight: '600' },
  optionTextActive: { color: GastroColors.accent },
  preview: { color: GastroColors.muted, fontSize: 12 },
  previewName: { color: GastroColors.text, fontWeight: '700' },
});
