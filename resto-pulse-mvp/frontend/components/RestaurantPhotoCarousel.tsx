type Props = {
  photos: string[];
  className?: string;
};

/** Google Places fotograflari — yatay kaydirma, mobil detay ile ayni yukseklik. */
export function RestaurantPhotoCarousel({ photos, className = '' }: Props) {
  const heightClass = 'h-[220px]';

  if (photos.length === 0) {
    return (
      <div
        className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-border/70 bg-surface-input ${heightClass} ${className}`}>
        <span className="text-4xl opacity-35" aria-hidden>
          🍽️
        </span>
        <p className="text-sm text-content-muted">Fotograf bulunamadi</p>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-border/70 ${heightClass} ${className}`}>
      <div className="flex h-full snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {photos.map((url, index) => (
          <div key={`${url}-${index}`} className="h-full min-w-full shrink-0 snap-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              className="h-full w-full object-cover"
              loading={index === 0 ? 'eager' : 'lazy'}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
