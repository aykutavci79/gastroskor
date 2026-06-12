import { ReactNode, RefObject } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GastroColors } from '@/constants/theme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Tab bar altindaki ekranlar icin (Keşfet vb.) */
  keyboardVerticalOffset?: number;
  scrollRef?: RefObject<ScrollView | null>;
  /** Keşfet vitrin gibi kenar boslugu olmayan tam ekran */
  flush?: boolean;
};

export function Screen({
  children,
  scroll = true,
  style,
  refreshing,
  onRefresh,
  keyboardVerticalOffset = 0,
  scrollRef,
  flush = false,
}: Props) {
  const contentStyle = [flush ? styles.flush : styles.scroll, style];

  const body = scroll ? (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={contentStyle}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={Boolean(refreshing)}
            onRefresh={onRefresh}
            tintColor={GastroColors.accent}
          />
        ) : undefined
      }>
      {children}
    </ScrollView>
  ) : (
    <View style={[flush ? styles.flushBody : styles.scroll, style]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={keyboardVerticalOffset}>
        {body}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: GastroColors.bg },
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32, gap: 16 },
  flush: { paddingBottom: 8, gap: 0 },
  flushBody: { flex: 1, paddingBottom: 0 },
});
