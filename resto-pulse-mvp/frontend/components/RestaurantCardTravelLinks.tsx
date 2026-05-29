import type { MouseEvent } from 'react';

import { estimateTravelMinutes } from '@/lib/travel-estimate';

type Props = {
  mapsDirectionsUrl?: string | null;
  distanceMeters?: number | null;
  compact?: boolean;
};

function stopNav(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

export function RestaurantCardTravelLinks({ mapsDirectionsUrl, distanceMeters, compact = false }: Props) {
  const maps = mapsDirectionsUrl?.trim();
  const hasDistance = distanceMeters != null && distanceMeters > 0;
  const travel = hasDistance ? estimateTravelMinutes(distanceMeters!) : null;

  if (!maps && !travel) return null;

  const pill = compact
    ? 'inline-flex items-center gap-0.5 rounded-md border border-slate-600/80 bg-slate-900/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-200 backdrop-blur-sm'
    : 'inline-flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-900/90 px-2 py-1 text-xs font-medium text-slate-200 backdrop-blur-sm';

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${compact ? 'mt-1.5' : 'mt-2'}`}>
      {maps ? (
        <a
          href={maps}
          target="_blank"
          rel="noopener noreferrer"
          onClick={stopNav}
          className={`${pill} hover:border-accent/50 hover:text-accent`}>
          <span aria-hidden>🗺️</span>
          Haritada ac
        </a>
      ) : null}
      {travel ? (
        <>
          <span className={`${pill} text-slate-300`} title="Tahmini yurume suresi">
            <span aria-hidden>🚶</span>
            {travel.walkMin} dk
          </span>
          <span className={`${pill} text-slate-300`} title="Tahmini arac suresi">
            <span aria-hidden>🚗</span>
            {travel.driveMin} dk
          </span>
        </>
      ) : null}
    </div>
  );
}
