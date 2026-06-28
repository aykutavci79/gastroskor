/** Suskunluk VAD kapali — kullanici dokunarak baslar, bitirince tekrar dokunarak STT. */
export function usesManualMicFinish(): boolean {
  return true;
}

/** @deprecated usesManualMicFinish */
export function usesIosManualMicFinish(): boolean {
  return usesManualMicFinish();
}

export function voiceMicSheetSubcopy(): string {
  return 'Mikrofona dokun, ürünü söyle. Bitirince mikrofona tekrar dokun — arama başlar. Bütçe şart değil.';
}

export function voiceMicCompactRecordingHint(): string {
  return 'Bitirince mikrofona tekrar dokun';
}

export function voiceMicRecordingLabel(): string {
  return 'Dinleniyor…';
}

export function voiceMicIdleAccessibilityHint(): string {
  return 'Konuşmak için dokun; bitirince tekrar dokun';
}

export function voiceMicRecordingAccessibilityHint(): string {
  return 'Konuşmayı bitirmek için mikrofona tekrar dokun';
}
