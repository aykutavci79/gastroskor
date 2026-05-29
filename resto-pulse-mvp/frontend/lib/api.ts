import type {
  CompensationCoupon,
  FeedbackMessage,
  GoogleReviewLink,
  PrivateFeedback,
  PrivateFeedbackDetail,
  LivePlaceDetails,
  LivePlaceSearchItem,
  LivePlaceSearchResponse,
  ReviewFilterState,
  Restaurant,
  RestaurantListItem,
  RestaurantTrendingItem,
  Review,
  ReviewAnalyzeResult,
  UserProfile,
} from '@/lib/types';

import { getApiBase, getApiV1Base } from '@/lib/api-base';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const hasBody = init?.body != null;
  const response = await fetch(`${getApiV1Base()}${path}`, {
    ...init,
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text || `API error ${response.status}`;
    try {
      const parsed = JSON.parse(text) as { detail?: string | Array<{ msg?: string }> };
      if (typeof parsed.detail === 'string') {
        message = parsed.detail;
      } else if (Array.isArray(parsed.detail) && parsed.detail.length > 0) {
        message = parsed.detail.map((row) => row.msg).filter(Boolean).join(' · ') || message;
      }
    } catch {
      // plain text / HTML error body
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function listTrendingRestaurantsWeek(params: {
  lat?: number;
  lng?: number;
  city?: string;
  limit?: number;
  source?: 'google' | 'gastroskor';
}) {
  const search = new URLSearchParams();
  if (params.lat != null) search.set('lat', String(params.lat));
  if (params.lng != null) search.set('lng', String(params.lng));
  if (params.city) search.set('city', params.city);
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.source) search.set('source', params.source);
  const query = search.toString();
  return request<RestaurantTrendingItem[]>(`/restaurants/trending-week${query ? `?${query}` : ''}`);
}

export function listRestaurants(params: { q?: string; city?: string }) {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.city) search.set('city', params.city);
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
  review_text: string;
  author_id?: string | null;
  author_email?: string | null;
  author_name?: string | null;
  author_avatar_url?: string | null;
}) {
  return request<Review>('/reviews', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function syncUser(payload: {
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  google_sub?: string | null;
}) {
  return request<UserProfile>('/users/sync', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function analyzeReview(reviewId: string) {
  return request<ReviewAnalyzeResult>(`/reviews/${reviewId}/analyze`, {
    method: 'POST',
  });
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
  distance_band?: string;
  rating_band?: string;
}) {
  const search = new URLSearchParams();
  search.set('q', params.q);
  if (params.city) search.set('city', params.city);
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.origin_lat != null) search.set('origin_lat', String(params.origin_lat));
  if (params.origin_lng != null) search.set('origin_lng', String(params.origin_lng));
  if (params.distance_band) search.set('distance_band', params.distance_band);
  if (params.rating_band) search.set('rating_band', params.rating_band);
  return request<LivePlaceSearchResponse>(`/live/places/search?${search.toString()}`);
}

export function getLivePlaceDetails(place_id: string, params?: { sort?: string; filter?: string }) {
  const search = new URLSearchParams();
  if (params?.sort) search.set('sort', params.sort);
  if (params?.filter) search.set('filter', params.filter);
  const query = search.toString();
  return request<LivePlaceDetails>(`/live/places/details/${encodeURIComponent(place_id)}${query ? `?${query}` : ''}`);
}

export function getPrivateFeedbackDetail(
  feedbackId: string,
  params: { actor_user_email?: string; actor_user_id?: string; actor_restaurant_id?: string },
) {
  const search = new URLSearchParams();
  if (params.actor_user_email) search.set('actor_user_email', params.actor_user_email);
  if (params.actor_user_id) search.set('actor_user_id', params.actor_user_id);
  if (params.actor_restaurant_id) search.set('actor_restaurant_id', params.actor_restaurant_id);
  return request<PrivateFeedbackDetail>(`/feedback/private/${encodeURIComponent(feedbackId)}?${search.toString()}`);
}

async function panelProxyRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  const text = await response.text();
  if (!response.ok) {
    let message = text || `API error ${response.status}`;
    try {
      const parsed = JSON.parse(text) as { error?: string; detail?: string };
      message = parsed.error ?? parsed.detail ?? message;
    } catch {
      // keep raw text
    }
    throw new Error(message);
  }
  return JSON.parse(text) as T;
}

/** Tarayicidan ayni origin (localhost:3000) uzerinden backend'e proxy */
export function seedPanelDemo() {
  return panelProxyRequest<{
    restaurant_id: string;
    restaurant_name: string;
    actor_email: string;
    created: number;
    open_count: number;
  }>('/api/panel/seed-demo', { method: 'POST' });
}

export function listPanelPrivateFeedbacks(params: {
  actor_user_email?: string;
  actor_user_id?: string;
  actor_restaurant_id?: string;
  status_filter?: string;
  limit?: number;
}) {
  const search = new URLSearchParams();
  if (params.actor_user_email) search.set('actor_user_email', params.actor_user_email);
  if (params.actor_user_id) search.set('actor_user_id', params.actor_user_id);
  if (params.actor_restaurant_id) search.set('actor_restaurant_id', params.actor_restaurant_id);
  if (params.status_filter) search.set('status_filter', params.status_filter);
  if (params.limit != null) search.set('limit', String(params.limit));
  return panelProxyRequest<PrivateFeedback[]>(`/api/panel/feedbacks?${search.toString()}`);
}

export function updatePrivateFeedbackStatus(
  feedbackId: string,
  payload: {
    status: 'in_review' | 'resolved' | 'rejected';
    actor_user_email?: string;
    actor_user_id?: string;
    actor_restaurant_id?: string;
  },
) {
  return request<PrivateFeedback>(`/feedback/private/${encodeURIComponent(feedbackId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function createFeedbackMessage(
  feedbackId: string,
  payload: {
    sender_type: 'user' | 'restaurant';
    message: string;
    actor_user_email?: string;
    actor_user_id?: string;
    actor_restaurant_id?: string;
    attachments_json?: Record<string, unknown> | null;
  },
) {
  return request<FeedbackMessage>(`/feedback/private/${encodeURIComponent(feedbackId)}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createCompensationCoupon(
  feedbackId: string,
  payload: {
    discount_percent: 10 | 25 | 50;
    expires_at: string;
    actor_user_email?: string;
    actor_user_id?: string;
    actor_restaurant_id?: string;
  },
) {
  return request<{
    coupon: CompensationCoupon;
    feedback_status: 'open' | 'in_review' | 'resolved' | 'rejected';
    notification_ready: boolean;
    notification_payload: Record<string, unknown>;
  }>(`/feedback/private/${encodeURIComponent(feedbackId)}/compensation`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getPanelAccess(userEmail: string) {
  return request<import('@/lib/types').PanelAccess>(
    `/panel/me?user_email=${encodeURIComponent(userEmail)}`,
  );
}

export function getPanelPromo(userEmail: string) {
  return request<import('@/lib/types').RestaurantPromoSettings>(
    `/panel/promo?user_email=${encodeURIComponent(userEmail)}`,
  );
}

export function getPanelMenu(userEmail: string) {
  return request<{ subscription_active: boolean; items: import('@/lib/types').RestaurantMenuItem[] }>(
    `/panel/menu?user_email=${encodeURIComponent(userEmail)}`,
  );
}

export function addPanelMenuItem(payload: {
  user_email: string;
  name: string;
  price_tl: number;
  description?: string | null;
  category?: string | null;
}) {
  return request<import('@/lib/types').RestaurantMenuItem>('/panel/menu', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updatePanelMenuItem(
  itemId: string,
  payload: {
    user_email: string;
    name?: string;
    price_tl?: number;
    description?: string | null;
    category?: string | null;
    is_active?: boolean;
    sort_order?: number;
  },
) {
  return request<import('@/lib/types').RestaurantMenuItem>(`/panel/menu/${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deletePanelMenuItem(userEmail: string, itemId: string) {
  return request<{ deleted: boolean }>(
    `/panel/menu/${encodeURIComponent(itemId)}?user_email=${encodeURIComponent(userEmail)}`,
    { method: 'DELETE' },
  );
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
  return request<import('@/lib/types').RestaurantPromoSettings>('/panel/promo', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function uploadPanelMenuImage(userEmail: string, file: File) {
  const form = new FormData();
  form.append('user_email', userEmail);
  form.append('file', file);
  const response = await fetch(`${getApiV1Base()}/panel/promo/menu-image`, {
    method: 'POST',
    body: form,
    cache: 'no-store',
  });
  if (!response.ok) {
    const text = await response.text();
    let message = text || `API error ${response.status}`;
    try {
      const parsed = JSON.parse(text) as { detail?: string };
      if (typeof parsed.detail === 'string') message = parsed.detail;
    } catch {
      // plain text
    }
    throw new Error(message);
  }
  return response.json() as Promise<{
    menu_image_url: string;
    settings: import('@/lib/types').RestaurantPromoSettings;
  }>;
}

export function getPanelDashboard(userEmail: string) {
  return request<import('@/lib/types').PanelDashboard>(
    `/panel/dashboard?user_email=${encodeURIComponent(userEmail)}`,
  );
}

export function startRestaurantClaim(payload: { user_email: string; place_id: string; city?: string }) {
  return request<{
    ownership_id: string;
    restaurant_id: string;
    restaurant_name: string;
    verification_status: string;
    panel_tier: string;
    phone_info: {
      phone_raw: string | null;
      is_mobile: boolean;
      phone_masked: string | null;
      requires_tax_document: boolean;
    };
  }>('/panel/claim/start', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function sendRestaurantClaimOtp(userEmail: string) {
  return request<{ sent: boolean; phone_masked: string; expires_in_minutes: number }>(
    `/panel/claim/send-otp?user_email=${encodeURIComponent(userEmail)}`,
    { method: 'POST' },
  );
}

export function verifyRestaurantClaimOtp(payload: { user_email: string; code: string }) {
  return request<import('@/lib/types').PanelAccess>('/panel/claim/verify-otp', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function submitRestaurantTaxDocument(payload: { user_email: string; note: string }) {
  return request<import('@/lib/types').PanelAccess>('/panel/claim/tax-document', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function purchasePanelAiAddon(userEmail: string, sku: string) {
  return request<{
    ok: boolean;
    mock_payment: boolean;
    purchase: { message: string };
    ai_quota: import('@/lib/types').AiAnalysisQuota;
  }>('/panel/ai-purchase', {
    method: 'POST',
    body: JSON.stringify({ user_email: userEmail, sku }),
  });
}

export function analyzePanelCompetitor(userEmail: string, competitorId: string) {
  return request<import('@/lib/types').CompetitorAiReport>(
    `/panel/competitors/${encodeURIComponent(competitorId)}/analyze?user_email=${encodeURIComponent(userEmail)}`,
    { method: 'POST' },
  );
}

export function addPanelCompetitor(payload: { user_email: string; place_id: string; name: string }) {
  return request<{ id: string; google_place_id: string; name: string; rating: number | null; review_count: number | null }>(
    '/panel/competitors',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export function trackAnalyticsEvent(payload: {
  event_type: string;
  place_id?: string;
  restaurant_id?: string;
  metadata?: Record<string, unknown>;
}) {
  return request<{ ok: boolean }>('/panel/analytics/events', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
