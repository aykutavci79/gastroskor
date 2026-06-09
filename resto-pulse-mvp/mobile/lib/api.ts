import type {
  CompetitorAiReport,
  GoogleReviewLink,
  GourmetChatAnswer,
  GourmetChatMessage,
  GourmetChatMessageListResponse,
  GourmetTriviaLeaderboardResponse,
  GourmetChatQuestion,
  GourmetChatQuestionDetail,
  GourmetChatQuestionListResponse,
  GourmetChatRoomListResponse,
  GourmetChatTag,
  LivePlaceSearchResponse,
  LivePlaceDetails,
  PanelAccess,
  PanelDashboard,
  Restaurant,
  RestaurantListItem,
  RestaurantMenuItem,
  RestaurantPromoSettings,
  RestaurantFollowListResponse,
  RestaurantFollowStatus,
  RestaurantTrendingItem,
  RegionalProductDetailResponse,
  RegionalProductListResponse,
  Review,
  ReviewAnalyzeResult,
  ReviewReply,
  CheckInResult,
  CheckInStatus,
  DmInboxResponse,
  DmMessageItem,
  DmMessageListResponse,
  FriendListItem,
  FriendListResponse,
  FriendRequestItem,
  FriendRequestListResponse,
  PublicUserCard,
  UserProfile,
} from '@/lib/types';

import { getApiV1Base } from '@/lib/api-base';
import { createFetchTimeoutSignal } from '@/lib/fetch-timeout';
import { formatApiError } from '@/lib/format-api-error';
import { parseModerationDetail, ReviewModerationApiError } from '@/lib/review-moderation';

