import { ReactNode, RefObject } from 'react';
import { ScrollView, ViewStyle } from 'react-native';
import { type Edge } from 'react-native-safe-area-context';

import { EglenceGameLobbyScreen } from '@/components/eglence/EglenceGameLobbyScreen';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  edges?: Edge[];
  scrollRef?: RefObject<ScrollView | null>;
};

/** @deprecated Sudoku lobisi — `EglenceGameLobbyScreen gameId="mini-sudoku"` kullan. */
export function SudokuScreen({ children, scroll = true, style, edges, scrollRef }: Props) {
  return (
    <EglenceGameLobbyScreen gameId="mini-sudoku" scroll={scroll} style={style} edges={edges} scrollRef={scrollRef}>
      {children}
    </EglenceGameLobbyScreen>
  );
}
