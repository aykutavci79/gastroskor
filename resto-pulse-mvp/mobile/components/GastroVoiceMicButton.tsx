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
  /** Orb overlay gibi ozel UI icin seffaf dokunma alani */
  orbOverlay?: boolean;
  onUiStateChange?: (state: VoiceMicUiState) => void;
};

/** iOS: Whisper backend · Android: cihaz STT (expo-speech-recognition). */
export function GastroVoiceMicButton({
  active = true,
  onTranscript,
  disabled = false,
  compact = false,
  orbOverlay = false,
  onUiStateChange,
}: Props) {
  const shared = {
    active,
    onTranscript,
    disabled: disabled || !active,
    compact,
    orbOverlay,
    onUiStateChange,
  };

  if (Platform.OS === 'ios') {
    return <GastroVoiceMicButtonWhisper {...shared} />;
  }

  return <GastroVoiceMicButtonNative {...shared} />;
}
