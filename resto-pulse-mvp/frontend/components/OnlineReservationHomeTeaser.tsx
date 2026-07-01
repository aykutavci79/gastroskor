'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const SLIDE_FILES = [
  'online-reservation-01-chandelier-fireplace.webp',
  'online-reservation-02-candlelit-private.webp',
  'online-reservation-03-grand-hall.webp',
  'online-reservation-04-terrace-dusk.webp',
  'online-reservation-05-booth-fireplace.webp',
] as const;

export function OnlineReservationHomeTeaser() {
  const t = useTranslations('vitrinBanners');
  const [index, setIndex] = useState(0);

  const slideLabels = [
    t('slideLabel0'),
    t('slideLabel1'),
    t('slideLabel2'),
    t('slideLabel3'),
    t('slideLabel4'),
  ] as const;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % SLIDE_FILES.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, []);

  const file = SLIDE_FILES[index];
  const label = slideLabels[index];

  return (
    <Link
      href="/panel"
      className="group relative block overflow-hidden rounded-2xl border border-violet-500/40 bg-[#141414] shadow-lg transition hover:opacity-95">
      <div className="relative aspect-[16/7] min-h-[120px] w-full sm:aspect-[16/6]">
        <Image
          src={`/images/online-reservation/${file}`}
          alt={label}
          fill
          className="object-cover transition-opacity duration-[1400ms]"
          sizes="(max-width: 768px) 100vw, 720px"
          priority={index === 0}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-black/45" />
        <span className="absolute bottom-3 right-3 rounded-md border border-violet-400/40 bg-black/60 px-2 py-1 text-[10px] font-extrabold text-white">
          {label}
        </span>
      </div>
      <div className="absolute inset-0 flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <div className="space-y-1">
          <span className="inline-block rounded-md bg-violet-900/90 px-2.5 py-1 text-[11px] font-black text-white">
            {t('onlineRezarvasyon')}
          </span>
          <p className="text-lg font-extrabold text-white drop-shadow-md sm:text-xl">
            {t('titlePre')} <span className="text-amber-400">{t('reservationAccent')}</span>
          </p>
          <p className="text-xs font-bold text-white/90 drop-shadow-md">
            {t('reservationSubtitle')}
          </p>
        </div>
        <span className="hidden rounded-full border border-amber-400/50 bg-black/40 px-3 py-2 text-xs font-bold text-amber-300 sm:inline">
          {t('comingSoonMobile')}
        </span>
      </div>
    </Link>
  );
}
