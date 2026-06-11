import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GastroColors } from '@/constants/theme';

type Props = { children: React.ReactNode; compact?: boolean };

type State = { failed: boolean };

/** Mikrofon STT patlarsa arama sheet'i ayakta kalsin. */
export class SpeechMicErrorBoundary extends React.Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.warn('[SpeechMicErrorBoundary]', error.message);
  }

  render() {
    if (this.state.failed) {
      return (
        <View style={[styles.fallback, this.props.compact && styles.fallbackCompact]}>
          <Text style={styles.emoji}>🎙️</Text>
          {!this.props.compact ? (
            <Text style={styles.label}>Metin ile ara</Text>
          ) : null}
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  fallback: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.panel,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    opacity: 0.55,
  },
  fallbackCompact: {
    minWidth: 48,
    minHeight: 48,
    paddingHorizontal: 10,
  },
  emoji: { fontSize: 18 },
  label: { color: GastroColors.muted, fontWeight: '700', fontSize: 12 },
});
