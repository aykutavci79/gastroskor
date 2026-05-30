import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GastroColors } from '@/constants/theme';

type Props = {
  value: number;
  onChange: (value: number) => void;
  size?: number;
};

export function StarRatingPicker({ value, onChange, size = 28 }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value;
        return (
          <Pressable key={star} onPress={() => onChange(star)} hitSlop={6} accessibilityRole="button">
            <Text style={[styles.star, { fontSize: size }, active && styles.starActive]}>
              ★
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  star: { color: GastroColors.muted },
  starActive: { color: GastroColors.accent },
});
