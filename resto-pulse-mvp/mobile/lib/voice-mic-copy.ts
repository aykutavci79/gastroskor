import { Platform } from 'react-native';

/** iOS Whisper VAD sessizlikte guvenilir degil — kullanici dokunarak bitirir. */
export function usesIosManualMicFinish(): boolean {
  return Platform.OS === 'ios';
}

export function voiceMicSheetSubcopy(): string {
  if (usesIosManualMicFinish()) {
    return 'Mikrofon açılır, ürünü söyle. Bitirince mikrofona tekrar dokun — arama başlar. Bütçe şart değil.';
  }
  return 'Mikrofon açılır, ürünü söyle. 2–3 sn susunca otomatik arar; istersen bitirmek için mikrofona tekrar dokun. Bütçe şart değil.';
}

export function voiceMicCompactRecordingHint(): string {
  return usesIosManualMicFinish() ? 'Aramak için tekrar dokun' : 'Susunca otomatik biter';
}

export function voiceMicRecordingLabel(): string {
  return usesIosManualMicFinish() ? 'Dinleniyor…' : 'Dinleniyor… (susunca biter)';
}

export function voiceMicIdleAccessibilityHint(): string {
  return usesIosManualMicFinish()
    ? 'Konuşmak için dokun; bitirince tekrar dokun'
    : 'Konuşmak için dokun; susunca otomatik biter';
}

export function voiceMicRecordingAccessibilityHint(): string {
  return usesIosManualMicFinish()
    ? 'Aramayı bitirmek için tekrar dokun'
    : 'Dinlemeyi bitirmek için tekrar dokun veya sus';
}
