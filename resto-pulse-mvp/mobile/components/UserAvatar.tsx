import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { presetById } from '@/constants/gourmet-avatars';
import { GastroColors } from '@/constants/theme';

type Props = {
  avatarUrl?: string | null;
  avatarPreset?: string | null;
  size?: number;
  fallbackLabel?: string;
};

export function UserAvatar({ avatarUrl, avatarPreset, size = 40, fallbackLabel = '?' }: Props) {
  const preset = presetById(avatarPreset);
  const fontSize = Math.round(size * 0.45);

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={[styles.photo, { width: size, height: size, borderRadius: size / 2 }]}
        contentFit="cover"
      />
    );
  }

  if (preset) {
    return (
      <View style={[styles.preset, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={{ fontSize }}>{preset.emoji}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.fallbackText, { fontSize: fontSize * 0.85 }]}>
        {fallbackLabel.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: {
    backgroundColor: GastroColors.input,
    borderWidth: 1,
    borderColor: GastroColors.border,
  },
  preset: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GastroColors.accentSoft,
    borderWidth: 1,
    borderColor: GastroColors.accent,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GastroColors.input,
    borderWidth: 1,
    borderColor: GastroColors.border,
  },
  fallbackText: { color: GastroColors.muted, fontWeight: '800' },
});
