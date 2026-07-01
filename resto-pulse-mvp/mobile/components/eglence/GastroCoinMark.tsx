import { Image, StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';

const ICON_GC = require('@/assets/gastro-hub/gastrocoin-icon-gc.png');
const LOGO = require('@/assets/gastro-hub/gastrocoin-logo.png');
const WALLET_LOGO = require('@/assets/gastro-hub/gastrocoin-wallet-transparent.png');
const WALLET_COIN = require('@/assets/gastro-hub/designs/gastrocoin-wallet-coin-transparent.png');

export type GastroCoinMarkVariant = 'icon' | 'logo' | 'wallet' | 'wallet-coin';

type Props = {
  variant?: GastroCoinMarkVariant;
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
};

function resolveSource(variant: GastroCoinMarkVariant) {
  switch (variant) {
    case 'wallet':
      return WALLET_LOGO;
    case 'wallet-coin':
      return WALLET_COIN;
    case 'logo':
      return LOGO;
    default:
      return ICON_GC;
  }
}

export function GastroCoinMark({ variant = 'icon', size = 20, style, imageStyle }: Props) {
  const source = resolveSource(variant);
  const isWalletFull = variant === 'wallet' || variant === 'logo';
  const isCoinOnly = variant === 'wallet-coin';
  const height = isCoinOnly ? size * 1.08 : isWalletFull ? size * 1.38 : size;
  const width = isCoinOnly ? size * 1.08 : isWalletFull ? size * 2.35 : size;

  return (
    <View style={[styles.wrap, { width, height }, style]}>
      <Image
        source={source}
        style={[styles.image, { width, height }, isCoinOnly && styles.coinImage, imageStyle]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  image: {},
  coinImage: { marginBottom: 2 },
});
