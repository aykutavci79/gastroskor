import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MINI_SUDOKU_THEME } from '@/constants/mini-sudoku-theme';

type Props = {
  noteMode: boolean;
  hintsRemaining: number;
  canUndo: boolean;
  disabled?: boolean;
  onUndo: () => void;
  onErase: () => void;
  onToggleNotes: () => void;
  onHint: () => void;
};

type ToolProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
  badge?: string;
};

function ToolButton({ label, icon, onPress, disabled, active, badge }: ToolProps) {
  const t = MINI_SUDOKU_THEME;
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { alignItems: 'center', gap: 4, minWidth: 64 },
        btn: {
          width: 52,
          height: 52,
          borderRadius: 26,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.panel,
          borderWidth: 1,
          borderColor: active ? t.accent : t.border,
        },
        btnDisabled: { opacity: 0.4 },
        label: { color: t.muted, fontSize: 11, fontWeight: '600' },
        badge: {
          position: 'absolute',
          right: -4,
          bottom: -4,
          minWidth: 18,
          height: 18,
          borderRadius: 9,
          paddingHorizontal: 5,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.accent,
        },
        badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
      }),
    [active, t],
  );

  return (
    <View style={styles.wrap}>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={[styles.btn, disabled && styles.btnDisabled]}>
        <Ionicons name={icon} size={22} color={active ? t.accent : t.text} />
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </Pressable>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

export function MiniSudokuToolbar({
  noteMode,
  hintsRemaining,
  canUndo,
  disabled,
  onUndo,
  onErase,
  onToggleNotes,
  onHint,
}: Props) {
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          justifyContent: 'space-around',
          marginTop: 16,
          paddingHorizontal: 4,
        },
      }),
    [],
  );

  return (
    <View style={styles.row}>
      <ToolButton
        label="Geri al"
        icon="arrow-undo-outline"
        onPress={onUndo}
        disabled={disabled || !canUndo}
      />
      <ToolButton label="Sil" icon="backspace-outline" onPress={onErase} disabled={disabled} />
      <ToolButton
        label="Notlar"
        icon="create-outline"
        onPress={onToggleNotes}
        disabled={disabled}
        active={noteMode}
        badge={noteMode ? 'Açık' : undefined}
      />
      <ToolButton
        label="İpucu"
        icon="bulb-outline"
        onPress={onHint}
        disabled={disabled || hintsRemaining <= 0}
        badge={hintsRemaining > 0 ? String(hintsRemaining) : '0'}
      />
    </View>
  );
}
