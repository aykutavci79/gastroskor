import type {
  CompetitorAiReport,
  GoogleReviewLink,
  LivePlaceSearchResponse,
  LivePlaceDetails,
  PanelAccess,
  PanelDashboard,
  Restaurant,
  RestaurantListItem,
  RestaurantMenuItem,
  RestaurantPromoSettings,
  RestaurantTrendingItem,
  Review,
  ReviewAnalyzeResult,
  UserProfile,
} from '@/lib/types';

import { getApiV1Base } from '@/lib/api-base';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const hasBody = init?.body != null;
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData;
  const response = await fetch(`${getApiV1Base()}${path}`, {
    ...init,
    headers: {
      ...(hasBody && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text || `API error ${response.status}`;
    try {
      const parsed = JSON.parse(text) as { detail?: string | Array<{ msg?: string }> };
      if (typeof parsed.detail === 'string') message = parsed.detail;
      else if (Array.isArray(parsed.detail) && parsed.detail.length > 0) {
        message = parsed.detail.map((row) => row.msg).filter(Boolean).join(' · ') || message;
      }
    } catch {
      // plain text
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function listTrendingRestaurantsWeek(params: {
  lat?: number;
  lng?: number;
  city?: string;
  limit?: number;
}) {
  const search = new URLSearchParams();
  if (params.lat != null) search.set('lat', String(params.lat));
  if (params.lng != null) search.set('lng', String(params.lng));
  if (params.city) search.set('city', params.city);
  if (params.limit != null) search.set('limit', String(params.limit));
  const query = search.toString();
  return request<RestaurantTrendingItem[]>(`/restaurants/trending-week${query ? `?${query}` : ''}`);
}

export function listRestaurants(params: {
  q?: string;
  city?: string;
  origin_lat?: number;
  origin_lng?: number;
}) {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.city) search.set('city', params.city);
  if (params.origin_lat != null) search.set('origin_lat', String(params.origin_lat));
  if (params.origin_lng != null) search.set('origin_lng', String(params.origin_lng));
  const query = search.toString();
  return request<RestaurantListItem[]>(`/restaurants${query ? `?${query}` : ''}`);
}

export function getRestaurant(id: string) {
  return request<Restaurant>(`/restaurants/${id}`);
}

export function listRestaurantReviews(restaurantId: string) {
  return request<Review[]>(`/restaurants/${restaurantId}/reviews`);
}

export function createReview(payload: {
  restaurant_id: string;
  rating: number;
  review_text?: string;
  author_email?: string | null;
  author_name?: string | null;
}) {
  return request<Review>('/reviews', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      review_text: payload.review_text ?? '',
    }),
  });
}

export async function uploadReviewImage(
  reviewId: string,
  authorEmail: string,
  localUri: string,
  mimeType: string,
  fileName: string,
) {
  const form = new FormData();
  form.append('author_email', authorEmail);
  form.append('file', { uri: localUri, type: mimeType, name: fileName } as unknown as Blob);
  const response = await fetch(`${getApiV1Base()}/reviews/${encodeURIComponent(reviewId)}/images`, {
    method: 'POST',
    body: form,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Upload failed ${response.status}`);
  }
  return response.json() as Promise<Review>;
}

export function syncUser(payload: {
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  google_sub?: string | null;
}) {
  return request<UserProfile>('/users/sync', { method: 'POST', body: JSON.stringify(payload) });
}

export function analyzeReview(reviewId: string) {
  return request<ReviewAnalyzeResult>(`/reviews/${reviewId}/analyze`, { method: 'POST' });
}

export function getGoogleReviewLink(restaurantId: string) {
  return request<GoogleReviewLink>(`/restaurants/${restaurantId}/google-review-link`);
}

export function searchLivePlaces(params: {
  q: string;
  city?: string;
  limit?: number;
  origin_lat?: number;
  origin_lng?: number;
}) {
  const search = new URLSearchParams();
  search.set('q', params.q);
  search.set('city', params.city?.trim() || 'Bursa');
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.origin_lat != null) search.set('origin_lat', String(params.origin_lat));
  if (params.origin_lng != null) search.set('origin_lng', String(params.origin_lng));
  return request<LivePlaceSearchResponse>(`/live/places/search?${search.toString()}`);
}

export function getLivePlaceDetails(placeId: string) {
  return request<LivePlaceDetails>(
    `/live/places/details/${encodeURIComponent(placeId)}`,
  );
}

export function getPanelAccess(userEmail: string) {
  return request<PanelAccess>(`/panel/me?user_email=${encodeURIComponent(userEmail)}`);
}

export function getPanelDashboard(userEmail: string) {
  return request<PanelDashboard>(`/panel/dashboard?user_email=${encodeURIComponent(userEmail)}`);
}

export function getPanelPromo(userEmail: string) {
  return request<RestaurantPromoSettings>(`/panel/promo?user_email=${encodeURIComponent(userEmail)}`);
}

export function updatePanelPromo(payload: {
  user_email: string;
  has_own_courier: boolean;
  direct_order_text?: string | null;
  direct_order_phone?: string | null;
  direct_order_whatsapp?: string | null;
  direct_order_url?: string | null;
  menu_image_url?: string | null;
  instagram?: string | null;
}) {
  return request<RestaurantPromoSettings>('/panel/promo', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function getPanelMenu(userEmail: string) {
  return request<{ subscription_active: boolean; items: RestaurantMenuItem[] }>(
    `/panel/menu?user_email=${encodeURIComponent(userEmail)}`,
  );
}

export function addPanelMenuItem(payload: {
  user_email: string;
  name: string;
  price_tl: number;
  description?: string | null;
}) {
  return request<RestaurantMenuItem>('/panel/menu', { method: 'POST', body: JSON.stringify(payload) });
}

export function deletePanelMenuItem(userEmail: string, itemId: string) {
  return request<{ deleted: boolean }>(
    `/panel/menu/${encodeURIComponent(itemId)}?user_email=${encodeURIComponent(userEmail)}`,
    { method: 'DELETE' },
  );
}

export async function uploadPanelMenuImage(
  userEmail: string,
  localUri: string,
  mimeType: string,
  fileName: string,
) {
  const form = new FormData();
  form.append('user_email', userEmail);
  form.append('file', { uri: localUri, type: mimeType, name: fileName } as unknown as Blob);
  const response = await fetch(`${getApiV1Base()}/panel/promo/menu-image`, {
    method: 'POST',
    body: form,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Upload failed ${response.status}`);
  }
  return response.json() as Promise<{
    menu_image_url: string;
    settings: RestaurantPromoSettings;
  }>;
}

export function startRestaurantClaim(payload: { user_email: string; place_id: string; city?: string }) {
  return request<{
    ownership_id: string;
    restaurant_name: string;
    phone_info: { phone_masked: string | null };
  }>('/panel/claim/start', { method: 'POST', body: JSON.stringify(payload) });
}

export function sendRestaurantClaimOtp(userEmail: string) {
  return request<{ sent: boolean; phone_masked: string }>(
    `/panel/claim/send-otp?user_email=${encodeURIComponent(userEmail)}`,
    { method: 'POST' },
  );
}

export function verifyRestaurantClaimOtp(payload: { user_email: string; code: string }) {
  return request<PanelAccess>('/panel/claim/verify-otp', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function analyzePanelCompetitor(userEmail: string, competitorId: string) {
  return request<CompetitorAiReport>(
    `/panel/competitors/${encodeURIComponent(competitorId)}/analyze?user_email=${encodeURIComponent(userEmail)}`,
    { method: 'POST' },
  );
}

export function addPanelCompetitor(payload: { user_email: string; place_id: string; name: string }) {
  return request<{ id: string; name: string }>('/panel/competitors', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
