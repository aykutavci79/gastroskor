import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { GastroColors } from '@/constants/theme';

type Props = { children: React.ReactNode };

type State = { error: Error | null };

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[AppErrorBoundary]', error);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.root}>
          <ScrollView contentContainerStyle={styles.box}>
            <Text style={styles.title}>GastroSkor</Text>
            <Text style={styles.msg}>Beklenmeyen bir hata olustu. Uygulamayi kapatip tekrar acin.</Text>
            <Text style={styles.detail} selectable>
              {this.state.error.message}
            </Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GastroColors.bg },
  box: { padding: 24, gap: 12 },
  title: { color: GastroColors.text, fontSize: 20, fontWeight: '800' },
  msg: { color: GastroColors.muted, fontSize: 14, lineHeight: 20 },
  detail: { color: GastroColors.accent, fontSize: 12, fontFamily: 'monospace' },
});
