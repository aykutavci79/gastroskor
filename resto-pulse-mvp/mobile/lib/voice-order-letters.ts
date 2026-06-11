const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function voiceOrderLetter(index: number): string {
  return LETTERS[index] ?? String(index + 1);
}

export type VoiceOrderRestaurantOption = {
  letter: string;
  index: number;
  id: string;
  name: string;
};

export function buildVoiceOrderRestaurantOptions(
  restaurants: Array<{ id: string; name: string }>,
  limit = 8,
): VoiceOrderRestaurantOption[] {
  return restaurants.slice(0, limit).map((row, index) => ({
    letter: voiceOrderLetter(index),
    index,
    id: row.id,
    name: row.name,
  }));
}
