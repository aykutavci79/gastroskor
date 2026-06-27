import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { GastroColorScheme } from '@/constants/theme';
import { useGastroTheme } from '@/context/theme-context';
import type { SocialProofStatus } from '@/lib/types';

type Props = {
  social: SocialProofStatus | null;
  onRequestScan?: () => void;
  scanLoading?: boolean;
  loggedIn?: boolean;
  socialSortActive?: boolean;
};

export function SocialProofScanBanner({ social, onRequestScan, scanLoading, loggedIn, socialSortActive }: Props) {
  const { colors } = useGastroTheme();
  const styles = createStyles(colors);

  if (!social) return null;

  if (social.status === 'scanning' || social.status === 'pending') {
    const pct = social.progress_pct ?? 10;
    return (
      <View style={styles.box}>
        <Text style={styles.title}>Sosyal sinyaller taranıyor…</Text>
        <Text style={styles.sub}>
          {social.scan_label ? `${social.scan_label} · ` : ''}
          Reddit, X, YouTube — yaklaşık 30–60 sn · %{pct}
        </Text>
        <ActivityIndicator color={colors.accent} style={styles.spinner} />
      </View>
    );
  }

  if (social.status === 'ready' && social.results?.length && socialSortActive) {
    return (
      <View style={styles.box}>
        <Text style={styles.title}>Sosyal sinyallere göre sıralandı</Text>
        <Text style={styles.sub}>Rozetli mekanlar üstte · mesafe ikincil</Text>
      </View>
    );
  }

  if (social.status === 'insufficient_data' && !social.can_scan) {
    return (
      <View style={styles.box}>
        <Text style={styles.sub}>
          Sosyal kanıt için yeterli eşleşme bulunamadı — liste GastroSkor sırasında kaldı.
        </Text>
      </View>
    );
  }

  if (social.status === 'failed') {
    return (
      <View style={styles.box}>
        <Text style={styles.title}>Sosyal tarama başarısız</Text>
        <Text style={styles.sub}>Tekrar deneyebilir veya normal aramaya dönebilirsin.</Text>
        {onRequestScan ? (
          <Pressable
            style={[styles.button, scanLoading && styles.buttonDisabled]}
            onPress={onRequestScan}
            disabled={scanLoading}>
            <Text style={styles.buttonText}>{scanLoading ? 'Başlatılıyor…' : 'Yeniden tara'}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  if (social.status === 'uncached' || (social.status === 'insufficient_data' && social.can_scan)) {
    const label = social.scan_label ?? 'bu ürün';
    if (!loggedIn) {
      return (
        <View style={styles.box}>
          <Text style={styles.sub}>
            {label} için sosyal sinyal yok. Giriş yapınca Reddit/X’te tarayabilirsin.
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.box}>
        <Text style={styles.title}>{label} — sosyal sinyal yok</Text>
        <Text style={styles.sub}>
          İstersen Reddit, X ve YouTube’da tarayıp sonucu kaydederiz (günde 10 tarama).
        </Text>
        <Pressable
          style={[styles.button, scanLoading && styles.buttonDisabled]}
          onPress={onRequestScan}
          disabled={scanLoading || !onRequestScan}>
          <Text style={styles.buttonText}>{scanLoading ? 'Başlatılıyor…' : 'Sosyal sinyalleri tara'}</Text>
        </Pressable>
      </View>
    );
  }

  return null;
}

function createStyles(colors: GastroColorScheme) {
  return StyleSheet.create({
    box: {
      backgroundColor: colors.panel,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: {
      color: colors.text,
      fontWeight: '600',
      fontSize: 14,
    },
    sub: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 4,
    },
    spinner: {
      marginTop: 8,
    },
    button: {
      marginTop: 10,
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 13,
    },
  });
}
