'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { useBannerCrossfade } from '@/hooks/useBannerCrossfade';
import { listRegionalProducts } from '@/lib/api';
import {
  KESFET_VITRIN_BANNER,
  KESFET_VITRIN_FADE_MS,
  KESFET_VITRIN_TEXT_SHADOW,
} from '@/lib/kesfet-vitrin-banner';
import { ONLINE_ORDER_BANNER_SLIDES } from '@/lib/kitchen-category-images';
import {
  ONLINE_RESERVATION_BANNER_SLIDES,
  onlineReservationBannerSrc,
} from '@/lib/online-reservation-banner-slides';
import { regionalProductImageSrc } from '@/lib/regional-product-image';
import { cityDisplayName } from '@/lib/turkiye-provinces';
import type { RegionalProductItem } from '@/lib/types';


type BannerShellProps = {
  href?: string;
  borderClassName: string;
  pillClassName: string;
  pillLabel: string;
  title: ReactNode;
  hint?: string;
  icon: ReactNode;
  slides: { src: string; alt: string }[];
  slideTags?: string[];
  slideTagBorderClassName?: string;
  fallback?: ReactNode;
};

function BannerIconCircle({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-amber-400/55 bg-[rgba(14,14,14,0.45)] text-brand-gold md:h-14 md:w-14">
      {children}
    </span>
  );
}

function GoldAccent({ children }: { children: ReactNode }) {
  return <span className="font-black text-brand-gold">{children}</span>;
}

