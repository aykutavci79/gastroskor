import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { GastroColors, GastroStyles } from '@/constants/theme';

type Props = {
  query: string;
  city: string;
  onQueryChange: (v: string) => void;
  onCityChange: (v: string) => void;
  onSearch: () => void;
  searching?: boolean;
};

export function SearchBar({
  query,
  city,
  onQueryChange,
  onCityChange,
  onSearch,
  searching = false,
}: Props) {
  return (
    <View style={styles.wrap}>
      <TextInput
        value={query}
        onChangeText={onQueryChange}
        placeholder="Restoran ara..."
        placeholderTextColor={GastroColors.placeholder}
        style={styles.input}
        returnKeyType="search"
        onSubmitEditing={onSearch}
        autoCorrect={false}
        autoCapitalize="none"
      />
      <View style={styles.row}>
        <TextInput
          value={city}
          onChangeText={onCityChange}
          placeholder="Şehir (ör. Bursa)"
          placeholderTextColor={GastroColors.placeholder}
          style={[styles.input, styles.cityInput]}
          returnKeyType="search"
          onSubmitEditing={onSearch}
          autoCorrect={false}
        />
        <Pressable
          style={[styles.searchBtn, searching && styles.searchBtnDisabled]}
          onPress={onSearch}
          disabled={searching}>
          <Text style={styles.searchBtnText}>{searching ? '...' : 'Ara'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  input: GastroStyles.input,
  cityInput: { flex: 1, fontSize: 14 },
  searchBtn: {
    ...GastroStyles.btnPrimary,
    minWidth: 72,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  searchBtnDisabled: { opacity: 0.6 },
  searchBtnText: GastroStyles.btnPrimaryText,
});
