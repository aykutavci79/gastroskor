import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

/** Takip — kırmızı kalp */
const TAKIP_ACTIVE = '#EF4444';
const TAKIP_IDLE = '#C97A7A';

type Props = {
  focused: boolean;
  size: number;
};

export function TakipTabIcon({ focused, size }: Props) {
  const tint = focused ? TAKIP_ACTIVE : TAKIP_IDLE;

  return (
    <View style={[styles.wrap, { width: size + 6, height: size + 6 }]}>
      {focused ? (
        <View
          style={[
            styles.glow,
            {
              width: size + 10,
              height: size + 10,
              borderRadius: (size + 10) / 2,
              backgroundColor: 'rgba(239, 68, 68, 0.16)',
            },
          ]}
        />
      ) : null}
      <Ionicons name={focused ? 'heart' : 'heart-outline'} size={size} color={tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
});
