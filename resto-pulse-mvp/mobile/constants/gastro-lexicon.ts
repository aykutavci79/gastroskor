/** GastroSkor ortak kelime çekirdeği — tüm kelime oyunları bu manifest’i paylaşır. */

export const GASTRO_LEXICON_GAMES = [
  'kelime-sofrasi',
  'gunluk-kelime',
  'kelime-yarismasi',
] as const;

export type GastroLexiconGameId = (typeof GASTRO_LEXICON_GAMES)[number];
