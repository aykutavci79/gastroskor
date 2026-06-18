import { useCallback, useEffect, useRef } from 'react';
import { Keyboard, Platform, type ScrollView } from 'react-native';

/** Odaklanan alan klavyenin ustunde kalsin diye ilk kaydirma payi. */
const FIELD_VISIBLE_GAP = 120;

type ScrollRef = React.RefObject<ScrollView | null>;

/**
 * ScrollView icindeki TextInput odaklaninca icerigi klavyenin ustune kaydirir.
 * contentOffsetY = ScrollView icerigindeki alanin Y konumu (onLayout ile).
 */
export function useKeyboardFieldFocus(scrollRef: ScrollRef) {
  const focusYRef = useRef(0);

  const onFieldFocus = useCallback(
    (contentOffsetY: number, extraGap = FIELD_VISIBLE_GAP) => {
      focusYRef.current = contentOffsetY;
      scrollRef.current?.scrollTo({
        y: Math.max(0, contentOffsetY - extraGap),
        animated: true,
      });
    },
    [scrollRef],
  );

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      if (focusYRef.current <= 0) return;
      const keyboardHeight = event.endCoordinates.height;
      scrollRef.current?.scrollTo({
        y: Math.max(0, focusYRef.current - keyboardHeight + FIELD_VISIBLE_GAP),
        animated: true,
      });
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      focusYRef.current = 0;
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollRef]);

  return onFieldFocus;
}
