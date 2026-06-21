import { AppState, type AppStateStatus } from 'react-native';

let testStateOverride: AppStateStatus | null | undefined;

/** Testler icin AppState.currentState yerine kullanilir. */
export function __setAppStateOverrideForTests(state: AppStateStatus | null | undefined): void {
  testStateOverride = state;
}

export function isAppForeground(state?: AppStateStatus | null): boolean {
  const resolved =
    state !== undefined
      ? state
      : testStateOverride !== undefined
        ? testStateOverride
        : AppState.currentState;
  return resolved === 'active';
}

export function currentAppState(): AppStateStatus {
  if (testStateOverride !== undefined && testStateOverride !== null) {
    return testStateOverride;
  }
  return AppState.currentState;
}
