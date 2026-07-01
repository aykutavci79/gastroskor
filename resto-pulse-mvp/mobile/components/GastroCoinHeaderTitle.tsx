import { StyleSheet, Text, View } from 'react-native';

import { GastroCoinMark } from '@/components/eglence/GastroCoinMark';
import { GastroColors, GastroColorsLight } from '@/constants/theme';

type Tone = 'light' | 'dark';

type Props = {
  title: string;
  /** Beyaz header (online sipariş) vs koyu tema */
  tone?: Tone;
  coinSize?: number;
  numberOfLines?: number;
};

export function GastroCoinHeaderTitle({
  title,
  tone = 'dark',
  coinSize = 20,
  numberOfLines = 1,
}: Props) {
  const textColor = tone === 'light' ? GastroColorsLight.text : GastroColors.text;

  return (
    <View style={styles.row}>
      <GastroCoinMark variant="wallet-coin" size={coinSize} />
      <Text style={[styles.title, { color: textColor }]} numberOfLines={numberOfLines}>
        {title}
      </Text>
    </View>
  );
}

/** Expo Router Stack.Screen `headerTitle` factory */
export function gastroCoinStackHeaderTitle(title: string, tone: Tone = 'dark') {
  function GastroCoinStackHeaderTitle() {
    return <GastroCoinHeaderTitle title={title} tone={tone} />;
  }
  GastroCoinStackHeaderTitle.displayName = 'GastroCoinStackHeaderTitle';
  return GastroCoinStackHeaderTitle;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 280,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    flexShrink: 1,
  },
});
