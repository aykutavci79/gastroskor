/** Suskunluk VAD kapali — iOS ve Android'de kullanici dokunarak bitirir. */
export function usesManualMicFinish(): boolean {
  return true;
}

/** @deprecated usesManualMicFinish */
export function usesIosManualMicFinish(): boolean {
  return usesManualMicFinish();
}

export function voiceMicSheetSubcopy(): string {
  return 'Mikrofon açılır, ürünü söyle. Bitirince mikrofona tekrar dokun — arama başlar. Bütçe şart değil.';
}

export function voiceMicCompactRecordingHint(): string {
  return 'Aramak için tekrar dokun';
}

export function voiceMicRecordingLabel(): string {
  return 'Dinleniyor…';
}

export function voiceMicIdleAccessibilityHint(): string {
  return 'Konuşmak için dokun; bitirince tekrar dokun';
}

export function voiceMicRecordingAccessibilityHint(): string {
  return 'Aramayı bitirmek için tekrar dokun';
}
