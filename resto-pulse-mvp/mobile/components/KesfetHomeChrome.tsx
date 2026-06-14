import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { RefObject } from 'react';

import { CityAtmosphereStrip } from '@/components/CityAtmosphereStrip';
import { CityPickerModal } from '@/components/CityPickerModal';
import { DmAvatarButton } from '@/components/DmAvatarButton';
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
}: Props) {
  const { colors, shadow } = useGastroTheme();
  const styles = useMemo(() => createStyles(colors, shadow), [colors, shadow]);
  const { city, cityLabel, manual, setCity, refreshFromLocation } = useCity();
  const [pickerOpen, setPickerOpen] = useState(false);
  const showClear = query.trim().length > 0;

  const statusLine = manual ? 'Şehir seçimin geçerli' : 'Konumuna göre';

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Text style={styles.brand}>GastroSkor</Text>
        <DmAvatarButton />
      </View>
      <Pressable
        onPress={() => {
          if (manual) {
            setPickerOpen(true);
          } else {
            void refreshFromLocation();
          }
        }}
        onLongPress={() => setPickerOpen(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={
          manual ? `${cityLabel} — elle seçili, değiştirmek için dokun` : `${cityLabel} — konumdan, yenilemek için dokun`
        }>
        <View style={styles.cityRow}>
          {!manual ? <Ionicons name="location-sharp" size={11} color={colors.accent} /> : null}
          <Text style={styles.city}>{cityLabel}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.muted} />
        </View>
      </Pressable>
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
        <Text style={styles.searchHeading}>{cityLabel}&apos;da ne yesek?</Text>
        <Text style={styles.searchSub}>{cityLabel} · Google Haritalar ile anlık mekan araması</Text>
        <View style={[styles.searchBox, searchFocused && styles.searchBoxFocused]}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            ref={searchInputRef}
            value={query}
            onChangeText={onQueryChange}
            onFocus={onSearchFocus}
            onBlur={onSearchBlur}
            placeholder="İskender, cantık, pideli köfte…"
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
              accessibilityLabel="Aramayı temizle">
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          ) : searchFocused && onDismiss ? (
            <Pressable
              onPress={onDismiss}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Aramadan vazgeç">
              <Text style={styles.cancel}>Vazgeç</Text>
            </Pressable>
          ) : (
            <View style={styles.clearSlot} />
          )}
        </View>
      </View>
      <CityAtmosphereStrip city={city} statusLine={statusLine} />
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
    cityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      alignSelf: 'flex-start',
    },
    city: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '700',
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
    searchHeading: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    searchSub: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '600',
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
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
