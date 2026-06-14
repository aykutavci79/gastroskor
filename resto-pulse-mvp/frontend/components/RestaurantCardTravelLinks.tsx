import type { MouseEvent } from 'react';

import { estimateTravelMinutes } from '@/lib/travel-estimate';

type Props = {
  mapsDirectionsUrl?: string | null;
  distanceMeters?: number | null;
  compact?: boolean;
};

function stopCardNav(e: MouseEvent) {
  e.stopPropagation();
}

export function RestaurantCardTravelLinks({ mapsDirectionsUrl, distanceMeters, compact = false }: Props) {
  const maps = mapsDirectionsUrl?.trim();
  const hasDistance = distanceMeters != null && distanceMeters > 0;
  const travel = hasDistance ? estimateTravelMinutes(distanceMeters!) : null;

  if (!maps && !travel) return null;

  const pill = compact
    ? 'card-touch-target gap-1 rounded-lg border border-border/80 bg-surface-input/90 px-2.5 text-xs font-medium text-content backdrop-blur-sm'
    : 'inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-border bg-surface-input/90 px-3 py-2 text-xs font-medium text-content backdrop-blur-sm';

  return (
    <div className={`card-btn-group flex flex-wrap items-center gap-1.5 ${compact ? 'mt-1.5' : 'mt-2'}`}>
      {maps ? (
        <a
          href={maps}
          target="_blank"
          rel="noopener noreferrer"
          onClick={stopCardNav}
          className={`${pill} border-google/40 bg-google/10 text-google hover:bg-google/20 transition duration-ui ease-ui`}>
          <span aria-hidden>🗺️</span>
          Haritada ac
        </a>
      ) : null}
      {travel ? (
        <>
          <span className={`${pill} text-content-muted`} title="Tahmini yurume suresi">
            <span aria-hidden>🚶</span>
            {travel.walkMin} dk
          </span>
          <span className={`${pill} text-content-muted`} title="Tahmini arac suresi">
            <span aria-hidden>🚗</span>
            {travel.driveMin} dk
          </span>
        </>
      ) : null}
    </div>
  );
}