function BagIcon() {
  return (
    <svg width={KESFET_VITRIN_BANNER.iconSize} height={KESFET_VITRIN_BANNER.iconSize} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 8V7a4 4 0 1 1 8 0v1M6 8h12l-1.2 12H7.2L6 8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width={KESFET_VITRIN_BANNER.iconSize} height={KESFET_VITRIN_BANNER.iconSize} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 4V2M17 4V2M4 9h16M6 6h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RibbonIcon() {
  return (
    <svg width={KESFET_VITRIN_BANNER.iconSize} height={KESFET_VITRIN_BANNER.iconSize} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 21 12 17l4 4V5a2 2 0 0 0-2-2H10a2 2 0 0 0-2 2v16Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function KesfetVitrinBannerShell({
  href,
  borderClassName,
  pillClassName,
  pillLabel,
  title,
  hint,
  icon,
  slides,
  slideTags,
  slideTagBorderClassName,
  fallback,
}: BannerShellProps) {
  const { layerA, layerB, activeIndex } = useBannerCrossfade(slides.length);
  const slideA = slides[layerA.index];
  const slideB = slides[layerB.index];
  const slideTag = slideTags?.[activeIndex];
  const fadeStyle = { transition: `opacity ${KESFET_VITRIN_FADE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)` };
  const textShadow = { textShadow: KESFET_VITRIN_TEXT_SHADOW };
  const interactive = Boolean(href);

  const body = (
    <>
      <div className="absolute inset-0">
        {slideA ? (
          <Image
            src={slideA.src}
            alt={slideA.alt}
            fill
            className="object-cover"
            style={{ ...fadeStyle, opacity: layerA.opacity }}
            sizes="(max-width: 1024px) 100vw, 33vw"
          />
        ) : (
          fallback
        )}
        {slideB && slides.length > 1 ? (
          <Image
            src={slideB.src}
            alt={slideB.alt}
            fill
            className="object-cover"
            style={{ ...fadeStyle, opacity: layerB.opacity }}
            sizes="(max-width: 1024px) 100vw, 33vw"
          />
        ) : null}
        {slideTag ? (
          <span
            className={`absolute bottom-2 right-2 z-[2] max-w-[52%] truncate rounded-md border bg-black/60 px-2 py-1 text-[11px] font-extrabold text-white ${slideTagBorderClassName ?? ''}`}
            style={textShadow}>
            {slideTag}
          </span>
        ) : null}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/55 via-black/15 to-black/35" />
      </div>

      <div className="relative z-[1] flex min-h-[58px] items-center justify-between gap-2 px-[11px] py-2 md:min-h-[96px] md:px-4 md:py-3 lg:min-h-[132px] lg:px-5">
        <div className="min-w-0 flex-1 space-y-[3px]">
          <span
            className={`inline-block rounded-md px-2.5 py-1 text-[18px] font-black tracking-wide text-white md:text-[19px] ${pillClassName}`}>
            {pillLabel}
          </span>
          <p className="text-[18px] font-extrabold text-white md:text-[20px]" style={textShadow}>
            {title}
          </p>
          {hint ? (
            <p className="text-[14px] font-bold text-white/90 md:text-[15px]" style={textShadow}>
              {hint}
            </p>
          ) : null}
        </div>
        {icon}
      </div>
    </>
  );

  const className = `relative block min-h-[58px] overflow-hidden rounded-[11px] bg-[#141414] md:min-h-[96px] lg:min-h-[132px] ${borderClassName} ${
    interactive ? 'transition hover:opacity-95' : 'cursor-default'
  }`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}

function buildRegionalSlides(items: RegionalProductItem[]) {
  const slides: { src: string; alt: string; name: string }[] = [];
  for (const row of items) {
    if (!row.image_url) continue;
    slides.push({
      src: regionalProductImageSrc(row.image_url),
      alt: row.name,
      name: row.name,
    });
  }
  return slides;
}

type Props = {
  city: string;
};

export function HomeVitrinBanners({ city }: Props) {
  const t = useTranslations('vitrinBanners');
  const cityLabel = cityDisplayName(city);
  const [count, setCount] = useState<number | null>(null);
  const [regionalSlides, setRegionalSlides] = useState<{ src: string; alt: string; name: string }[]>([]);

  useEffect(() => {
    void listRegionalProducts({ city: cityLabel })
      .then((data) => {
        setCount(data.items.length);
        setRegionalSlides(buildRegionalSlides(data.items));
      })
      .catch(() => {
        setCount(0);
        setRegionalSlides([]);
      });
  }, [cityLabel]);

  const orderSlides = useMemo(
    () => ONLINE_ORDER_BANNER_SLIDES.map((row) => ({ src: row.src, alt: row.slug })),
    [],
  );

  const reservationSlides = useMemo(
    () =>
      ONLINE_RESERVATION_BANNER_SLIDES.map((row) => ({
        src: onlineReservationBannerSrc(row.file),
        alt: row.label,
      })),
    [],
  );
  const reservationTags = useMemo(() => ONLINE_RESERVATION_BANNER_SLIDES.map((row) => row.label), []);

  const regionalHint =
    count == null
      ? t('regionalLoading', { city: cityLabel })
      : count === 0
        ? t('regionalNone', { city: cityLabel })
        : t('regionalCount', { city: cityLabel, count });

  const yoreselSlides = useMemo(
    () => regionalSlides.map((row) => ({ src: row.src, alt: row.alt })),
    [regionalSlides],
  );
  const yoreselTags = useMemo(() => regionalSlides.map((row) => row.name), [regionalSlides]);
  const yoreselHref = `/yoresel-lezzetler?city=${encodeURIComponent(cityLabel)}`;

  return (
    <div className="flex flex-col gap-[3px] pt-[3px] lg:grid lg:grid-cols-3 lg:gap-3 lg:pt-0">
      <KesfetVitrinBannerShell
        borderClassName="border border-[rgba(255,107,53,0.5)]"
        pillClassName="bg-[rgba(255,107,53,0.94)]"
        pillLabel={t('onlineSiparis')}
        title={
          <>
            {t('titlePre')} <GoldAccent>{t('orderAccent')}</GoldAccent>
          </>
        }
        hint={t('mobileOnly')}
        icon={
          <BannerIconCircle>
            <BagIcon />
          </BannerIconCircle>
        }
        slides={orderSlides}
      />
      <KesfetVitrinBannerShell
        borderClassName="border border-violet-400/50"
        pillClassName="bg-violet-900/90"
        pillLabel={t('onlineRezarvasyon')}
        title={
          <>
            {t('titlePre')} <GoldAccent>{t('reservationAccent')}</GoldAccent>
          </>
        }
        hint={t('mobileOnly')}
        icon={
          <BannerIconCircle>
            <CalendarIcon />
          </BannerIconCircle>
        }
        slides={reservationSlides}
        slideTags={reservationTags}
        slideTagBorderClassName="border-violet-400/45"
      />
      <KesfetVitrinBannerShell
        href={yoreselHref}
        borderClassName="border border-amber-500/45"
        pillClassName="bg-[rgba(180,83,9,0.92)]"
        pillLabel={t('yoreselLezzetler')}
        title={
          <>
            {t('titlePre')} <GoldAccent>{t('yoreselAccent')}</GoldAccent>
          </>
        }
        hint={regionalHint}
        icon={
          <BannerIconCircle>
            <RibbonIcon />
          </BannerIconCircle>
        }
        slides={yoreselSlides}
        slideTags={yoreselTags}
        slideTagBorderClassName="border-amber-500/45"
        fallback={
          <div className="absolute inset-0 flex items-center justify-center bg-[#2a2018] text-3xl opacity-55">
            🏺
          </div>
        }
      />
    </div>
  );
}
