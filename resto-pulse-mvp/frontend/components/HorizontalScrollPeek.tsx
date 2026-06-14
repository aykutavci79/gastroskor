'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

const DEFAULT_STEP = 272;

type FadeTone = 'page' | 'card';

type Props = {
  children: ReactNode;
  className?: string;
  scrollStep?: number;
  /** Tam genişlik bleed: -mx-4 + iç px-4 */
  edgeBleed?: boolean;
  /** Gradyan rengi — kart içi şeritlerde `card` */
  fadeTone?: FadeTone;
};

const FADE_GRADIENT: Record<FadeTone, { left: string; right: string }> = {
  page: {
    left: 'bg-gradient-to-r from-surface via-surface/80 to-transparent',
    right: 'bg-gradient-to-l from-surface via-surface/80 to-transparent',
  },
  card: {
    left: 'bg-gradient-to-r from-surface-card via-surface-card/80 to-transparent',
    right: 'bg-gradient-to-l from-surface-card via-surface-card/80 to-transparent',
  },
};

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-7 w-7 drop-shadow-[0_1px_3px_rgba(0,0,0,0.55)]"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round">
      {direction === 'left' ? <path d="M15 6l-6 6 6 6" /> : <path d="M9 6l6 6-6 6" />}
    </svg>
  );
}

export function HorizontalScrollPeek({
  children,
  className = '',
  scrollStep = DEFAULT_STEP,
  edgeBleed = false,
  fadeTone = 'page',
}: Props) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const refreshEdges = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    refreshEdges();
    el.addEventListener('scroll', refreshEdges, { passive: true });
    const ro = new ResizeObserver(refreshEdges);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', refreshEdges);
      ro.disconnect();
    };
  }, [refreshEdges, children]);

  function scrollBy(delta: number) {
    stripRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  }

  const fade = FADE_GRADIENT[fadeTone];

  return (
    <div className={`relative ${edgeBleed ? '-mx-4' : ''}`}>
      {canPrev ? (
        <>
          <div className={`pointer-events-none absolute inset-y-0 left-0 z-[1] w-14 ${fade.left}`} />
          <button
            type="button"
            aria-label="Önceki öğeler"
            className="absolute left-0 top-0 z-[2] flex h-full w-12 items-center justify-center text-content/90 transition hover:text-brand-gold"
            onClick={() => scrollBy(-scrollStep)}>
            <ChevronIcon direction="left" />
          </button>
        </>
      ) : null}
      {canNext ? (
        <>
          <div className={`pointer-events-none absolute inset-y-0 right-0 z-[1] w-16 ${fade.right}`} />
          <button
            type="button"
            aria-label="Daha fazlası için kaydır"
            className="absolute right-0 top-0 z-[2] flex h-full w-12 items-center justify-center text-content/90 transition hover:text-brand-gold"
            onClick={() => scrollBy(scrollStep)}>
            <ChevronIcon direction="right" />
          </button>
        </>
      ) : null}
      <div
        ref={stripRef}
        className={`scroll-smooth snap-x snap-mandatory overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${edgeBleed ? 'px-4' : ''} ${className}`.trim()}>
        {children}
      </div>
    </div>
  );
}
