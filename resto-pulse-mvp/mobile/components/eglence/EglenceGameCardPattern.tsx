import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { EglenceGameId } from '@/constants/eglence-games';

type Props = {
  gameId: EglenceGameId;
};

export type EglenceBannerTheme = {
  borderColor: string;
  titleColor: string;
  subtitleColor: string;
  statusColor: string;
  statusMutedColor: string;
  iconBg: string;
  iconBorder: string;
  iconColor: string;
};

const SUDOKU_WHITE = '#FFFFFF';
const SUDOKU_BLUE = '#DCEEFB';
const SUDOKU_LINE = '#1E4D78';
const SUDOKU_DIGIT = '#1A1A1A';

const FLOATING_WORDS = [
  { word: 'LEZZET', top: '8%', left: '52%', rotate: '-12deg', size: 13, opacity: 0.55 },
  { word: 'TUZ', top: '22%', left: '68%', rotate: '8deg', size: 11, opacity: 0.45 },
  { word: 'ÇORBA', top: '58%', left: '58%', rotate: '-6deg', size: 12, opacity: 0.5 },
  { word: 'BAHARAT', top: '70%', left: '72%', rotate: '14deg', size: 10, opacity: 0.4 },
  { word: 'SOTE', top: '12%', left: '78%', rotate: '-18deg', size: 11, opacity: 0.42 },
  { word: 'KÖFTE', top: '42%', left: '82%', rotate: '5deg', size: 12, opacity: 0.48 },
  { word: 'PİLAV', top: '78%', left: '48%', rotate: '-9deg', size: 11, opacity: 0.38 },
  { word: 'ZERDE', top: '30%', left: '88%', rotate: '11deg', size: 10, opacity: 0.35 },
] as const;

const QUIZ_FLOATS = [
  { label: '?', top: '10%', left: '55%', rotate: '-10deg', size: 22, opacity: 0.35 },
  { label: 'A', top: '28%', left: '72%', rotate: '6deg', size: 14, opacity: 0.4 },
  { label: 'B', top: '48%', left: '62%', rotate: '-4deg', size: 14, opacity: 0.38 },
  { label: 'C', top: '62%', left: '80%', rotate: '12deg', size: 14, opacity: 0.36 },
  { label: '?', top: '72%', left: '54%', rotate: '8deg', size: 18, opacity: 0.3 },
  { label: '!', top: '18%', left: '84%', rotate: '-14deg', size: 16, opacity: 0.32 },
] as const;

export function eglenceBannerTheme(gameId: EglenceGameId): EglenceBannerTheme {
  switch (gameId) {
    case 'mini-sudoku':
      return {
        borderColor: '#A8CCE8',
        titleColor: '#0F2D4A',
        subtitleColor: '#3D5F7A',
        statusColor: '#1E6BB8',
        statusMutedColor: '#5C7A94',
        iconBg: 'rgba(255,255,255,0.88)',
        iconBorder: '#A8CCE8',
        iconColor: '#1E6BB8',
      };
    case 'kelime-yarismasi':
      return {
        borderColor: '#FFD4A8',
        titleColor: '#5C2E00',
        subtitleColor: '#8A5528',
        statusColor: '#E55A25',
        statusMutedColor: '#A06840',
        iconBg: 'rgba(255,255,255,0.9)',
        iconBorder: '#FFC98A',
        iconColor: '#FF6B35',
      };
    case 'soru-cevap':
      return {
        borderColor: '#A8C8F0',
        titleColor: '#1A3A6E',
        subtitleColor: '#4A6288',
        statusColor: '#2B6FD6',
        statusMutedColor: '#5A7299',
        iconBg: 'rgba(255,255,255,0.9)',
        iconBorder: '#A8C8F0',
        iconColor: '#4285F4',
      };
    case 'kelime-sofrasi':
      return {
        borderColor: '#A8E0C0',
        titleColor: '#1A4D32',
        subtitleColor: '#3D7358',
        statusColor: '#2E7D32',
        statusMutedColor: '#5A8A6E',
        iconBg: 'rgba(255,255,255,0.9)',
        iconBorder: '#A8E0C0',
        iconColor: '#4CAF79',
      };
  }
}

