import { useCallback, useEffect, useRef } from 'react';
import { Keyboard, Platform, type ScrollView } from 'react-native';

/** Odaklanan alan klavyenin ustunde kalsin diye ilk kaydirma payi. */
const FIELD_VISIBLE_GAP = 120;

export type KeyboardFieldFocusOptions = {
  extraGap?: number;
  /** Scroll iceriginde form/blog alt siniri — klavye acilinca bundan fazla yukari kaydirma. */
  capBottomY?: number;
};

type ScrollRef = React.RefObject<ScrollView | null>;

function clampScrollY(rawY: number, capBottomY: number | null | undefined): number {
  const y = Math.max(0, rawY);
  if (capBottomY == null || capBottomY <= 0) return y;
  return Math.min(y, Math.max(0, capBottomY - 48));
}

/**
 * ScrollView icindeki TextInput odaklaninca icerigi klavyenin ustune kaydirir.
 * contentOffsetY = ScrollView icerigindeki alanin Y konumu (onLayout ile).
 */
export function useKeyboardFieldFocus(scrollRef: ScrollRef) {
  const focusYRef = useRef(0);
  const capBottomYRef = useRef<number | null>(null);

  const onFieldFocus = useCallback(
    (contentOffsetY: number, options?: KeyboardFieldFocusOptions | number) => {
      const opts: KeyboardFieldFocusOptions =
        typeof options === 'number' ? { extraGap: options } : (options ?? {});
      const extraGap = opts.extraGap ?? FIELD_VISIBLE_GAP;
      focusYRef.current = contentOffsetY;
      capBottomYRef.current = opts.capBottomY ?? null;
      const y = clampScrollY(contentOffsetY - extraGap, capBottomYRef.current);
      scrollRef.current?.scrollTo({ y, animated: true });
    },
    [scrollRef],
  );

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      if (focusYRef.current <= 0) return;
      const keyboardHeight = event.endCoordinates.height;
      const raw = focusYRef.current - keyboardHeight + FIELD_VISIBLE_GAP;
      const y = clampScrollY(raw, capBottomYRef.current);
      scrollRef.current?.scrollTo({ y, animated: true });
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      focusYRef.current = 0;
      capBottomYRef.current = null;
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollRef]);

  return onFieldFocus;
}
