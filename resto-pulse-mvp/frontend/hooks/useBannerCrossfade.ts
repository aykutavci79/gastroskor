'use client';

import { useEffect, useRef, useState } from 'react';

import { KESFET_VITRIN_AUTO_SCROLL_MS } from '@/lib/kesfet-vitrin-banner';

type LayerState = { index: number; opacity: number };

export function useBannerCrossfade(slideCount: number) {
  const indexRef = useRef(0);
  const frontARef = useRef(true);
  const [layerA, setLayerA] = useState<LayerState>({ index: 0, opacity: 1 });
  const [layerB, setLayerB] = useState<LayerState>({ index: 0, opacity: 0 });
  const [frontLayer, setFrontLayer] = useState<'a' | 'b'>('a');

  useEffect(() => {
    indexRef.current = 0;
    frontARef.current = true;
    setLayerA({ index: 0, opacity: 1 });
    setLayerB({ index: 0, opacity: 0 });
    setFrontLayer('a');
  }, [slideCount]);

  useEffect(() => {
    if (slideCount <= 1) return undefined;

    const timer = window.setInterval(() => {
      const next = (indexRef.current + 1) % slideCount;
      indexRef.current = next;

      if (frontARef.current) {
        setLayerB({ index: next, opacity: 1 });
        setLayerA((prev) => ({ ...prev, opacity: 0 }));
        frontARef.current = false;
        setFrontLayer('b');
      } else {
        setLayerA({ index: next, opacity: 1 });
        setLayerB((prev) => ({ ...prev, opacity: 0 }));
        frontARef.current = true;
        setFrontLayer('a');
      }
    }, KESFET_VITRIN_AUTO_SCROLL_MS);

    return () => window.clearInterval(timer);
  }, [slideCount]);

  const activeIndex = frontLayer === 'a' ? layerA.index : layerB.index;

  return { layerA, layerB, activeIndex };
}
