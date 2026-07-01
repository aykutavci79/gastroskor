import type { RestaurantListItem } from '@/lib/types';

import { TESTER_RESERVATION_SHOWCASE_PLACE_ID } from '@/constants/tester-reservation-showcase';

/** Vitrin listesi boşken gösterilen örnek kart (Atlas Sofra görselleri). */
export const RESERVATION_VITRIN_PREVIEW_RESTAURANT: RestaurantListItem = {
  id: 'vitrin-preview-atlas-sofra',
  name: 'Atlas Sofra',
  city: 'Bursa',
  district: 'Nilüfer',
  category: 'Kebap & Izgara',
  avg_rating: 4.7,
  geo_indications: [],
  has_geographical_indication: false,
  gi_product_name: null,
  google_rating: 4.6,
  google_review_count: 128,
  google_place_id: TESTER_RESERVATION_SHOWCASE_PLACE_ID,
  distance_meters: 1200,
  menu_item_count: 4,
  menu_preview: [
    { id: 'preview-1', name: 'İskender', price_tl: 285, category: 'Ana yemek' },
    { id: 'preview-2', name: 'Kuzu şiş', price_tl: 320, category: 'Ana yemek' },
    { id: 'preview-3', name: 'Humus', price_tl: 95, category: 'Meze' },
  ],
  online_reservations_available: true,
  reservation_vitrin_listed: true,
  reservation_vitrin_status: 'approved',
};
