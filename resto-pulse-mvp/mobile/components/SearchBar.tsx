import { StyleSheet, TextInput, View } from 'react-native';

import { GastroColors, GastroStyles } from '@/constants/theme';

type Props = {
  query: string;
  city: string;
  onQueryChange: (v: string) => void;
  onCityChange: (v: string) => void;
};

export function SearchBar({ query, city, onQueryChange, onCityChange }: Props) {
  return (
    <View style={styles.wrap}>
      <TextInput
        value={query}
        onChangeText={onQueryChange}
        placeholder="Restoran ara..."
        placeholderTextColor={GastroColors.placeholder}
        style={styles.input}
        returnKeyType="search"
      />
      <TextInput
        value={city}
        onChangeText={onCityChange}
        placeholder="Sehir (opsiyonel)"
        placeholderTextColor={GastroColors.placeholder}
        style={[styles.input, styles.city]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  input: GastroStyles.input,
  city: { fontSize: 14 },
});
