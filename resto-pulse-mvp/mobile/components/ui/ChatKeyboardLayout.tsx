import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  children: ReactNode;
  composer: ReactNode;
};

/**
 * Mesaj listesi + altta sabit composer (DM, Gurme sohbet).
 * Android'de klavye acilinca composer yukari kayar.
 */
export function ChatKeyboardLayout({ children, composer }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <View style={styles.list}>{children}</View>
      <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
        <View style={[styles.composerWrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          {composer}
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { flex: 1 },
  composerWrap: { width: '100%' },
});
