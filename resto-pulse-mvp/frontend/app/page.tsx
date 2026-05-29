import { LivePlaceSearch } from '@/components/LivePlaceSearch';
import { HomeRestaurantGrid } from '@/components/HomeRestaurantGrid';
import { SearchForm } from '@/components/SearchForm';
import { TrendingRestaurants } from '@/components/TrendingRestaurants';
import { listRestaurants } from '@/lib/api';

type Props = {
  searchParams: Promise<{ q?: string; city?: string }>;
};

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  const city = params.city?.trim() ?? '';

  let restaurants: Awaited<ReturnType<typeof listRestaurants>> = [];
  let error: string | null = null;

  try {
    restaurants = await listRestaurants({ q: q || undefined, city: city || undefined });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('API error 5')) {
      error =
        'Backend calisiyor ama veritabani hazir degil. backend klasorunde: alembic upgrade head && python seed.py';
    } else {
      error =
        'Backend API baglantisi kurulamadi. Vercel env: NEXT_PUBLIC_API_URL ve canli API sunucusu (api.gastroskor.com.tr) kontrol edin.';
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-700/60 bg-gradient-to-r from-slate-900 to-slate-800 p-8 shadow-glow">
        <p className="mb-2 text-sm font-medium uppercase tracking-wider text-accent">GastroSkor</p>
        <h1 className="mb-3 text-3xl font-bold text-white sm:text-4xl">
          Turkiye restoranlarini tek catida puanla
        </h1>
        <p className="max-w-2xl text-slate-300">
          Sehir ve isimle ara; lezzet, servis, fiyat ve hijyen skorlarini yapay zeka ile gor.
          Yorumunu yaz, analiz et, Google Haritalar&apos;a tek tikla aktar.
        </p>
      </section>

      <SearchForm initialQ={q} initialCity={city} />
      <LivePlaceSearch />

      {error ? (
        <div className="rounded-xl border border-bad/40 bg-bad/10 p-4 text-sm text-red-200">{error}</div>
      ) : null}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            Restoranlar {city ? `· ${city}` : ''}
          </h2>
          <span className="text-sm text-slate-400">{restaurants.length} sonuc</span>
        </div>

        <HomeRestaurantGrid initialRestaurants={restaurants} q={q} city={city} />
      </section>

      <TrendingRestaurants />
    </div>
  );
}
