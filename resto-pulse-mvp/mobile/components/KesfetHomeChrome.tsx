import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { RefObject } from 'react';

import { CityPickerModal } from '@/components/CityPickerModal';
import { DmAvatarButton } from '@/components/DmAvatarButton';
import { GastroColors } from '@/constants/theme';
import { useCity } from '@/context/city-context';

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
  const { city, cityLabel, manual, setCity, refreshFromLocation } = useCity();
  const [pickerOpen, setPickerOpen] = useState(false);
  const showClear = query.trim().length > 0;

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
          {!manual ? (
            <Ionicons name="location-sharp" size={11} color={GastroColors.accent} />
          ) : null}
          <Text style={styles.city}>{cityLabel}</Text>
          <Ionicons name="chevron-down" size={14} color={GastroColors.muted} />
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
      <View style={[styles.searchBox, searchFocused && styles.searchBoxFocused]}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          ref={searchInputRef}
          value={query}
          onChangeText={onQueryChange}
          onFocus={onSearchFocus}
          onBlur={onSearchBlur}
          placeholder="İskender, cantık, pideli köfte…"
          placeholderTextColor={GastroColors.placeholder}
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
            <Ionicons name="close-circle" size={18} color={GastroColors.muted} />
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
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: GastroColors.border,
    gap: 5,
    flexShrink: 0,
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
    color: GastroColors.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  brand: {
    color: GastroColors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.input,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchBoxFocused: {
    borderColor: GastroColors.accent,
  },
  searchIcon: {
    color: GastroColors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  searchInput: {
    flex: 1,
    color: GastroColors.text,
    fontSize: 12,
    padding: 0,
  },
  clearSlot: {
    width: 18,
    height: 18,
  },
  cancel: {
    color: GastroColors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
});
