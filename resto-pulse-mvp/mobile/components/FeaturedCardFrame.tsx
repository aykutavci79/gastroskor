import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { GastroColors, GastroShadow } from '@/constants/theme';

type Props = {
  children: ReactNode;
  featured?: boolean;
  badge?: string | null;
  style?: ViewStyle;
};

export function FeaturedCardFrame({ children, featured = false, badge, style }: Props) {
  if (!featured) {
    return (
      <View style={[styles.cardShell, styles.cardPlain, style]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.cardOuter, GastroShadow.featured, style]}>
      <LinearGradient
        colors={[GastroColors.accent, GastroColors.gold]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBorder}>
        <View style={styles.cardShell}>{children}</View>
      </LinearGradient>
      {badge ? (
        <View style={styles.badgeWrap} pointerEvents="none">
          <LinearGradient
            colors={[GastroColors.accent, GastroColors.gold]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.badge}>
            <Text style={styles.badgeText} numberOfLines={1}>
              {badge}
            </Text>
          </LinearGradient>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    position: 'relative',
    borderRadius: 16,
  },
  gradientBorder: {
    borderRadius: 16,
    padding: 2,
  },
  cardShell: {
    backgroundColor: GastroColors.panel,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  cardPlain: {
    borderWidth: 1,
    borderColor: GastroColors.border,
    borderRadius: 16,
    padding: 12,
    gap: 6,
    backgroundColor: GastroColors.panel,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
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
  },
  badgeText: {
    color: GastroColors.text,
    fontSize: 10,
    fontWeight: '800',
  },
});
