import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type ViewStyle } from 'react-native';

import { LOCAL_KITCHEN_IMAGES } from '@/constants/kitchen-category-images';
import { GastroColors } from '@/constants/theme';
import { peekTileWidth } from '@/lib/horizontal-peek-layout';

/** v1 önizleme — gerçek feed API gelince ReviewImage ile değişecek. */
const MOCK_PHOTOS = [
  { dish: 'İskender', place: 'Kebapçı İskender', ago: '2 dk', image: LOCAL_KITCHEN_IMAGES['kebap-izgara'] },
  { dish: 'Cantık', place: 'Kayhan Cantıkçısı', ago: '18 dk', image: LOCAL_KITCHEN_IMAGES['firin'] },
  { dish: 'Künefe', place: 'Hacı Dayı', ago: '41 dk', image: LOCAL_KITCHEN_IMAGES['tatli-tuzlu'] },
  { dish: 'Pideli köfte', place: 'Yılmaz Usta', ago: '1 sa', image: LOCAL_KITCHEN_IMAGES['ev-yemekleri'] },
  { dish: 'Kemalpaşa', place: 'Tarihi Tatlıcı', ago: '2 sa', image: LOCAL_KITCHEN_IMAGES['tatli-tuzlu'] },
  { dish: 'Lahmacun', place: 'Fırın Sofrası', ago: '3 sa', image: LOCAL_KITCHEN_IMAGES['firin'] },
];

const TILE_GAP = 10;
const PEEK_RIGHT = 40;

type Props = {
  style?: ViewStyle;
  onDismissKeyboard?: () => void;
};

export function RecentPhotosStrip({ style, onDismissKeyboard }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const tileWidth = peekTileWidth(screenWidth, { gap: TILE_GAP, peekRight: PEEK_RIGHT });

  return (
    <Pressable style={[styles.section, style]} onPress={onDismissKeyboard} accessible={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Az önce yenilenler</Text>
          <Text style={styles.sub}>Gerçek tabaklar · restoran etiketli</Text>
        </View>
        <Pressable hitSlop={8}>
          <Text style={styles.link}>Tümü →</Text>
        </Pressable>
      </View>

      <View style={styles.stripHost}>
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          style={styles.stripScroll}
          contentContainerStyle={styles.strip}>
          {MOCK_PHOTOS.map((row) => (
            <View key={`${row.place}-${row.dish}`} style={[styles.tileCol, { width: tileWidth }]}>
              <View style={styles.tileImage}>
                {row.image ? (
                  <Image source={row.image} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                  <View style={styles.tileFallback} />
                )}
                <View style={styles.reportBtn}>
                  <Text style={styles.reportText}>!</Text>
                </View>
              </View>
              <Text style={styles.dish} numberOfLines={1}>
                {row.dish}
              </Text>
              <Text style={styles.place} numberOfLines={1}>
                {row.place}
              </Text>
              <Text style={styles.ago}>{row.ago}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingLeft: 12,
    gap: 8,
    flex: 1,
    minHeight: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 12,
    flexShrink: 0,
  },
  title: { color: GastroColors.text, fontSize: 14, fontWeight: '800' },
  sub: { color: GastroColors.muted, fontSize: 10, marginTop: 2 },
  link: { color: GastroColors.accent, fontSize: 11, fontWeight: '700' },
  stripHost: {
    flex: 1,
    minHeight: 0,
  },
  stripScroll: {
    flex: 1,
  },
  strip: {
    paddingRight: 12,
    gap: TILE_GAP,
    alignItems: 'stretch',
    minHeight: '100%',
  },
  tileCol: {
    flexShrink: 0,
    alignSelf: 'stretch',
    gap: 4,
  },
  tileImage: {
    flex: 1,
    minHeight: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.input,
    overflow: 'hidden',
    position: 'relative',
  },
  tileFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: GastroColors.input,
  },
  reportBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.62)',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  reportText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  dish: {
    color: GastroColors.text,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
  },
  place: {
    color: GastroColors.muted,
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 13,
  },
  ago: {
    color: GastroColors.placeholder,
    fontSize: 9,
  },
});
