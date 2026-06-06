export type AvatarPresetId = 'chef' | 'olive' | 'coffee' | 'doner' | 'dessert' | 'spice';

export type AvatarPreset = {
  id: AvatarPresetId;
  label: string;
  emoji: string;
};

export const GOURMET_AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'chef', label: 'Sef', emoji: '👨‍🍳' },
  { id: 'olive', label: 'Zeytin', emoji: '🫒' },
  { id: 'coffee', label: 'Kahve', emoji: '☕' },
  { id: 'doner', label: 'Doner', emoji: '🥙' },
  { id: 'dessert', label: 'Tatli', emoji: '🍮' },
  { id: 'spice', label: 'Baharat', emoji: '🌶️' },
];

export function presetById(id: string | null | undefined): AvatarPreset | undefined {
  return GOURMET_AVATAR_PRESETS.find((item) => item.id === id);
}
