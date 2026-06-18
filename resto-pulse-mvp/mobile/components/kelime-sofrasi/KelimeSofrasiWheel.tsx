import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useGastroTheme } from '@/context/theme-context';

type Props = {
  wheel: string[];
  order: number[];
  selectedPath: number[];
  onLetterPress: (wheelIndex: number) => void;
  onClear: () => void;
  onShuffle: () => void;
  disabled?: boolean;
};

const WHEEL_POSITIONS = [
  { top: '8%', left: '50%' },
  { top: '22%', left: '78%' },
  { top: '50%', left: '88%' },
  { top: '78%', left: '78%' },
  { top: '88%', left: '50%' },
  { top: '78%', left: '22%' },
  { top: '50%', left: '12%' },
  { top: '22%', left: '22%' },
];

function positionForIndex(index: number, total: number) {
  if (total <= WHEEL_POSITIONS.length) {
    return WHEEL_POSITIONS[index % WHEEL_POSITIONS.length]!;
  }
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const radius = 38;
  return {
    top: `${50 + Math.sin(angle) * radius}%`,
    left: `${50 + Math.cos(angle) * radius}%`,
  };
}

export function KelimeSofrasiWheel({
  wheel,
  order,
  selectedPath,
  onLetterPress,
  onClear,
  onShuffle,
  disabled,
}: Props) {
  const { colors } = useGastroTheme();
  const selectedSet = useMemo(() => new Set(selectedPath), [selectedPath]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { width: '100%', aspectRatio: 1, maxWidth: 280, alignSelf: 'center' },
        ring: {
          ...StyleSheet.absoluteFillObject,
          borderRadius: 999,
          borderWidth: 2,
          borderColor: colors.border,
          backgroundColor: colors.panel,
        },
        letter: {
          position: 'absolute',
          width: 44,
          height: 44,
          marginLeft: -22,
          marginTop: -22,
          borderRadius: 22,
          borderWidth: 2,
          alignItems: 'center',
          justifyContent: 'center',
        },
        letterIdle: {
          borderColor: '#7DCEA0',
          backgroundColor: 'rgba(255,255,255,0.92)',
        },
        letterSelected: {
          borderColor: colors.accent,
          backgroundColor: colors.accentSoft,
        },
        letterText: { fontSize: 18, fontWeight: '800', color: '#2E7D32' },
        letterTextSelected: { color: colors.accent },
        toolbar: {
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 10,
          marginTop: 12,
        },
        toolBtn: {
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.panel,
        },
        toolText: { color: colors.text, fontWeight: '700', fontSize: 13 },
      }),
    [colors],
  );

  const currentWord = selectedPath.map((i) => wheel[i]).join('');

  return (
    <View>
      <View style={styles.wrap}>
        <View style={styles.ring} />
        {order.map((wheelIndex, displayIndex) => {
          const pos = positionForIndex(displayIndex, order.length);
          const selected = selectedSet.has(wheelIndex);
          return (
            <Pressable
              key={`${wheelIndex}-${displayIndex}`}
              disabled={disabled}
              onPress={() => {
                void Haptics.selectionAsync();
                onLetterPress(wheelIndex);
              }}
              style={[
                styles.letter,
                { top: pos.top as `${number}%`, left: pos.left as `${number}%` },
                selected ? styles.letterSelected : styles.letterIdle,
              ]}>
              <Text style={[styles.letterText, selected ? styles.letterTextSelected : null]}>
                {wheel[wheelIndex]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={{ textAlign: 'center', marginTop: 8, fontSize: 20, fontWeight: '800', color: colors.text, letterSpacing: 2 }}>
        {currentWord || '·'}
      </Text>
      <View style={styles.toolbar}>
        <Pressable style={styles.toolBtn} onPress={onClear} disabled={disabled || selectedPath.length === 0}>
          <Text style={styles.toolText}>Sil</Text>
        </Pressable>
        <Pressable style={styles.toolBtn} onPress={onShuffle} disabled={disabled}>
          <Text style={styles.toolText}>Karıştır</Text>
        </Pressable>
      </View>
    </View>
  );
}
