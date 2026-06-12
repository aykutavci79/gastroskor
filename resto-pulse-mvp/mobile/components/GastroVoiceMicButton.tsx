import { Platform } from 'react-native';

import { GastroVoiceMicButtonNative } from '@/components/GastroVoiceMicButtonNative';
import { GastroVoiceMicButtonWhisper } from '@/components/GastroVoiceMicButtonWhisper';

export type VoiceMicUiState = {
  listening: boolean;
  transcribing: boolean;
};

type Props = {
  /** isFinal=true yalnizca kullanici durdurunca veya active=false olunca. */
  onTranscript: (text: string, isFinal: boolean) => void;
  disabled?: boolean;
  compact?: boolean;
  /** false olunca dinleme durdurulur (arama tamamlandi vb.). */
  active?: boolean;
  /** Keşfet orb ustu — online siparis compact ile ayni STT yolu */
  overlayCompact?: boolean;
  /** @deprecated overlayCompact kullan */
  orbOverlay?: boolean;
  /** Acilista otomatik kayit baslat (Keşfet ses overlay). */
  autoStart?: boolean;
  onUiStateChange?: (state: VoiceMicUiState) => void;
  onHintChange?: (hint: string | null) => void;
};

/** iOS: Whisper backend · Android: cihaz STT (expo-speech-recognition). */
export function GastroVoiceMicButton({
  active = true,
  onTranscript,
  disabled = false,
  compact = false,
  overlayCompact = false,
  orbOverlay = false,
  autoStart = false,
  onUiStateChange,
  onHintChange,
}: Props) {
  const shared = {
    active,
    onTranscript,
    disabled: disabled || !active,
    compact: compact || overlayCompact || orbOverlay,
    overlayCompact: overlayCompact || orbOverlay,
    autoStart,
    onUiStateChange,
    onHintChange,
  };

  if (Platform.OS === 'ios') {
    return <GastroVoiceMicButtonWhisper {...shared} />;
  }

  return <GastroVoiceMicButtonNative {...shared} />;
}
