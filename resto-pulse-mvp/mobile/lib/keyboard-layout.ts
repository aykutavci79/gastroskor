import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Stack ekranlari (baslikli) icin KeyboardAvoidingView offset. */
export function useStackKeyboardOffset(headerHeight = 44) {
  const insets = useSafeAreaInsets();
  return insets.top + headerHeight;
}

/** Basliksiz tam ekran (restoran detay vb.) */
export function useScreenKeyboardOffset() {
  const insets = useSafeAreaInsets();
  return insets.top + 8;
}
