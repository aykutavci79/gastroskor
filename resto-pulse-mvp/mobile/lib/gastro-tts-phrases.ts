/**
 * Sesli geri bildirim — sabit, kisa cumleler (kulak asinaligi).
 * Detay her zaman ekranda; TTS sadece durum ozeti.
 */
export const GASTRO_TTS = {
  listening: 'Dinliyorum.',
  resultsReady: 'Uygun restoranlar sıralandı.',
  noResults: 'Restoran bulamadım.',
  confirmPrompt: 'Onaylıyor musun?',
  retry: 'Tekrar dene.',
} as const;

export type GastroTtsPhraseKey = keyof typeof GASTRO_TTS;

export function gastroTtsPhrase(key: GastroTtsPhraseKey): string {
  return GASTRO_TTS[key];
}
