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
  CityTopResponse,
  NewMemberRestaurantsResponse,
  RegionalProductDetailResponse,
  RegionalProductListResponse,
  Restaurant,
  RestaurantListItem,
  RestaurantTrendingItem,
  Review,
  ReviewAnalyzeResult,
  ReviewReply,
  UserProfile,
  VoiceMenuOfferingState,
  VoiceProductCatalogGroup,
} from '@/lib/types';
import type { FoodcastFeedResponse } from '@/lib/foodcast-types';

import { getApiBase, getApiV1Base } from '@/lib/api-base';
import { backendAuthHeaders } from '@/lib/backend-auth-token';
import { parseModerationDetail, ReviewModerationApiError } from '@/lib/review-moderation';

export { ReviewModerationApiError };

function apiConnectionHint(): string {
  const base = getApiBase();
  if (/localhost|127\.0\.0\.1/i.test(base)) {
    return `API baglantisi kurulamadi (${base}). Backend acik mi? backend/.env icinde GOOGLE_PLACES_API_KEY ve Postgres (5432) hazir mi?`;
  }
  return `API baglantisi kurulamadi (${base}). Internet veya sunucu durumunu kontrol edin.`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const hasBody = init?.body != null;
  let response: Response;
  try {
    response = await fetch(`${getApiV1Base()}${path}`, {
      ...init,
      headers: {
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...backendAuthHeaders(),
        ...(init?.headers ?? {}),
      },
      cache: 'no-store',
      signal: init?.signal ?? AbortSignal.timeout(20_000),
    });
  } catch (err) {
    const raw = err instanceof Error ? err.message : 'Failed to fetch';
    if (raw === 'Failed to fetch' || raw.includes('aborted') || raw.includes('timeout')) {
      throw new Error(apiConnectionHint());
    }
    throw err;
  }

  if (!response.ok) {
    const text = await response.text();
    let message = text || `API error ${response.status}`;
    try {
      const parsed = JSON.parse(text) as {
        detail?: string | Array<{ msg?: string }> | Record<string, unknown>;
      };
      if (typeof parsed.detail === 'string') {
        message = parsed.detail;
      } else if (Array.isArray(parsed.detail) && parsed.detail.length > 0) {
        message = parsed.detail.map((row) => row.msg).filter(Boolean).join(' · ') || message;
      } else if (parsed.detail && typeof parsed.detail === 'object' && !Array.isArray(parsed.detail)) {
        const modErr = parseModerationDetail(parsed.detail);
        if (modErr) throw modErr;
      }
    } catch (err) {
      if (err instanceof ReviewModerationApiError) throw err;
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

export function listCityTopRestaurants(params: { lat?: number; lng?: number; city?: string; limit?: number }) {
  const search = new URLSearchParams();
  if (params.lat != null) search.set('lat', String(params.lat));
  if (params.lng != null) search.set('lng', String(params.lng));
  if (params.city) search.set('city', params.city);
  if (params.limit != null) search.set('limit', String(params.limit));
  const query = search.toString();
  return request<CityTopResponse>(`/restaurants/city-top${query ? `?${query}` : ''}`);
}

export function listNewMemberRestaurants(params?: { limit?: number }) {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set('limit', String(params.limit));
  const query = search.toString();
  return request<NewMemberRestaurantsResponse>(`/restaurants/new-members${query ? `?${query}` : ''}`);
}

export function listRegionalProducts(params?: { city?: string }) {
  const search = new URLSearchParams();
  if (params?.city) search.set('city', params.city);
  const query = search.toString();
  return request<RegionalProductListResponse>(`/regional-flavors/products${query ? `?${query}` : ''}`);
}

export function getFoodcastFeed(params?: { city?: string; limit?: number; offset?: number }) {
  const search = new URLSearchParams();
  if (params?.city) search.set('city', params.city);
  if (params?.limit != null) search.set('limit', String(params.limit));
  if (params?.offset != null) search.set('offset', String(params.offset));
  const query = search.toString();
  return request<FoodcastFeedResponse>(`/foodcast/feed${query ? `?${query}` : ''}`);
}

export function getRegionalProduct(slug: string, params?: { city?: string }) {
  const search = new URLSearchParams();
  if (params?.city) search.set('city', params.city);
  const query = search.toString();
  return request<RegionalProductDetailResponse>(
    `/regional-flavors/products/${encodeURIComponent(slug)}${query ? `?${query}` : ''}`,
  );
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

export function listRestaurantReviews(restaurantId: string, viewerEmail?: string | null) {
  const query = viewerEmail?.trim()
    ? `?viewer_email=${encodeURIComponent(viewerEmail.trim())}`
    : '';
  return request<Review[]>(`/restaurants/${restaurantId}/reviews${query}`);
}

export function createReview(payload: {
  restaurant_id: string;
  rating: number;
  review_text: string;
  author_id?: string | null;
  author_email?: string | null;
  author_name?: string | null;
  author_avatar_url?: string | null;
  author_name_display?: 'full' | 'masked' | 'nickname';
}) {
  return request<Review>('/reviews', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function moderateReviewText(review_text: string) {
  return request<{ allowed: boolean; message?: string | null; highlights: string[] }>(
    '/reviews/moderate-text',
    {
      method: 'POST',
      body: JSON.stringify({ review_text }),
    },
  );
}

export function updateReview(
  reviewId: string,
  payload: {
    author_email: string;
    rating?: number;
    review_text?: string;
  },
) {
  return request<Review>(`/reviews/${encodeURIComponent(reviewId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteReview(reviewId: string, authorEmail: string) {
  return request<void>(`/reviews/${encodeURIComponent(reviewId)}`, {
    method: 'DELETE',
    body: JSON.stringify({ author_email: authorEmail }),
  });
}

export function toggleReviewHelpful(reviewId: string, authorEmail: string) {
  return request<Review>(`/reviews/${encodeURIComponent(reviewId)}/helpful`, {
    method: 'POST',
    body: JSON.stringify({ author_email: authorEmail }),
  });
}

export function createReviewReply(reviewId: string, payload: { author_email: string; reply_text: string }) {
  return request<ReviewReply>(`/reviews/${encodeURIComponent(reviewId)}/replies`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateReviewReply(
  reviewId: string,
  replyId: string,
  payload: { author_email: string; reply_text: string },
) {
  return request<ReviewReply>(
    `/reviews/${encodeURIComponent(reviewId)}/replies/${encodeURIComponent(replyId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}

export function deleteReviewReply(reviewId: string, replyId: string, authorEmail: string) {
  return request<void>(
    `/reviews/${encodeURIComponent(reviewId)}/replies/${encodeURIComponent(replyId)}`,
    {
      method: 'DELETE',
      body: JSON.stringify({ author_email: authorEmail }),
    },
  );
}

export function syncUser(payload: {
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  google_sub?: string | null;
  record_login?: boolean;
  default_review_name_display?: 'full' | 'masked' | 'nickname';
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

export function getVoiceProductCatalog() {
  return request<{ groups: VoiceProductCatalogGroup[]; products: unknown[] }>('/panel/voice-products/catalog');
}

export function getPanelVoiceMenuOfferings(userEmail: string) {
  return request<{ items: VoiceMenuOfferingState[] }>(
    `/panel/voice-menu-offerings?user_email=${encodeURIComponent(userEmail)}`,
  );
}

export function syncPanelVoiceMenuOfferings(payload: {
  user_email: string;
  offerings: { slug: string; enabled: boolean; price_tl: number | null }[];
}) {
  return request<{ items: VoiceMenuOfferingState[] }>('/panel/voice-menu-offerings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function listPanelOrders(userEmail: string, limit = 100, days = 7) {
  const query = `?user_email=${encodeURIComponent(userEmail.trim().toLowerCase())}&limit=${limit}&days=${days}`;
  return request<{ items: import('@/lib/types').RestaurantOrderRead[] }>(`/panel/orders${query}`);
}

export function decidePanelOrder(
  orderId: string,
  payload: {
    user_email: string;
    decision: 'accepted' | 'rejected';
    reject_reason_code?: string | null;
    reject_reason_text?: string | null;
  },
) {
  return request<import('@/lib/types').RestaurantOrderRead>(`/panel/orders/${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      user_email: payload.user_email.trim().toLowerCase(),
      decision: payload.decision,
      reject_reason_code: payload.reject_reason_code ?? undefined,
      reject_reason_text: payload.reject_reason_text?.trim() || undefined,
    }),
  });
}

export function updatePanelPromo(payload: {
  user_email: string;
  has_own_courier: boolean;
  online_orders_enabled?: boolean;
  online_order_category_tags?: string[];
  direct_order_text?: string | null;
  direct_order_phone?: string | null;
  direct_order_whatsapp?: string | null;
  direct_order_url?: string | null;
  menu_image_url?: string | null;
  card_cover_image_url?: string | null;
  instagram?: string | null;
  card_emoji?: string | null;
}) {
  return request<import('@/lib/types').RestaurantPromoSettings>('/panel/promo', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function resetPanelPublicData(userEmail: string, hideFromPublic = true) {
  return request<import('@/lib/types').PanelResetPublicDataResponse>('/panel/reset-public-data', {
    method: 'POST',
    body: JSON.stringify({
      user_email: userEmail.trim().toLowerCase(),
      hide_from_public: hideFromPublic,
    }),
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

export async function uploadPanelCardCoverImage(userEmail: string, file: File) {
  const form = new FormData();
  form.append('user_email', userEmail);
  form.append('file', file);
  const response = await fetch(`${getApiV1Base()}/panel/promo/card-cover-image`, {
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
    card_cover_image_url: string;
    settings: import('@/lib/types').RestaurantPromoSettings;
  }>;
}

export function getPanelDashboard(userEmail: string) {
  return request<import('@/lib/types').PanelDashboard>(
    `/panel/dashboard?user_email=${encodeURIComponent(userEmail)}`,
  );
}

export function listPanelPendingReviewRemedies(userEmail: string) {
  return request<import('@/lib/types').ReviewRemedyPendingItem[]>(
    `/panel/reviews/remedy/pending?user_email=${encodeURIComponent(userEmail)}`,
  );
}

export function issuePanelReviewRemedyOffer(payload: {
  user_email: string;
  review_id: string;
  discount_percent: number;
  coupon_valid_days?: number;
  offer_message?: string;
}) {
  const { review_id, ...body } = payload;
  return request<import('@/lib/types').ReviewRemedyOfferSummary>(
    `/panel/reviews/${encodeURIComponent(review_id)}/remedy-offer`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export function listPendingReviewRemedies(authorEmail: string) {
  return request<import('@/lib/types').ReviewRemedyPendingItem[]>(
    `/reviews/remedy/pending?author_email=${encodeURIComponent(authorEmail)}`,
  );
}

export function acceptReviewRemedyOffer(reviewId: string, authorEmail: string) {
  return request<{ review_id: string; publication_status: string; message: string }>(
    `/reviews/${encodeURIComponent(reviewId)}/remedy/accept`,
    { method: 'POST', body: JSON.stringify({ author_email: authorEmail }) },
  );
}

export function rejectReviewRemedyOffer(reviewId: string, authorEmail: string) {
  return request<{ review_id: string; publication_status: string; message: string }>(
    `/reviews/${encodeURIComponent(reviewId)}/remedy/reject`,
    { method: 'POST', body: JSON.stringify({ author_email: authorEmail }) },
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
      phone_raw?: string | null;
      is_mobile: boolean;
      phone_masked: string | null;
      requires_tax_document: boolean;
      requires_admin_approval?: boolean;
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

export function getGoogleBusinessConnectUrl(userEmail: string) {
  return request<{ auth_url: string; redirect_uri: string; scope: string }>(
    `/panel/google-business/connect-url?user_email=${encodeURIComponent(userEmail)}`,
  );
}

export function disconnectGoogleBusiness(userEmail: string) {
  return request<{ ok: boolean }>(
    `/panel/google-business/disconnect?user_email=${encodeURIComponent(userEmail)}`,
    { method: 'POST' },
  );
}

export function analyzeGoogleBusiness(userEmail: string) {
  return request<import('@/lib/types').CompetitorAiReport & { reviews_total?: number; report_source?: string }>(
    `/panel/google-business/analyze?user_email=${encodeURIComponent(userEmail)}`,
    { method: 'POST' },
  );
}

export function getPanelAiReportTrend(userEmail: string) {
  return request<import('@/lib/types').AiReportTrend>(
    `/panel/ai-reports/trend?user_email=${encodeURIComponent(userEmail)}`,
  );
}

export function getPanelAiReportDetail(userEmail: string, reportId: string) {
  return request<import('@/lib/types').StoredAiReport>(
    `/panel/ai-reports/${encodeURIComponent(reportId)}?user_email=${encodeURIComponent(userEmail)}`,
  );
}

export function addPanelCompetitor(payload: { user_email: string; place_id: string; name: string }) {
  return request<{ id: string; google_place_id: string; name: string; rating: number | null; review_count: number | null }>(
    '/panel/competitors',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export function listPanelNotifications(userEmail: string, limit = 30) {
  return request<import('@/lib/types').PanelNotificationsResponse>(
    `/panel/notifications?user_email=${encodeURIComponent(userEmail)}&limit=${limit}`,
  );
}

export function markPanelNotificationOpen(userEmail: string, notificationId: string) {
  return request<import('@/lib/types').PanelNotification>(
    `/panel/notifications/${encodeURIComponent(notificationId)}/open?user_email=${encodeURIComponent(userEmail)}`,
    { method: 'POST' },
  );
}

export function markPanelNotificationClick(userEmail: string, notificationId: string) {
  return request<import('@/lib/types').PanelNotification>(
    `/panel/notifications/${encodeURIComponent(notificationId)}/click?user_email=${encodeURIComponent(userEmail)}`,
    { method: 'POST' },
  );
}

export function getPanelNotificationPreferences(userEmail: string) {
  return request<import('@/lib/types').PanelNotificationPreferences>(
    `/panel/notification-preferences?user_email=${encodeURIComponent(userEmail)}`,
  );
}

export function updatePanelNotificationPreferences(payload: {
  user_email: string;
  email_enabled?: boolean;
  in_app_enabled?: boolean;
  analysis_reminders?: boolean;
  trial_reminders?: boolean;
  negative_review_alerts?: boolean;
  competitor_alerts?: boolean;
}) {
  return request<import('@/lib/types').PanelNotificationPreferences>('/panel/notification-preferences', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function listPanelFollowers(userEmail: string, limit = 100) {
  return request<import('@/lib/types').PanelFollowerListResponse>(
    `/panel/followers?user_email=${encodeURIComponent(userEmail)}&limit=${limit}`,
  );
}

export function listPanelFollowerPromotions(userEmail: string) {
  return request<import('@/lib/types').FollowerPromotion[]>(
    `/panel/follower-promotions?user_email=${encodeURIComponent(userEmail)}`,
  );
}

export function createPanelFollowerPromotion(payload: {
  user_email: string;
  title?: string;
  discount_percent: number;
  valid_days?: number;
  max_coupons?: number;
}) {
  return request<import('@/lib/types').FollowerPromotion>('/panel/follower-promotions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function redeemPanelFollowerCoupon(payload: { user_email: string; code: string }) {
  return request<import('@/lib/types').FollowerCouponRedeemResponse>('/panel/follower-coupons/redeem', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getRestaurantFollowerCoupon(restaurantId: string, userEmail: string) {
  const query = new URLSearchParams({ user_email: userEmail.trim().toLowerCase() });
  return request<import('@/lib/types').FollowerCoupon | null>(
    `/restaurants/${encodeURIComponent(restaurantId)}/follower-coupon?${query.toString()}`,
  );
}

export function getRestaurantFollowStatus(restaurantId: string) {
  return request<import('@/lib/types').RestaurantFollowStatus>(
    `/restaurants/${encodeURIComponent(restaurantId)}/follow-status`,
  );
}

export function followRestaurant(restaurantId: string, userEmail: string) {
  const query = new URLSearchParams({ user_email: userEmail.trim().toLowerCase() });
  return request<import('@/lib/types').RestaurantFollowStatus>(
    `/restaurants/${encodeURIComponent(restaurantId)}/follow?${query.toString()}`,
    { method: 'POST' },
  );
}

export function unfollowRestaurant(restaurantId: string, userEmail: string) {
  const query = new URLSearchParams({ user_email: userEmail.trim().toLowerCase() });
  return request<import('@/lib/types').RestaurantFollowStatus>(
    `/restaurants/${encodeURIComponent(restaurantId)}/follow?${query.toString()}`,
    { method: 'DELETE' },
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

export function getPanelContract() {
  return request<import('@/lib/types').PanelContractInfo>('/panel/applications/contract');
}

export async function submitBusinessApplication(form: FormData) {
  const response = await fetch(`${getApiV1Base()}/panel/applications`, {
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
  return response.json() as Promise<{ ok: boolean; application: import('@/lib/types').PanelApplication }>;
}
