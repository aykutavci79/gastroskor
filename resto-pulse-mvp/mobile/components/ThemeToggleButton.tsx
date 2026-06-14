import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useGastroTheme } from '@/context/theme-context';

export function ThemeToggleButton() {
  const { mode, toggleMode, colors } = useGastroTheme();
  const isLight = mode === 'light';

  return (
    <Pressable
      onPress={toggleMode}
      style={({ pressed }) => [styles.btn, { borderColor: colors.border, backgroundColor: colors.input }, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={isLight ? 'Gece moduna geç' : 'Gündüz moduna geç'}>
      <Text style={styles.emoji} accessibilityElementsHidden>
        {isLight ? '🌙' : '☀️'}
      </Text>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.text }]}>{isLight ? 'Gece modu' : 'Gündüz modu'}</Text>
        <Text style={[styles.sub, { color: colors.muted }]}>
          {isLight ? 'Koyu arayüze geç' : 'Açık arayüze geç — web ile aynı'}
        </Text>
      </View>
      <Text style={[styles.action, { color: colors.accent }]}>{isLight ? 'Gece' : 'Gündüz'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pressed: { opacity: 0.92 },
  emoji: { fontSize: 20 },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '800' },
  sub: { fontSize: 12, lineHeight: 16 },
  action: { fontSize: 12, fontWeight: '800' },
});
