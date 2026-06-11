/** iOS STT restart oturumlari arasinda kismi metinleri birlestir. */
export function mergeSpeechTranscript(previous: string, incoming: string): string {
  const prev = previous.trim();
  const next = incoming.trim();
  if (!next) return prev;
  if (!prev) return next;
  if (next.startsWith(prev) || prev.startsWith(next)) {
    return next.length >= prev.length ? next : prev;
  }
  const prevLower = prev.toLocaleLowerCase('tr-TR');
  const nextLower = next.toLocaleLowerCase('tr-TR');
  if (prevLower.includes(nextLower) || nextLower.includes(prevLower)) {
    return next.length >= prev.length ? next : prev;
  }
  return `${prev} ${next}`.replace(/\s+/g, ' ').trim();
}
