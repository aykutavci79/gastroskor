import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useMemo } from 'react';
import { I18nManager, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import type { GastroColorScheme } from '@/constants/theme';
import { useGastroTheme } from '@/context/theme-context';
import { openKesfetVoiceOverlay } from '@/lib/kesfet-voice-bridge';

const MIC_SIZE = 56;
const MIC_LIFT = 18;
const MIC_GAP = 72;

type TabEntry = {
  route: BottomTabBarProps['state']['routes'][number];
  index: number;
  options: BottomTabBarProps['descriptors'][string]['options'];
};

const HIDDEN_TAB_ROUTES = new Set(['panel']);

function isHiddenTab(entry: TabEntry) {
  if (HIDDEN_TAB_ROUTES.has(entry.route.name)) return true;
  const href = (entry.options as { href?: string | null }).href;
  return href === null;
}

function TabButton({
  entry,
  isFocused,
  navigation,
  colors,
}: {
  entry: TabEntry;
  isFocused: boolean;
  navigation: BottomTabBarProps['navigation'];
  colors: GastroColorScheme;
}) {
  const { route, index, options } = entry;
  const tabAccent =
    typeof options.tabBarActiveTintColor === 'string' ? options.tabBarActiveTintColor : colors.accent;
  const color = isFocused ? tabAccent : colors.muted;
  const label =
    options.tabBarLabel !== undefined
      ? String(options.tabBarLabel)
      : options.title !== undefined
        ? options.title
        : route.name;

  const onPress = () => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  const icon = options.tabBarIcon?.({ focused: isFocused, color, size: 20 });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      onPress={onPress}
      style={styles.tab}>
      {icon}
      <Text style={[styles.label, { color }, isFocused && styles.labelOn]}>{label}</Text>
      {options.tabBarBadge != null ? (
        <View style={[styles.badge, { backgroundColor: tabAccent }]}>
          <Text style={styles.badgeText}>{String(options.tabBarBadge)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function CenterMicTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useGastroTheme();
  const { t } = useTranslation();
  const shellStyles = useMemo(() => createShellStyles(colors), [colors]);

  const tabs: TabEntry[] = state.routes
    .map((route, index) => ({
      route,
      index,
      options: descriptors[route.key].options,
    }))
    .filter((entry) => !isHiddenTab(entry));

  const splitAt = Math.ceil(tabs.length / 2);
  const leftTabs = tabs.slice(0, splitAt);
  const rightTabs = tabs.slice(splitAt);

  return (
    <View style={[shellStyles.wrap, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      <View style={styles.row}>
        <View style={styles.side}>
          {leftTabs.map((entry) => (
            <TabButton
              key={entry.route.key}
              entry={entry}
              isFocused={state.index === entry.index}
              navigation={navigation}
              colors={colors}
            />
          ))}
        </View>
        <View style={styles.micGap} />
        <View style={styles.side}>
          {rightTabs.map((entry) => (
            <TabButton
              key={entry.route.key}
              entry={entry}
              isFocused={state.index === entry.index}
              navigation={navigation}
              colors={colors}
            />
          ))}
        </View>
      </View>

      <View style={[styles.micSlot, { top: -MIC_LIFT }]} pointerEvents="box-none">
        <Pressable
          style={({ pressed }) => [shellStyles.micBtn, pressed && styles.micBtnPressed]}
          onPress={openKesfetVoiceOverlay}
          accessibilityRole="button"
          accessibilityLabel={t('nav.voiceSearch')}>
          <Ionicons name="mic" size={22} color="#fff" />
          </Pressable>
        <Text style={[styles.micLabel, { color: colors.accent }]}>{t('nav.voice')}</Text>
      </View>
    </View>
  );
}

function createShellStyles(colors: GastroColorScheme) {
  return StyleSheet.create({
    wrap: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.panel,
      paddingTop: 8,
      position: 'relative',
    },
    micBtn: {
      width: MIC_SIZE,
      height: MIC_SIZE,
      borderRadius: MIC_SIZE / 2,
      backgroundColor: colors.accent,
      borderWidth: 3,
      borderColor: colors.panel,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 4,
  },
  side: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  micGap: { width: MIC_GAP, flexShrink: 0 },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    minWidth: 0,
  },
  label: { fontSize: 10, fontWeight: '500' },
  labelOn: { fontWeight: '700' },
  badge: {
    position: 'absolute',
    top: -2,
    end: 8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  micSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  micBtnPressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  micLabel: {
    marginTop: 4,
    fontSize: 9,
    fontWeight: '800',
  },
});
