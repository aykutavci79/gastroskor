import type { CategoryVisual } from '@/lib/restaurant-category-visual';
import { getCoverArtPreset } from '@/lib/restaurant-cover-art';

type Props = {
  visual: CategoryVisual;
  seed?: string;
  compact?: boolean;
};

/** Fotograf yokken sag kapak — doygun renk + buyuk urun silueti (emoji + dekor). */
export function RestaurantCardCoverArt({ visual, seed = '', compact = false }: Props) {
  const art = getCoverArtPreset(visual.kind, seed || visual.label);
  const hero = visual.emoji;

  return (
    <div className={`relative h-full w-full overflow-hidden bg-gradient-to-br ${art.background}`}>
      <div
        className={`absolute -right-6 top-1/4 h-28 w-28 rounded-full blur-2xl ${art.glow} ${compact ? 'scale-90' : 'scale-100'}`}
        aria-hidden
      />
      <div
        className={`absolute bottom-0 right-0 h-32 w-32 rounded-full blur-3xl ${art.glow} opacity-60`}
        aria-hidden
      />

      {/* Dekor — arka planda siluet hissi */}
      {art.accents.map((accent, i) => (
        <span
          key={`${accent}-${i}`}
          className={`pointer-events-none absolute select-none opacity-[0.22] ${
            i === 0
              ? compact
                ? 'right-1 top-2 text-3xl'
                : 'right-2 top-3 text-4xl'
              : i === 1
                ? compact
                  ? 'bottom-6 right-8 text-2xl'
                  : 'bottom-8 right-10 text-3xl'
                : compact
                  ? 'bottom-2 right-1 text-xl'
                  : 'bottom-3 right-2 text-2xl'
          }`}
          aria-hidden>
          {accent}
        </span>
      ))}

      {/* Ana urun — buyuk, parlak */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`select-none drop-shadow-[0_12px_28px_rgba(0,0,0,0.55)] ${
            compact ? 'text-[4.5rem] leading-none' : 'text-[5.5rem] leading-none'
          }`}
          style={{
            filter: 'saturate(1.35) contrast(1.05)',
            transform: 'rotate(-6deg) scale(1.02)',
          }}
          aria-hidden>
          {hero}
        </span>
      </div>

      {/* Tabak / vitrin halkasi */}
      <div
        className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-white/5 ${
          compact ? 'h-[4.5rem] w-[4.5rem]' : 'h-[5.5rem] w-[5.5rem]'
        }`}
        aria-hidden
      />

      {/* Buhar — sicak yemek hissi */}
      {(visual.kind === 'kebab' || visual.kind === 'pizza' || visual.kind === 'breakfast') && (
        <div className="pointer-events-none absolute right-[18%] top-[12%] flex gap-1 opacity-40" aria-hidden>
          <span className="h-6 w-1 animate-pulse rounded-full bg-white/50" style={{ animationDelay: '0ms' }} />
          <span className="h-8 w-1 animate-pulse rounded-full bg-white/40" style={{ animationDelay: '200ms' }} />
          <span className="h-5 w-1 animate-pulse rounded-full bg-white/35" style={{ animationDelay: '400ms' }} />
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/50 via-black/20 to-transparent" aria-hidden />
      <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-black/25 to-transparent" aria-hidden />
    </div>
  );
}
