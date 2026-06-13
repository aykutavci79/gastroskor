'use client';

import { useState } from 'react';

import { FeaturedHighlightsSection } from '@/components/FeaturedHighlightsSection';
import { HomeDbRestaurants } from '@/components/HomeDbRestaurants';
import { LivePlaceSearch } from '@/components/LivePlaceSearch';
import { NewMemberRestaurants } from '@/components/NewMemberRestaurants';
import { RegionalFlavorTeaser } from '@/components/RegionalFlavorTeaser';
import { SloganBanner } from '@/components/SloganBanner';
import { useDetectedCity } from '@/hooks/useDetectedCity';

export function HomePageContent() {
  const { city, status, coords } = useDetectedCity();
  const [hasSearched, setHasSearched] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <SloganBanner />
      <FeaturedHighlightsSection />
      <LivePlaceSearch
        city={city}
        cityStatus={status}
        userCoords={coords}
        embedded
        heading="Ana sayfa — canlı restoran arama"
        onSearchPerformed={() => setHasSearched(true)}
      />
      <RegionalFlavorTeaser showProducts={hasSearched} />
      <HomeDbRestaurants />
      <NewMemberRestaurants />
    </div>
  );
}
