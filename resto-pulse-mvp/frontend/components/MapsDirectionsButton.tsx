type Props = {
  mapsDirectionsUrl: string | null;
  compact?: boolean;
};

export function MapsDirectionsButton({ mapsDirectionsUrl, compact = false }: Props) {
  if (!mapsDirectionsUrl) {
    return null;
  }

  const cls = compact
    ? 'inline-flex min-h-[44px] items-center rounded-xl border border-google/50 bg-google/15 px-3 py-1.5 text-xs font-semibold text-google transition duration-ui ease-ui hover:bg-google/25'
    : 'inline-flex min-h-[44px] items-center rounded-xl border border-google/50 bg-google/15 px-4 py-2.5 text-sm font-semibold text-google transition duration-ui ease-ui hover:bg-google/25';

  return (
    <a href={mapsDirectionsUrl} target="_blank" rel="noopener noreferrer" className={cls}>
      Yol Tarifi Al
    </a>
  );
}
