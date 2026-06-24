import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';

import { EGLENCE_TAB_PALETTE } from '@/lib/eglence-warm';

type Props = {
  focused: boolean;
  size: number;
};

export function EglenceTabIcon({ focused, size }: Props) {
  const tint = focused ? '#FFAA3C' : '#B8956A';

  return (
    <View style={[styles.wrap, { width: size + 10, height: size + 10 }]}>
      {EGLENCE_TAB_PALETTE.slice(0, 4).map((dotColor, i) => {
        const angle = (i / 4) * Math.PI * 2 - Math.PI / 2;
        const r = size * 0.38;
        return (
          <View
            key={dotColor}
            style={[
              styles.orbitDot,
              {
                backgroundColor: dotColor,
                opacity: focused ? 0.95 : 0.55,
                transform: [
                  { translateX: Math.cos(angle) * r },
                  { translateY: Math.sin(angle) * r },
                ],
              },
            ]}
          />
        );
      })}
      <View
        style={[
          styles.ring,
          {
            width: size + 8,
            height: size + 8,
            borderRadius: (size + 8) / 2,
            borderColor: focused ? '#FFAA3C' : 'rgba(255, 170, 60, 0.4)',
            opacity: focused ? 0.85 : 0.45,
          },
        ]}
      />
      <Ionicons
        name={focused ? 'game-controller' : 'game-controller-outline'}
        size={size}
        color={tint}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitDot: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
  },
});
