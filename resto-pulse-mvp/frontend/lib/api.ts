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
  Review,
  ReviewAnalyzeResult,
  UserProfile,
} from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.gastroskor.com.tr';
const API_V1 = `${API_BASE}/api/v1`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const hasBody = init?.body != null;
  const response = await fetch(`${API_V1}${path}`, {
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
