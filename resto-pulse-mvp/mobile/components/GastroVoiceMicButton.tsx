import { Platform } from 'react-native';

import { GastroVoiceMicButtonNative } from '@/components/GastroVoiceMicButtonNative';
import { GastroVoiceMicButtonWhisper } from '@/components/GastroVoiceMicButtonWhisper';

type Props = {
  /** isFinal=true yalnizca kullanici durdurunca veya active=false olunca. */
  onTranscript: (text: string, isFinal: boolean) => void;
  disabled?: boolean;
  compact?: boolean;
  /** false olunca dinleme durdurulur (arama tamamlandi vb.). */
  active?: boolean;
};

/** iOS: Whisper backend · Android: cihaz STT (expo-speech-recognition). */
export function GastroVoiceMicButton({
  active = true,
  onTranscript,
  disabled = false,
  compact = false,
}: Props) {
  const shared = {
    active,
    onTranscript,
    disabled: disabled || !active,
    compact,
  };

  if (Platform.OS === 'ios') {
    return <GastroVoiceMicButtonWhisper {...shared} />;
  }

  return <GastroVoiceMicButtonNative {...shared} />;
}
