type Props = {
  /** Google Maps Directions URL (mevcut konumdan restorana rota). */
  mapsDirectionsUrl: string | null;
  compact?: boolean;
};

export function MapsDirectionsButton({ mapsDirectionsUrl, compact = false }: Props) {
  if (!mapsDirectionsUrl) {
    return null;
  }

  return (
    <a
      href={mapsDirectionsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={
        compact
          ? 'inline-flex items-center rounded-full border border-map/50 bg-map/15 px-3 py-1.5 text-xs font-semibold text-sky-100 transition hover:bg-map/25'
          : 'inline-flex items-center rounded-xl border border-map/50 bg-map/15 px-4 py-2.5 text-sm font-semibold text-sky-100 transition hover:bg-map/25'
      }>
      Yol Tarifi Al
    </a>
  );
}
