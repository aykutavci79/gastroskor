import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DmAvatarButton } from '@/components/DmAvatarButton';
import { GastroBrandMark } from '@/components/GastroBrandMark';
import { GastroColors } from '@/constants/theme';

type Props = {
  title: string;
  subtitle?: string;
  kicker?: string;
  trailing?: ReactNode;
  showDmAvatar?: boolean;
  showBrandMark?: boolean;
};

export function TabScreenHeader({
  title,
  subtitle,
  kicker,
  trailing,
  showDmAvatar = true,
  showBrandMark = false,
}: Props) {
  const trailingNode = trailing ?? (showDmAvatar ? <DmAvatarButton /> : null);

  return (
    <View style={styles.wrap}>
      {showBrandMark || trailingNode ? (
        <View style={styles.topRow}>
          {showBrandMark ? (
            <View style={styles.brandSlot}>
              <GastroBrandMark showTagline />
            </View>
          ) : (
            <View style={styles.brandSlot} />
          )}
          {trailingNode}
        </View>
      ) : null}
      <View style={styles.meta}>
        {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  brandSlot: { flex: 1 },
  meta: { gap: 4 },
  kicker: { color: GastroColors.accent, fontWeight: '700', fontSize: 12, letterSpacing: 0.6 },
  title: { color: GastroColors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: GastroColors.muted, fontSize: 14, lineHeight: 20 },
});