function MiniSudokuBanner() {
  const floats = [
    { digit: '7', top: '8%', left: '54%', rotate: '-12deg', size: 16, opacity: 0.42 },
    { digit: '3', top: '22%', left: '70%', rotate: '9deg', size: 14, opacity: 0.38 },
    { digit: '5', top: '42%', left: '82%', rotate: '-5deg', size: 15, opacity: 0.4 },
    { digit: '1', top: '58%', left: '60%', rotate: '7deg', size: 13, opacity: 0.36 },
    { digit: '6', top: '72%', left: '76%', rotate: '-8deg', size: 14, opacity: 0.34 },
    { digit: '4', top: '18%', left: '86%', rotate: '11deg', size: 12, opacity: 0.32 },
  ] as const;

  const cell = 9;
  const size = 6;
  const givens: Record<string, string> = {
    '0,2': '4',
    '1,4': '2',
    '2,0': '5',
    '2,5': '1',
    '3,3': '6',
    '4,1': '3',
    '5,4': '2',
  };

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#E8F4FC' }]}>
      {floats.map((item) => (
        <Text
          key={`${item.digit}-${item.top}`}
          style={{
            position: 'absolute',
            top: item.top,
            left: item.left,
            fontSize: item.size,
            fontWeight: '800',
            color: '#2B6FD6',
            opacity: item.opacity,
            transform: [{ rotate: item.rotate }],
          }}>
          {item.digit}
        </Text>
      ))}
      <View
        style={{
          position: 'absolute',
          top: '18%',
          left: '58%',
          transform: [{ rotate: '-5deg' }],
          opacity: 0.82,
          borderWidth: 1.5,
          borderColor: SUDOKU_LINE,
          borderRadius: 3,
          overflow: 'hidden',
        }}>
        {Array.from({ length: size }, (_, row) => (
          <View key={row} style={{ flexDirection: 'row' }}>
            {Array.from({ length: size }, (_, col) => {
              const blockRow = Math.floor(row / 2);
              const blockCol = Math.floor(col / 3);
              const checker = (blockRow + blockCol) % 2 === 0;
              const digit = givens[`${row},${col}`];
              const thick = 1.25;
              const thin = 0.5;
              return (
                <View
                  key={col}
                  style={{
                    width: cell,
                    height: cell,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: checker ? SUDOKU_WHITE : SUDOKU_BLUE,
                    borderRightWidth: col === size - 1 ? 0 : col % 3 === 2 ? thick : thin,
                    borderBottomWidth: row === size - 1 ? 0 : row % 2 === 1 ? thick : thin,
                    borderColor: 'rgba(30, 77, 120, 0.45)',
                  }}>
                  {digit ? (
                    <Text style={{ fontSize: 7, fontWeight: '700', color: SUDOKU_DIGIT }}>{digit}</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}
      </View>
      {[1, 2, 3, 4, 5, 6].map((n, i) => (
        <View
          key={`cell-${n}`}
          style={{
            position: 'absolute',
            top: `${28 + (i % 3) * 14}%`,
            left: `${78 + Math.floor(i / 3) * 10}%`,
            width: 22,
            height: 26,
            borderRadius: 5,
            borderWidth: 1.5,
            borderColor: 'rgba(66, 133, 244, 0.45)',
            backgroundColor: 'rgba(255,255,255,0.78)',
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ rotate: `${-6 + i * 3}deg` }],
            opacity: 0.65,
          }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E6BB8' }}>{n}</Text>
        </View>
      ))}
    </View>
  );
}

function KelimeYarismasiBanner() {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFF6EB' }]}>
      {FLOATING_WORDS.map((item) => (
        <Text
          key={item.word}
          style={{
            position: 'absolute',
            top: item.top,
            left: item.left,
            fontSize: item.size,
            fontWeight: '800',
            color: '#FF8C42',
            opacity: item.opacity,
            transform: [{ rotate: item.rotate }],
            letterSpacing: 0.5,
          }}>
          {item.word}
        </Text>
      ))}
      {['K', 'E', 'L', 'İ', 'M', 'E'].map((ch, i) => (
        <View
          key={`box-${ch}-${i}`}
          style={{
            position: 'absolute',
            top: `${20 + i * 9}%`,
            left: `${60 + (i % 3) * 8}%`,
            width: 26,
            height: 32,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: '#FFB703',
            backgroundColor: 'rgba(255,255,255,0.75)',
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ rotate: `${-8 + i * 4}deg` }],
            opacity: 0.7,
          }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#E55A25' }}>{ch}</Text>
        </View>
      ))}
    </View>
  );
}

function SoruCevapBanner() {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#EFF6FF' }]}>
      {QUIZ_FLOATS.map((item, i) => (
        <View
          key={`${item.label}-${i}`}
          style={{
            position: 'absolute',
            top: item.top,
            left: item.left,
            width: item.size + 18,
            height: item.size + 14,
            borderRadius: item.label === '?' ? 14 : 8,
            backgroundColor: 'rgba(255,255,255,0.65)',
            borderWidth: 1.5,
            borderColor: 'rgba(66, 133, 244, 0.35)',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: item.opacity + 0.25,
            transform: [{ rotate: item.rotate }],
          }}>
          <Text
            style={{
              fontSize: item.size,
              fontWeight: '800',
              color: item.label === '?' ? '#4285F4' : '#2B6FD6',
            }}>
            {item.label}
          </Text>
        </View>
      ))}
      <View
        style={{
          position: 'absolute',
          top: '38%',
          left: '68%',
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 14,
          borderBottomLeftRadius: 3,
          backgroundColor: 'rgba(255,107,53,0.18)',
          borderWidth: 1,
          borderColor: 'rgba(255,107,53,0.35)',
          transform: [{ rotate: '4deg' }],
          opacity: 0.75,
        }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#C44A1A' }}>Gurme</Text>
      </View>
    </View>
  );
}

function KelimeSofrasiBanner() {
  const wheel = [
    { ch: 'A', top: '12%', left: '62%' },
    { ch: 'R', top: '24%', left: '78%' },
    { ch: 'Z', top: '48%', left: '80%' },
    { ch: 'İ', top: '68%', left: '66%' },
    { ch: 'K', top: '58%', left: '52%' },
    { ch: 'E', top: '32%', left: '54%' },
  ];
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#F0FFF6' }]}>
      {wheel.map((item) => (
        <View
          key={item.ch}
          style={{
            position: 'absolute',
            top: item.top,
            left: item.left,
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: 'rgba(255,255,255,0.8)',
            borderWidth: 2,
            borderColor: '#7DCEA0',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.85,
          }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#2E7D32' }}>{item.ch}</Text>
        </View>
      ))}
      <View
        style={{
          position: 'absolute',
          top: '38%',
          left: '64%',
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: '#FF6B35',
          borderWidth: 2,
          borderColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.9,
        }}>
        <Text style={{ fontSize: 15, fontWeight: '900', color: '#FFFFFF' }}>Y</Text>
      </View>
    </View>
  );
}

function PatternBody({ gameId }: Props) {
  switch (gameId) {
    case 'mini-sudoku':
      return <MiniSudokuBanner />;
    case 'kelime-yarismasi':
      return <KelimeYarismasiBanner />;
    case 'soru-cevap':
      return <SoruCevapBanner />;
    case 'kelime-sofrasi':
      return <KelimeSofrasiBanner />;
  }
}

export function EglenceGameCardPattern({ gameId }: Props) {
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          ...StyleSheet.absoluteFillObject,
          overflow: 'hidden',
        },
        textVeil: {
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '56%',
          backgroundColor: 'rgba(255,255,255,0.5)',
        },
      }),
    [],
  );

  return (
    <View style={styles.wrap} pointerEvents="none">
      <PatternBody gameId={gameId} />
      <View style={styles.textVeil} />
    </View>
  );
}
