import { StyleSheet, Text, View } from 'react-native';

import { RIFKI_TILE_EMOJI, RIFKI_WOOD } from '@/constants/rifki';
import type { TileColor } from '@/lib/rifki/matchEngine';

type TargetMatch = { color: TileColor; count: number };

type RifkiHeaderProps = {
  score: number;
  movesLeft: number;
  level: number;
  levelName: string;
  targetScore: number;
  targetMatches?: TargetMatch[];
  matchedColors: Partial<Record<TileColor, number>>;
  textColor: string;
  mutedColor: string;
  accentColor: string;
};

export function RifkiHeader({
  score,
  movesLeft,
  level,
  levelName,
  targetScore,
  targetMatches,
  matchedColors,
  textColor,
  mutedColor,
  accentColor,
}: RifkiHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.plankRow}>
        <View style={styles.levelBlock}>
          <Text style={[styles.label, { color: mutedColor }]}>Level {level}</Text>
          <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
            {levelName}
          </Text>
        </View>
        <View style={styles.statPill}>
          <Text style={[styles.statLabel, { color: mutedColor }]}>Skor</Text>
          <Text style={[styles.statValue, { color: accentColor }]}>
            {score}/{targetScore}
          </Text>
        </View>
        <View style={styles.statPill}>
          <Text style={[styles.statLabel, { color: mutedColor }]}>Hamle</Text>
          <Text style={[styles.statValue, { color: textColor }]}>{movesLeft}</Text>
        </View>
      </View>

      {targetMatches?.length ? (
        <View style={styles.targetsRow}>
          {targetMatches.map((target) => {
            const done = (matchedColors[target.color] ?? 0) >= target.count;
            return (
              <View
                key={`${target.color}-${target.count}`}
                style={[styles.targetChip, done ? styles.targetChipDone : null]}>
                <Text style={styles.chipEmoji}>{RIFKI_TILE_EMOJI[target.color]}</Text>
                <Text style={[styles.chipText, { color: done ? '#4ADE80' : textColor }]}>
                  {matchedColors[target.color] ?? 0}/{target.count}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  plankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: RIFKI_WOOD.frame,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: RIFKI_WOOD.plankDark,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  levelBlock: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 1,
  },
  statPill: {
    alignItems: 'center',
    backgroundColor: RIFKI_WOOD.tunnelInner,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: RIFKI_WOOD.plankDark,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 1,
  },
  targetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  targetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: RIFKI_WOOD.plankDark,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: RIFKI_WOOD.tunnel,
  },
  targetChipDone: {
    backgroundColor: 'rgba(74,222,128,0.12)',
    borderColor: 'rgba(74,222,128,0.45)',
  },
  chipEmoji: {
    fontSize: 14,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
