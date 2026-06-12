import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

const AUTO_SCROLL_MS = 5200;
const FADE_MS = 1400;

export function useBannerCrossfade(slideCount: number) {
  const indexRef = useRef(0);
  const animatingRef = useRef(false);
  const opacityA = useRef(new Animated.Value(1)).current;
  const opacityB = useRef(new Animated.Value(0)).current;
  const [indexA, setIndexA] = useState(0);
  const [indexB, setIndexB] = useState(0);
  const frontIsARef = useRef(true);

  const runCrossfade = useCallback(() => {
    if (slideCount <= 1 || animatingRef.current) return;

    const next = (indexRef.current + 1) % slideCount;
    animatingRef.current = true;

    if (frontIsARef.current) {
      setIndexB(next);
      Animated.parallel([
        Animated.timing(opacityA, {
          toValue: 0,
          duration: FADE_MS,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacityB, {
          toValue: 1,
          duration: FADE_MS,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        animatingRef.current = false;
        if (!finished) return;
        indexRef.current = next;
        frontIsARef.current = false;
      });
    } else {
      setIndexA(next);
      Animated.parallel([
        Animated.timing(opacityB, {
          toValue: 0,
          duration: FADE_MS,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacityA, {
          toValue: 1,
          duration: FADE_MS,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        animatingRef.current = false;
        if (!finished) return;
        indexRef.current = next;
        frontIsARef.current = true;
      });
    }
  }, [opacityA, opacityB, slideCount]);

  useEffect(() => {
    indexRef.current = 0;
    frontIsARef.current = true;
    setIndexA(0);
    setIndexB(0);
    opacityA.setValue(1);
    opacityB.setValue(0);
  }, [opacityA, opacityB, slideCount]);

  useEffect(() => {
    if (slideCount <= 1) return undefined;
    const timer = setInterval(runCrossfade, AUTO_SCROLL_MS);
    return () => clearInterval(timer);
  }, [runCrossfade, slideCount]);

  return { opacityA, opacityB, indexA, indexB };
}