export { ReviewModerationApiError };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const hasBody = init?.body != null;
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${getApiV1Base()}${path}`, {
      ...init,
      headers: {
        ...(hasBody && !isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers ?? {}),
      },
      signal: createFetchTimeoutSignal(25_000, init?.signal ?? null),
    });
  } catch (err) {
    throw new Error(formatApiError(err));
  }

  if (!response.ok) {
    const text = await response.text();
    let message = text ? `${response.status}: ${text}` : `API error ${response.status}`;
    try {
      const parsed = JSON.parse(text) as {
        detail?: string | Array<{ msg?: string }> | Record<string, unknown>;
      };
      if (typeof parsed.detail === 'string') message = parsed.detail;
      else if (Array.isArray(parsed.detail) && parsed.detail.length > 0) {
        message = parsed.detail.map((row) => row.msg).filter(Boolean).join(' · ') || message;
      } else if (parsed.detail && typeof parsed.detail === 'object' && !Array.isArray(parsed.detail)) {
        const modErr = parseModerationDetail(parsed.detail);
        if (modErr) throw modErr;
        const detailObj = parsed.detail as { message?: string };
        if (typeof detailObj.message === 'string' && detailObj.message.trim()) {
          message = detailObj.message;
        }
      }
    } catch (err) {
      if (err instanceof ReviewModerationApiError) throw err;
    }
    throw new Error(formatApiError(new Error(message)));
  }

  if (response.status === 204) return undefined as T;
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

export function listRegionalProducts(params?: { city?: string }) {
  const search = new URLSearchParams();
  if (params?.city) search.set('city', params.city);
  const query = search.toString();
  return request<RegionalProductListResponse>(`/regional-flavors/products${query ? `?${query}` : ''}`);
}

export function getRegionalProduct(slug: string, params?: { city?: string }) {
  const search = new URLSearchParams();
  if (params?.city) search.set('city', params.city);
  const query = search.toString();
  return request<RegionalProductDetailResponse>(
    `/regional-flavors/products/${encodeURIComponent(slug)}${query ? `?${query}` : ''}`,
  );
}

export function getRestaurant(id: string) {
  return request<Restaurant>(`/restaurants/${id}`);
}

export function getCheckInStatus(restaurantId: string, userEmail?: string | null) {
  const query = userEmail?.trim()
    ? `?user_email=${encodeURIComponent(userEmail.trim().toLowerCase())}`
    : '';
  return request<CheckInStatus>(`/restaurants/${restaurantId}/check-in/status${query}`);
}

export function postCheckIn(
  restaurantId: string,
  payload: { user_email: string; latitude: number; longitude: number },
) {
  return request<CheckInResult>(`/restaurants/${restaurantId}/check-in`, {
    method: 'POST',
    body: JSON.stringify({
      user_email: payload.user_email.trim().toLowerCase(),
      latitude: payload.latitude,
      longitude: payload.longitude,
    }),
  });
}

export function getActiveRestaurantOrder(restaurantId: string, userEmail: string) {
  const query = `?user_email=${encodeURIComponent(userEmail.trim().toLowerCase())}`;
  return request<import('@/lib/types').RestaurantOrderActiveResponse>(
    `/restaurants/${restaurantId}/orders/active${query}`,
  );
}

export function submitRestaurantOrder(
  restaurantId: string,
  payload: {
    user_email: string;
    customer_phone: string;
    customer_address: string;
    note?: string;
    lines: Array<{ menu_item_id: string; quantity: number }>;
  },
) {
  return request<import('@/lib/types').RestaurantOrderRead>(`/restaurants/${restaurantId}/orders`, {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      user_email: payload.user_email.trim().toLowerCase(),
    }),
  });
}

export function getOrderPhoneStatus(userEmail: string) {
  const query = `?user_email=${encodeURIComponent(userEmail.trim().toLowerCase())}`;
  return request<import('@/lib/types').OrderPhoneStatus>(`/order-phone/status${query}`);
}

export function sendOrderPhoneOtp(userEmail: string, phone: string) {
  return request<import('@/lib/types').OrderPhoneSendOtpResponse>('/order-phone/send-otp', {
    method: 'POST',
    body: JSON.stringify({
      user_email: userEmail.trim().toLowerCase(),
      phone: phone.trim(),
    }),
  });
}

export function verifyOrderPhoneOtp(userEmail: string, phone: string, code: string) {
  return request<import('@/lib/types').OrderPhoneStatus>('/order-phone/verify-otp', {
    method: 'POST',
    body: JSON.stringify({
      user_email: userEmail.trim().toLowerCase(),
      phone: phone.trim(),
      code: code.trim(),
    }),
  });
}

export function listPanelOrders(userEmail: string, limit = 50) {
  const query = `?user_email=${encodeURIComponent(userEmail.trim().toLowerCase())}&limit=${limit}`;
  return request<{ items: import('@/lib/types').RestaurantOrderRead[] }>(`/panel/orders${query}`);
}

export function decidePanelOrder(
  orderId: string,
  payload: { user_email: string; decision: 'accepted' | 'rejected' },
) {
  return request<import('@/lib/types').RestaurantOrderRead>(`/panel/orders/${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      user_email: payload.user_email.trim().toLowerCase(),
      decision: payload.decision,
    }),
  });
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
  review_text?: string;
  author_email?: string | null;
  author_name?: string | null;
  author_name_display?: 'full' | 'masked';
}) {
  return request<Review>('/reviews', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      review_text: payload.review_text ?? '',
    }),
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
  record_login?: boolean;
  default_review_name_display?: 'full' | 'masked' | 'nickname';
}) {
  return request<UserProfile>('/users/sync', { method: 'POST', body: JSON.stringify(payload) });
}

export function verifyGoogleMobileAuth(idToken: string) {
  return request<{ profile: UserProfile }>('/auth/google/mobile', {
    method: 'POST',
    body: JSON.stringify({ id_token: idToken }),
  });
}

export function checkNickname(nickname: string, userEmail?: string | null) {
  const query = new URLSearchParams({ nickname: nickname.trim() });
  if (userEmail?.trim()) query.set('user_email', userEmail.trim().toLowerCase());
  return request<{ available: boolean; message?: string | null; highlights?: string[] }>(
    `/users/nickname/check?${query.toString()}`,
  );
}

