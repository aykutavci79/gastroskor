'use client';

import { useRouter } from 'next/navigation';

import { ProvinceSelect } from '@/components/ProvinceSelect';
import { cityDisplayName, normalizeCityInput } from '@/lib/turkiye-provinces';

type Props = {
  city: string;
};

export function YoreselLezzetlerCityPicker({ city }: Props) {
  const router = useRouter();
  const cityLabel = cityDisplayName(city);

  return (
    <div className="mt-6 max-w-sm">
      <ProvinceSelect
        id="yoresel-list-city"
        value={cityLabel}
        label="İl seç"
        onChange={(next) => {
          const normalized = normalizeCityInput(next);
          router.push(`/yoresel-lezzetler?city=${encodeURIComponent(normalized)}`);
        }}
      />
    </div>
  );
}
