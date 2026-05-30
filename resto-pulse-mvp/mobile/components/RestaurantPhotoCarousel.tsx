import { Dimensions, Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GastroColors } from '@/constants/theme';

type Props = {
  photos: string[];
  height?: number;
};

const screenWidth = Dimensions.get('window').width;

export function RestaurantPhotoCarousel({ photos, height = 220 }: Props) {
  if (photos.length === 0) {
    return (
      <View style={[styles.placeholder, { height }]}>
        <Text style={styles.placeholderEmoji}>🍽️</Text>
        <Text style={styles.placeholderText}>Fotoğraf bulunamadı</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      style={{ height }}>
      {photos.map((uri, index) => (
        <Image
          key={`${uri}-${index}`}
          source={{ uri }}
          style={{ width: screenWidth, height }}
          resizeMode="cover"
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    width: screenWidth,
    backgroundColor: GastroColors.input,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderEmoji: { fontSize: 40, opacity: 0.35 },
  placeholderText: { color: GastroColors.muted, fontSize: 13 },
});
