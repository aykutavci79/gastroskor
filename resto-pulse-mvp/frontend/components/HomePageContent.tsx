'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { CityAtmosphereStrip } from '@/components/CityAtmosphereStrip';
import { FoodCastHomeSection } from '@/components/FoodCastHomeSection';
import { HomeVitrinBanners } from '@/components/HomeVitrinBanners';
import { LivePlaceSearch } from '@/components/LivePlaceSearch';
import { NewMemberRestaurants } from '@/components/NewMemberRestaurants';
import { RegionalFlavorTeaser } from '@/components/RegionalFlavorTeaser';
import { useDetectedCity } from '@/hooks/useDetectedCity';
import { citySearchHeading } from '@/lib/detect-city';

export function HomePageContent() {
  const t = useTranslations('home');
  const pathname = usePathname();
  const prevPathRef = useRef(pathname);
  const { city, setCity, status, coords, refreshFromLocation } = useDetectedCity();

  useEffect(() => {
    if (pathname === '/' && prevPathRef.current !== '/') {
      refreshFromLocation();
    }
    prevPathRef.current = pathname;
  }, [pathname, refreshFromLocation]);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-extrabold text-content sm:text-xl">{t('searchTitle')}</h2>
      <div className="flex flex-col gap-2">
        <LivePlaceSearch
          city={city}
          cityStatus={status}
          userCoords={coords}
          embedded
          heading={citySearchHeading(city, status)}
        />
        <CityAtmosphereStrip city={city} status={status} />
      </div>
      <HomeVitrinBanners city={city} />
      <RegionalFlavorTeaser city={city} cityStatus={status} onCityChange={setCity} />
      <FoodCastHomeSection city={city} />
      <NewMemberRestaurants />
    </div>
  );
}
