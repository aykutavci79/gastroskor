import { Stack } from 'expo-router';

import { EglenceHubBackButton } from '@/components/eglence/EglenceHubBackButton';
import { eglenceLobbyTheme } from '@/constants/eglence-card-art-theme';
import type { EglenceGameId } from '@/constants/eglence-games';

type GameStackConfig = {
  gameId: EglenceGameId;
  lobbyTitle: string;
  playTitle: string;
};

const CONFIG: Record<
  'kelime-sofrasi' | 'kelime-yarismasi' | 'mini-sudoku' | 'gunluk-kelime',
  GameStackConfig
> = {
  'kelime-sofrasi': {
    gameId: 'kelime-sofrasi',
    lobbyTitle: 'Kelime Sofrası',
    playTitle: 'Sofra',
  },
  'kelime-yarismasi': {
    gameId: 'kelime-yarismasi',
    lobbyTitle: 'Kelime Yarışması',
    playTitle: 'Oyun',
  },
  'mini-sudoku': {
    gameId: 'mini-sudoku',
    lobbyTitle: 'Sudoku',
    playTitle: 'Sudoku',
  },
  'gunluk-kelime': {
    gameId: 'gunluk-kelime',
    lobbyTitle: 'Günlük Kelime',
    playTitle: 'Kelime',
  },
};

export function EglenceGameStackLayout({ gameKey }: { gameKey: keyof typeof CONFIG }) {
  const { gameId, lobbyTitle, playTitle } = CONFIG[gameKey];
  const t = eglenceLobbyTheme(gameId);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: t.headerBg },
        headerTintColor: t.text,
        headerTitleStyle: { fontWeight: '800' },
        contentStyle: { backgroundColor: t.bg },
        headerBackTitle: lobbyTitle,
      }}>
      <Stack.Screen
        name="index"
        options={{
          title: lobbyTitle,
          headerTitle: '',
          headerBackVisible: false,
          headerLeft: () => <EglenceHubBackButton color={t.text} />,
        }}
      />
      <Stack.Screen
        name="oyun"
        options={{
          title: playTitle,
          headerBackTitle: lobbyTitle,
        }}
      />
      {gameKey === 'kelime-yarismasi' ? (
        <Stack.Screen name="sonuc" options={{ title: 'Sonuç', headerBackVisible: false }} />
      ) : null}
    </Stack>
  );
}
