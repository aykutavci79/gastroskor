import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import { CityAtmosphereStrip } from '@/components/CityAtmosphereStrip';
import { CityPickerModal } from '@/components/CityPickerModal';
import { DmAvatarButton } from '@/components/DmAvatarButton';
import { KesfetSearchModelPicker, type KesfetSearchModel } from '@/components/KesfetSearchModelPicker';
import { OrdersHeaderButton } from '@/components/OrdersHeaderButton';
import type { GastroColorScheme } from '@/constants/theme';
import { useCity } from '@/context/city-context';
import { useGastroTheme } from '@/context/theme-context';

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  onSearchFocus?: () => void;
  onSearchBlur?: () => void;
  onClear?: () => void;
  onDismiss?: () => void;
  searchInputRef?: RefObject<TextInput | null>;
  searchFocused?: boolean;
  showReviewTicker?: boolean;
  searchModel?: KesfetSearchModel;
  onSearchModelChange?: (value: KesfetSearchModel) => void;
  canRunSocial?: boolean;
};

export function KesfetHomeChrome({
  query,
  onQueryChange,
  onSearchFocus,
  onSearchBlur,
  onClear,
  onDismiss,
  searchInputRef,
  searchFocused = false,
  showReviewTicker = true,
  searchModel = 'gastroskor',
  onSearchModelChange,
  canRunSocial = false,
}: Props) {
  const { colors, shadow } = useGastroTheme();
  const styles = useMemo(() => createStyles(colors, shadow), [colors, shadow]);
  const { city, cityLabel, manual, setCity, refreshFromLocation } = useCity();
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const showClear = query.trim().length > 0;

  const statusLine = manual ? t('explore.manualCity') : t('explore.autoCity');

  function handleCityPress() {
    setPickerOpen(true);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Text style={styles.brand}>GastroSkor</Text>
      </View>
      <CityPickerModal
        visible={pickerOpen}
        selected={city}
        onSelect={(next) => void setCity(next, { manual: true })}
        onClose={() => setPickerOpen(false)}
        onUseLocation={() => {
          setPickerOpen(false);
          void refreshFromLocation();
        }}
      />
      <View style={[styles.searchCard, searchFocused && styles.searchCardFocused]}>
        <View style={styles.searchHeadingRow}>
          <Text style={styles.searchHeading}>{t('explore.citySearchHeading', { city: cityLabel })}</Text>
          <View style={styles.searchHeadingActions}>
            <OrdersHeaderButton />
            <DmAvatarButton />
          </View>
        </View>
        <View style={styles.searchRow}>
          <View
            style={[
              styles.searchBox,
              searchFocused && styles.searchBoxFocused,
              onSearchModelChange && (searchFocused || query.trim().length > 0)
                ? styles.searchBoxFlex
                : null,
            ]}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              ref={searchInputRef}
              value={query}
              onChangeText={onQueryChange}
              onFocus={onSearchFocus}
              onBlur={onSearchBlur}
              placeholder={t('explore.searchPlaceholder')}
              placeholderTextColor={colors.placeholder}
              style={styles.searchInput}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              blurOnSubmit={false}
            />
            {showClear ? (
              <Pressable
                onPress={onClear}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={t('explore.searchLabel')}>
                <Ionicons name="close-circle" size={18} color={colors.muted} />
              </Pressable>
            ) : searchFocused && onDismiss ? (
              <Pressable
                onPress={onDismiss}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}>
                <Text style={styles.cancel}>{t('common.cancel')}</Text>
              </Pressable>
            ) : (
              <View style={styles.clearSlot} />
            )}
          </View>
          {onSearchModelChange && (searchFocused || query.trim().length > 0) ? (
            <KesfetSearchModelPicker
              value={searchModel}
              onChange={onSearchModelChange}
              canRunSocial={canRunSocial}
            />
          ) : null}
        </View>
      </View>
      <CityAtmosphereStrip
        city={city}
        statusLine={statusLine}
        manual={manual}
        showTicker={showReviewTicker}
        onCityPress={handleCityPress}
      />
    </View>
  );
}

function createStyles(colors: GastroColorScheme, shadow: ReturnType<typeof import('@/constants/theme').gastroShadowFor>) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: 12,
      paddingTop: 6,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 8,
      flexShrink: 0,
      backgroundColor: colors.bg,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    brand: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    searchCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.panel,
      padding: 12,
      gap: 8,
      ...shadow.card,
    },
    searchCardFocused: {
      borderColor: colors.accent,
    },
    searchHeadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    searchHeading: {
      flex: 1,
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    searchHeadingActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexShrink: 0,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    searchBoxFlex: {
      flex: 1,
      minWidth: 0,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.input,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    searchBoxFocused: {
      borderColor: colors.accent,
    },
    searchIcon: {
      color: colors.muted,
      fontSize: 14,
      fontWeight: '700',
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 12,
      padding: 0,
    },
    clearSlot: {
      width: 18,
      height: 18,
    },
    cancel: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: '700',
    },
  });
}
