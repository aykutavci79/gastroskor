import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

/** Keşfet — arama / keşif mavisi */
const KESFET_ACTIVE = '#4DA3FF';
const KESFET_IDLE = '#6E8FAE';

type Props = {
  focused: boolean;
  size: number;
};

export function KesfetTabIcon({ focused, size }: Props) {
  const tint = focused ? KESFET_ACTIVE : KESFET_IDLE;

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
              backgroundColor: 'rgba(77, 163, 255, 0.18)',
            },
          ]}
        />
      ) : null}
      <Ionicons name={focused ? 'search' : 'search-outline'} size={size} color={tint} />
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