export function updateGourmetProfile(payload: {
  user_email: string;
  nickname?: string;
  avatar_preset?: string;
  use_preset_avatar?: boolean;
  default_review_name_display?: 'full' | 'masked' | 'nickname';
}) {
  return request<UserProfile>('/users/gourmet-profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function uploadUserAvatar(
  userEmail: string,
  localUri: string,
  mimeType: string,
  fileName: string,
) {
  const form = new FormData();
  form.append('user_email', userEmail.trim().toLowerCase());
  form.append('file', { uri: localUri, type: mimeType, name: fileName } as unknown as Blob);
  let response: Response;
  try {
    response = await fetch(`${getApiV1Base()}/users/avatar`, {
      method: 'POST',
      body: form,
      signal: createFetchTimeoutSignal(60_000),
    });
  } catch (err) {
    throw new Error(formatApiError(err, 'Profil fotografi'));
  }
  if (!response.ok) {
    const text = await response.text();
    let message = text ? `${response.status}: ${text}` : `Upload failed ${response.status}`;
    try {
      const parsed = JSON.parse(text) as { detail?: string };
      if (typeof parsed.detail === 'string') message = parsed.detail;
    } catch {
      /* plain text */
    }
    throw new Error(formatApiError(new Error(message), 'Profil fotografi'));
  }
  return response.json() as Promise<UserProfile>;
}

export function listRestaurantFollows(userEmail: string, limit = 50) {
  const query = new URLSearchParams({
    user_email: userEmail.trim().toLowerCase(),
    limit: String(limit),
  });
  return request<RestaurantFollowListResponse>(`/me/restaurant-follows?${query.toString()}`);
}

export function getRestaurantFollowStatus(restaurantId: string, userEmail: string) {
  const query = new URLSearchParams({ user_email: userEmail.trim().toLowerCase() });
  return request<RestaurantFollowStatus>(
    `/restaurants/${encodeURIComponent(restaurantId)}/follow-status?${query.toString()}`,
  );
}

export function followRestaurant(restaurantId: string, userEmail: string) {
  const query = new URLSearchParams({ user_email: userEmail.trim().toLowerCase() });
  return request<RestaurantFollowStatus>(
    `/restaurants/${encodeURIComponent(restaurantId)}/follow?${query.toString()}`,
    { method: 'POST' },
  );
}

export function unfollowRestaurant(restaurantId: string, userEmail: string) {
  const query = new URLSearchParams({ user_email: userEmail.trim().toLowerCase() });
  return request<RestaurantFollowStatus>(
    `/restaurants/${encodeURIComponent(restaurantId)}/follow?${query.toString()}`,
    { method: 'DELETE' },
  );
}

export function registerPushToken(payload: {
  user_email: string;
  expo_push_token: string;
  platform?: string | null;
}) {
  return request<{ ok: boolean }>('/me/push-token', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function listUserNotifications(userEmail: string, limit = 40) {
  const query = new URLSearchParams({
    user_email: userEmail.trim().toLowerCase(),
    limit: String(limit),
  });
  return request<import('@/lib/types').UserNotificationListResponse>(
    `/me/notifications?${query.toString()}`,
  );
}

export function markUserNotificationRead(userEmail: string, notificationId: string) {
  const query = new URLSearchParams({ user_email: userEmail.trim().toLowerCase() });
  return request<{ ok: boolean }>(
    `/me/notifications/${encodeURIComponent(notificationId)}/read?${query.toString()}`,
    { method: 'POST' },
  );
}

export function listMyFollowerCoupons(userEmail: string, limit = 50) {
  const query = new URLSearchParams({
    user_email: userEmail.trim().toLowerCase(),
    limit: String(limit),
  });
  return request<import('@/lib/types').FollowerCoupon[]>(`/me/follower-coupons?${query.toString()}`);
}

export function getRestaurantFollowerCoupon(restaurantId: string, userEmail: string) {
  const query = new URLSearchParams({ user_email: userEmail.trim().toLowerCase() });
  return request<import('@/lib/types').FollowerCoupon | null>(
    `/restaurants/${encodeURIComponent(restaurantId)}/follower-coupon?${query.toString()}`,
  );
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

export function listGourmetChatTags() {
  return request<GourmetChatTag[]>('/gourmet-chat/tags');
}

export function listGourmetChatRooms(city: string) {
  const query = new URLSearchParams({ city: city.trim() || 'Bursa' });
  return request<GourmetChatRoomListResponse>(`/gourmet-chat/rooms?${query.toString()}`);
}

export function listGourmetChatMessages(roomSlug: string, city: string) {
  const query = new URLSearchParams({ city: city.trim() || 'Bursa' });
  return request<GourmetChatMessageListResponse>(
    `/gourmet-chat/rooms/${encodeURIComponent(roomSlug)}/messages?${query.toString()}`,
  );
}

export function listGourmetTriviaLeaderboard(roomSlug: string, city: string, limit = 5) {
  const query = new URLSearchParams({
    city: city.trim() || 'Bursa',
    limit: String(limit),
  });
  return request<GourmetTriviaLeaderboardResponse>(
    `/gourmet-chat/rooms/${encodeURIComponent(roomSlug)}/trivia/leaderboard?${query.toString()}`,
  );
}

export function createGourmetChatMessage(
  roomSlug: string,
  payload: { user_email: string; city: string; body: string },
) {
  return request<GourmetChatMessage>(`/gourmet-chat/rooms/${encodeURIComponent(roomSlug)}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function listGourmetChatQuestions(roomSlug: string, city: string) {
  const query = new URLSearchParams({ city: city.trim() || 'Bursa' });
  return request<GourmetChatQuestionListResponse>(
    `/gourmet-chat/rooms/${encodeURIComponent(roomSlug)}/questions?${query.toString()}`,
  );
}

export function getGourmetChatQuestion(questionId: string) {
  return request<GourmetChatQuestionDetail>(`/gourmet-chat/questions/${encodeURIComponent(questionId)}`);
}

export function createGourmetChatQuestion(
  roomSlug: string,
  payload: { user_email: string; city: string; tag: string; body: string },
) {
  return request<GourmetChatQuestion>(`/gourmet-chat/rooms/${encodeURIComponent(roomSlug)}/questions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createGourmetChatAnswer(questionId: string, payload: { user_email: string; body: string }) {
  return request<GourmetChatAnswer>(`/gourmet-chat/questions/${encodeURIComponent(questionId)}/answers`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getPublicUserByNickname(nickname: string, viewerEmail?: string) {
  const query = new URLSearchParams();
  if (viewerEmail?.trim()) query.set('viewer_email', viewerEmail.trim().toLowerCase());
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request<PublicUserCard>(
    `/social/users/${encodeURIComponent(nickname)}/public${suffix}`,
  );
}

export function listFriends(userEmail: string, limit = 100) {
  const query = new URLSearchParams({
    user_email: userEmail.trim().toLowerCase(),
    limit: String(limit),
  });
  return request<FriendListResponse>(`/social/me/friends?${query.toString()}`);
}

export function addFriend(userEmail: string, targetNickname: string) {
  return request<FriendRequestItem>('/social/me/friends', {
    method: 'POST',
    body: JSON.stringify({
      user_email: userEmail.trim().toLowerCase(),
      target_nickname: targetNickname,
    }),
  });
}

export function listFriendRequests(userEmail: string, limit = 50) {
  const query = new URLSearchParams({
    user_email: userEmail.trim().toLowerCase(),
    limit: String(limit),
  });
  return request<FriendRequestListResponse>(`/social/me/friend-requests?${query.toString()}`);
}

export function acceptFriendRequest(userEmail: string, requestId: string) {
  return request<FriendListItem>(`/social/me/friend-requests/${encodeURIComponent(requestId)}/accept`, {
    method: 'POST',
    body: JSON.stringify({ user_email: userEmail.trim().toLowerCase() }),
  });
}

export function rejectFriendRequest(userEmail: string, requestId: string) {
  return request<{ ok: boolean; status: string }>(
    `/social/me/friend-requests/${encodeURIComponent(requestId)}/reject`,
    {
      method: 'POST',
      body: JSON.stringify({ user_email: userEmail.trim().toLowerCase() }),
    },
  );
}

export function cancelFriendRequest(userEmail: string, targetNickname: string) {
  const query = new URLSearchParams({
    user_email: userEmail.trim().toLowerCase(),
    target_nickname: targetNickname,
  });
  return request<{ ok: boolean }>(`/social/me/friend-requests?${query.toString()}`, {
    method: 'DELETE',
  });
}

export function removeFriend(userEmail: string, targetNickname: string) {
  const query = new URLSearchParams({
    user_email: userEmail.trim().toLowerCase(),
    target_nickname: targetNickname,
  });
  return request<{ ok: boolean }>(`/social/me/friends?${query.toString()}`, {
    method: 'DELETE',
  });
}

export function listDmInbox(userEmail: string, limit = 50) {
  const query = new URLSearchParams({
    user_email: userEmail.trim().toLowerCase(),
    limit: String(limit),
  });
  return request<DmInboxResponse>(`/social/me/dm?${query.toString()}`);
}

export function startDmThread(userEmail: string, targetNickname: string) {
  return request<{ thread_id: string; peer: PublicUserCard }>('/social/me/dm/start', {
    method: 'POST',
    body: JSON.stringify({
      user_email: userEmail.trim().toLowerCase(),
      target_nickname: targetNickname,
    }),
  });
}

export function listDmMessages(userEmail: string, threadId: string, limit = 80) {
  const query = new URLSearchParams({
    user_email: userEmail.trim().toLowerCase(),
    limit: String(limit),
  });
  return request<DmMessageListResponse>(
    `/social/me/dm/${encodeURIComponent(threadId)}/messages?${query.toString()}`,
  );
}

export function sendDmMessage(userEmail: string, threadId: string, body: string) {
  return request<DmMessageItem>(
    `/social/me/dm/${encodeURIComponent(threadId)}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({
        user_email: userEmail.trim().toLowerCase(),
        body,
      }),
    },
  );
}

export function listPendingReviewRemedies(authorEmail: string) {
  return request<import('@/lib/types').ReviewRemedyPendingItem[]>(
    `/reviews/remedy/pending?author_email=${encodeURIComponent(authorEmail.trim().toLowerCase())}`,
  );
}

export function acceptReviewRemedyOffer(reviewId: string, authorEmail: string) {
  return request<{ review_id: string; publication_status: string; message: string }>(
    `/reviews/${encodeURIComponent(reviewId)}/remedy/accept`,
    {
      method: 'POST',
      body: JSON.stringify({ author_email: authorEmail.trim().toLowerCase() }),
    },
  );
}

export function rejectReviewRemedyOffer(reviewId: string, authorEmail: string) {
  return request<{ review_id: string; publication_status: string; message: string }>(
    `/reviews/${encodeURIComponent(reviewId)}/remedy/reject`,
    {
      method: 'POST',
      body: JSON.stringify({ author_email: authorEmail.trim().toLowerCase() }),
    },
  );
}

export function listPanelPendingReviewRemedies(userEmail: string) {
  return request<import('@/lib/types').ReviewRemedyPendingItem[]>(
    `/panel/reviews/remedy/pending?user_email=${encodeURIComponent(userEmail.trim().toLowerCase())}`,
  );
}

export function issuePanelReviewRemedyOffer(payload: {
  user_email: string;
  review_id: string;
  discount_percent: number;
  offer_message?: string;
}) {
  const { review_id, ...body } = payload;
  return request<import('@/lib/types').ReviewRemedyOfferSummary>(
    `/panel/reviews/${encodeURIComponent(review_id)}/remedy-offer`,
    {
      method: 'POST',
      body: JSON.stringify({
        ...body,
        user_email: body.user_email.trim().toLowerCase(),
      }),
    },
  );
}
