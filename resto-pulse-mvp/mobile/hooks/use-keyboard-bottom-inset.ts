import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/** Klavye acikken alt bar / sheet icin guvenli bosluk (px). */
export function useKeyboardBottomInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setInset(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setInset(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return inset;
}
