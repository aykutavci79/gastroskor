import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GastroVoiceMicButton } from '@/components/GastroVoiceMicButton';
import { GastroColors } from '@/constants/theme';
import {
  formatVoiceOrderCommandSummary,
  parseVoiceOrderCommand,
  type VoiceOrderCommand,
} from '@/lib/parse-voice-order-command';
import type { VoiceOrderRestaurantOption } from '@/lib/voice-order-letters';

type Props = {
  restaurants: VoiceOrderRestaurantOption[];
  defaultProductSearchGroup?: string | null;
  onSubmit: (command: VoiceOrderCommand) => void;
};

const EXAMPLES = [
  "B'den 3 lahmacun, kapıda kredi kartı",
  'A restoranından 2 cantık nakit',
];

export function VoiceOrderCommandBar({ restaurants, defaultProductSearchGroup, onSubmit }: Props) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');

  const parsed = useMemo(
    () => parseVoiceOrderCommand(draft, restaurants, defaultProductSearchGroup),
    [draft, restaurants, defaultProductSearchGroup],
  );

  const canSubmit = parsed.confidence === 'high';

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <Text style={styles.label}>Gastro Sipariş komutu</Text>
      <Text style={styles.hint}>Listede A/B/C harflerine göre yaz veya konuş.</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="B'den 3 lahmacun, kapıda kredi kartı"
          placeholderTextColor={GastroColors.muted}
          style={[styles.input, styles.inputFlex]}
          multiline
          textAlignVertical="top"
        />
        <GastroVoiceMicButton
          compact
          onTranscript={(text) => setDraft((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text))}
        />
      </View>
      <Text style={styles.preview}>{formatVoiceOrderCommandSummary(parsed)}</Text>
      {parsed.issues.length && parsed.confidence !== 'high' ? (
        <Text style={styles.issues}>{parsed.issues.join(' ')}</Text>
      ) : null}
      <View style={styles.exampleRow}>
        {EXAMPLES.map((line) => (
          <Pressable key={line} style={styles.exampleChip} onPress={() => setDraft(line)}>
            <Text style={styles.exampleText}>{line}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        style={[styles.btn, !canSubmit && styles.btnDisabled]}
        disabled={!canSubmit}
        onPress={() => onSubmit(parsed)}>
        <Text style={styles.btnText}>Siparişi hazırla</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderTopColor: GastroColors.border,
    backgroundColor: '#1a1210',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    gap: 8,
  },
  label: { color: GastroColors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  hint: { color: GastroColors.muted, fontSize: 12, lineHeight: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  inputFlex: { flex: 1 },
  input: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.panel,
    color: GastroColors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  preview: { color: GastroColors.text, fontSize: 14, fontWeight: '700' },
  issues: { color: GastroColors.gold, fontSize: 12, lineHeight: 16 },
  exampleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  exampleChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: GastroColors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: GastroColors.panel,
  },
  exampleText: { color: GastroColors.muted, fontSize: 11 },
  btn: {
    borderRadius: 12,
    backgroundColor: GastroColors.gold,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: '#141414', fontSize: 15, fontWeight: '900' },
});
