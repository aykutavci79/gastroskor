import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { GastroColors, GastroShadow } from '@/constants/theme';

type Props = {
  children: ReactNode;
  featured?: boolean;
  badge?: string | null;
  style?: ViewStyle;
};

/** Gradient yerine duz border — release build native cokme riskini azaltir */
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
      <View style={styles.gradientBorder}>
        <View style={styles.cardShell}>{children}</View>
      </View>
      {badge ? (
        <View style={styles.badgeWrap} pointerEvents="none">
          <View style={styles.badge}>
            <Text style={styles.badgeText} numberOfLines={1}>
              {badge}
            </Text>
          </View>
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
    borderWidth: 2,
    borderColor: GastroColors.accent,
    backgroundColor: GastroColors.gold,
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
    backgroundColor: GastroColors.accent,
    borderWidth: 1,
    borderColor: GastroColors.gold,
  },
  badgeText: {
    color: GastroColors.text,
    fontSize: 10,
    fontWeight: '800',
  },
});
