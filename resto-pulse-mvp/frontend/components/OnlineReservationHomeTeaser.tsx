'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const SLIDES = [
  {
    file: 'online-reservation-01-chandelier-fireplace.webp',
    label: 'Şömineli salon',
  },
  {
    file: 'online-reservation-02-candlelit-private.webp',
    label: 'Mum ışığı',
  },
  {
    file: 'online-reservation-03-grand-hall.webp',
    label: 'Avlu salon',
  },
  {
    file: 'online-reservation-04-terrace-dusk.webp',
    label: 'Teras akşam',
  },
  {
    file: 'online-reservation-05-booth-fireplace.webp',
    label: 'Lüks köşe',
  },
] as const;

export function OnlineReservationHomeTeaser() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % SLIDES.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, []);

  const slide = SLIDES[index];

  return (
    <Link
      href="/panel"
      className="group relative block overflow-hidden rounded-2xl border border-violet-500/40 bg-[#141414] shadow-lg transition hover:opacity-95">
      <div className="relative aspect-[16/7] min-h-[120px] w-full sm:aspect-[16/6]">
        <Image
          src={`/images/online-reservation/${slide.file}`}
          alt={slide.label}
          fill
          className="object-cover transition-opacity duration-[1400ms]"
          sizes="(max-width: 768px) 100vw, 720px"
          priority={index === 0}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-black/45" />
        <span className="absolute bottom-3 right-3 rounded-md border border-violet-400/40 bg-black/60 px-2 py-1 text-[10px] font-extrabold text-white">
          {slide.label}
        </span>
      </div>
      <div className="absolute inset-0 flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <div className="space-y-1">
          <span className="inline-block rounded-md bg-violet-900/90 px-2.5 py-1 text-[11px] font-black text-white">
            Online Rezervasyon
          </span>
          <p className="text-lg font-extrabold text-white drop-shadow-md sm:text-xl">
            Tek Tıkla <span className="text-amber-400">Masa</span>
          </p>
          <p className="text-xs font-bold text-white/90 drop-shadow-md">
            Masa seç · çift onay · panelden yönet
          </p>
        </div>
        <span className="hidden rounded-full border border-amber-400/50 bg-black/40 px-3 py-2 text-xs font-bold text-amber-300 sm:inline">
          Yakında mobilde
        </span>
      </div>
    </Link>
  );
}
