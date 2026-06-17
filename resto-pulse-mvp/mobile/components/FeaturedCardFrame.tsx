import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import type { GastroColorScheme, GastroShadowScheme } from '@/constants/theme';
import { useGastroTheme } from '@/context/theme-context';

type Props = {
  children: ReactNode;
  featured?: boolean;
  badge?: string | null;
  style?: ViewStyle;
};

/** Gradient yerine duz border — release build native cokme riskini azaltir */
export function FeaturedCardFrame({ children, featured = false, badge, style }: Props) {
  const { colors, shadow } = useGastroTheme();
  const styles = useMemo(() => createStyles(colors, shadow), [colors, shadow]);

  const badgeNode = badge ? (
    <View style={styles.badgeWrap} pointerEvents="none">
      <View style={styles.badge}>
        <Text style={styles.badgeText} numberOfLines={1}>
          {badge}
        </Text>
      </View>
    </View>
  ) : null;

  if (!featured) {
    return (
      <View style={[styles.cardPlain, style]}>
        <View style={styles.cardShell}>{children}</View>
        {badgeNode}
      </View>
    );
  }

  return (
    <View style={[styles.cardOuter, shadow.featured, style]}>
      <View style={styles.gradientBorder}>
        <View style={styles.cardShell}>{children}</View>
      </View>
      {badgeNode}
    </View>
  );
}

function createStyles(colors: GastroColorScheme, shadow: GastroShadowScheme) {
  return StyleSheet.create({
    cardOuter: {
      position: 'relative',
      borderRadius: 16,
    },
    gradientBorder: {
      borderRadius: 16,
      padding: 2,
      borderWidth: 2,
      borderColor: colors.accent,
      backgroundColor: colors.gold,
    },
    cardShell: {
      backgroundColor: colors.panel,
      borderRadius: 14,
      padding: 12,
      gap: 6,
    },
    cardPlain: {
      position: 'relative',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      backgroundColor: colors.panel,
      ...shadow.card,
    },
    badgeWrap: {
      position: 'absolute',
      top: 10,
      right: 10,
      zIndex: 20,
      maxWidth: '46%',
    },
    badge: {
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      backgroundColor: colors.accent,
      borderWidth: 1,
      borderColor: colors.gold,
    },
    badgeText: {
      color: colors.accentDark,
      fontSize: 10,
      fontWeight: '800',
    },
  });
}
