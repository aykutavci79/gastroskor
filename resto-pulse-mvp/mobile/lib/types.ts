export type GeoIndication = {
  product: string;
  region: string | null;
  registry_note: string | null;
};

export type RegionalProductItem = {
  slug: string;
  name: string;
  city: string;
  region: string;
  summary: string;
  registry_source: string;
  turkpatent_id: string;
  registration_year: number;
  indication_type: string;
  product_group: string;
  detail_url: string;
  image_url: string | null;
  live_search_query: string;
};

export type RegionalProductListResponse = {
  city: string;
  items: RegionalProductItem[];
  registry_note: string;
};

export type RegionalProductDetailResponse = {
  product: RegionalProductItem;
  discovery_note: string;
};

export type RegionalProductDiscoverResponse = {
  product: RegionalProductItem;
  discovery_note: string;
  search_query: string;
  places: LivePlaceSearchItem[];
  places_count: number;
  places_error?: string | null;
};

export type ReviewCategory = {
  category: string;
  score: number | null;
  label: string | null;
  reason: string | null;
};

export type RestaurantMenuItem = {
  id: string;
  name: string;
  price_tl: number;
  description?: string | null;
  category?: string | null;
  sort_order?: number;
  image_url?: string | null;
  voice_product_slug?: string | null;
};

export type VoiceMenuMatch = {
  voice_product_slug: string;
  label: string;
  price_tl: number;
  menu_item_id: string;
};

export type RestaurantOrderLineRead = {
  id: string;
  menu_item_id?: string | null;
  name: string;
  price_tl: number;
  quantity: number;
  line_total_tl: number;
};

export type RestaurantOrderRead = {
  id: string;
  restaurant_id: string;
  restaurant_name?: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  customer_phone: string;
  customer_name?: string | null;
  customer_address?: string | null;
  order_day?: string | null;
  daily_no?: number | null;
  order_number?: string | null;
  note?: string | null;
  total_tl: number;
  lines: RestaurantOrderLineRead[];
  created_at?: string | null;
  decided_at?: string | null;
  reject_reason_code?: string | null;
  reject_reason_label?: string | null;
  reject_reason_text?: string | null;
  reject_message?: string | null;
  has_review?: boolean;
  can_review?: boolean;
  review_id?: string | null;
};

export type OrderPhoneStatus = {
  verified: boolean;
  phone_e164?: string | null;
  phone_masked?: string | null;
  verified_at?: string | null;
};

export type OrderPhoneSendOtpResponse = {
  sent: boolean;
  auto_verified?: boolean;
  phone_masked: string;
  expires_in_minutes: number;
  delivery_mode?: 'mock' | 'apitest' | 'live' | 'test_bypass' | string;
  info_message?: string | null;
  order_phone?: OrderPhoneStatus | null;
};

export type RestaurantOrderActiveResponse = {
  online_orders_available: boolean;
  pending_order: RestaurantOrderRead | null;
  recent_rejected_order?: RestaurantOrderRead | null;
  order_phone?: OrderPhoneStatus | null;
};

export type UserOrderListResponse = {
  items: RestaurantOrderRead[];
  pending_count: number;
  total: number;
};

export type OrderRatingSummary = {
  lezzet_avg: number | null;
  servis_avg: number | null;
  kurye_avg: number | null;
  review_count: number;
};

export type RestaurantPromoPublic = {
  has_own_courier: boolean;
  online_orders_enabled?: boolean;
  direct_order_text?: string | null;
  direct_order_phone?: string | null;
  direct_order_whatsapp?: string | null;
  direct_order_url?: string | null;
  menu_image_url?: string | null;
  card_cover_image_url?: string | null;
  instagram_url?: string | null;
};

export type RestaurantListItem = {
  id: string;
  /** Google trend satirinda GastroSkor kayit UUID (varsa) */
  restaurant_id?: string | null;
  name: string;
  city: string | null;
  district: string | null;
  category: string | null;
  avg_rating: number | null;
  geo_indications: GeoIndication[];
  has_geographical_indication: boolean;
  gi_product_name: string | null;
  promo?: RestaurantPromoPublic | null;
  is_premium_partner?: boolean;
  menu_preview?: RestaurantMenuItem[];
  menu_item_count?: number;
  google_rating?: number | null;
  google_review_count?: number | null;
  google_user_ratings_total?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  maps_directions_url?: string | null;
  distance_meters?: number | null;
  google_place_id?: string | null;
  google_photo_url?: string | null;
  check_in_visitor_count?: number;
  online_orders_available?: boolean;
  online_order_categories?: string[];
  gastro_score?: number | null;
  distance_score?: number | null;
  rating_score?: number | null;
  popularity_score?: number | null;
  voice_menu_matches?: VoiceMenuMatch[];
  voice_search_token?: string | null;
  order_ratings?: OrderRatingSummary | null;
};

export type OnlineOrderCategoryOption = {
  slug: string;
  label: string;
};

export type OnlineOrderOpenListResponse = {
  items: RestaurantListItem[];
  categories: OnlineOrderCategoryOption[];
  voice_search_token?: string | null;
  voice_product_slugs?: string[];
};

export type RestaurantFollowStatus = {
  following: boolean;
  follower_count: number;
};

export type RestaurantFollowListResponse = {
  items: RestaurantListItem[];
  total: number;
};

export type FollowerPromotion = {
  id: string;
  restaurant_id: string;
  title: string;
  discount_percent: number;
  valid_until: string;
  max_coupons: number;
  issued_count: number;
  redeemed_count: number;
  status: string;
  created_at: string;
};

export type UserNotification = {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
  metadata: {
    restaurant_id?: string;
    review_id?: string;
    reply_id?: string;
    coupon_code?: string;
    open_path?: string;
    discount_percent?: number;
    is_restaurant_owner?: boolean;
  };
};

export type UserNotificationListResponse = {
  items: UserNotification[];
  unread_count: number;
};

export type FollowerCoupon = {
  id: string;
  promotion_id: string;
  restaurant_id: string;
  restaurant_name?: string | null;
  code: string;
  discount_percent: number;
  status: string;
  expires_at: string;
  redeemed_at?: string | null;
  title?: string | null;
};

export type RestaurantPromoSettings = {
  subscription_active: boolean;
  has_own_courier: boolean;
  direct_order_text: string | null;
  direct_order_phone: string | null;
  direct_order_whatsapp: string | null;
  direct_order_url: string | null;
  menu_image_url: string | null;
  instagram: string | null;
  public_preview: RestaurantPromoPublic | null;
};

export type RestaurantTrendingItem = RestaurantListItem & {
  latitude: number | null;
  longitude: number | null;
  week_review_count: number;
  week_avg_rating: number | null;
  distance_meters: number | null;
  distance_km: number | null;
  distance_origin: 'user' | 'city_center';
  is_fallback: boolean;
  source?: 'google' | 'gastroskor';
  google_place_id?: string | null;
  google_user_ratings_total?: number | null;
  maps_directions_url?: string | null;
};

export type Restaurant = RestaurantListItem & {
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  google_place_id: string | null;
  google_rating?: number | null;
  maps_directions_url: string | null;
  /** @deprecated maps_directions_url kullanin */
  maps_search_url: string | null;
  menu?: RestaurantMenuItem[];
};

export type ParsedSearchIntent = {
  raw_query: string;
  query: string;
  min_rating: number | null;
  max_distance_m: number | null;
  min_distance_m: number | null;
  removed_tokens: string[];
};

export type LivePlaceSearchResponse = {
  items: LivePlaceSearchItem[];
  parsed: ParsedSearchIntent;
  filters_applied: Record<string, string | number | null>;
};

export type SocialProofSourceSummary = {
  reddit: number;
  x: number;
  youtube: number;
  community: number;
};

export type SocialProofVenueResult = {
  place_id: string;
  name: string;
  n_total: number;
  n_positive: number;
  wilson: number;
  badge: string;
  final_score: number;
  sources_summary: SocialProofSourceSummary;
};

export type SocialProofStatus = {
  status: string;
  stale?: boolean;
  can_scan?: boolean;
  scan_label?: string | null;
  job_id?: string | null;
  poll_url?: string | null;
  progress_pct?: number | null;
  results?: SocialProofVenueResult[];
};

export type DiscoverSearchResponse = {
  places: LivePlaceSearchItem[];
  social: SocialProofStatus;
};

export type SocialProofJobResponse = {
  job_id: string;
  status: string;
  progress_pct: number;
  social: SocialProofStatus;
};

export type LivePlaceSearchItem = {
  place_id: string;
  name: string;
  address: string | null;
  rating: number | null;
  user_ratings_total: number | null;
  latitude: number | null;
  longitude: number | null;
  distance_meters: number | null;
  distance_origin: 'user' | 'city_center';
  distance_score: number;
  rating_score: number;
  popularity_score?: number;
  gastro_score: number;
  maps_directions_url: string | null;
  restaurant_id?: string | null;
  is_premium_partner?: boolean;
  promo?: RestaurantPromoPublic | null;
  menu_preview?: RestaurantMenuItem[];
  menu_item_count?: number;
  member_avg_rating?: number | null;
  google_photo_url?: string | null;
  check_in_visitor_count?: number;
};

export type CheckInStatus = {
  visitor_count: number;
  checked_in_today: boolean;
  last_check_in_at: string | null;
};

export type CheckInResult = {
  check_in_id: string;
  created_at: string;
  visitor_count: number;
};

export type FeedbackStatus = 'open' | 'in_review' | 'resolved' | 'rejected';
export type FeedbackSeverity = 'low' | 'medium' | 'high';
export type FeedbackSenderType = 'user' | 'restaurant';

export type PrivateFeedback = {
  id: string;
  place_id: string;
  restaurant_id: string | null;
  author_id: string;
  category: string;
  severity: FeedbackSeverity;
  visit_at: string | null;
  message: string;
  status: FeedbackStatus;
  created_at: string;
  updated_at: string;
};

export type FeedbackMessage = {
  id: string;
  feedback_id: string;
  sender_type: FeedbackSenderType;
  message: string;
  attachments_json: Record<string, unknown> | null;
  created_at: string;
};

export type CompensationCoupon = {
  id: string;
  feedback_id: string;
  restaurant_id: string;
  user_id: string;
  discount_percent: number;
  code: string;
  expires_at: string;
  status: string;
  created_at: string;
};

export type PrivateFeedbackDetail = {
  feedback: PrivateFeedback;
  messages: FeedbackMessage[];
  latest_coupon: CompensationCoupon | null;
};

export type LivePlaceReview = {
  author_name: string | null;
  rating: number | null;
  relative_time_description: string | null;
  text: string | null;
  profile_photo_url: string | null;
};

export type OpeningHours = {
  open_now: boolean | null;
  weekday_text: string[] | null;
};

export type PlaceAnalysis = {
  summary: string;
  overall_sentiment: string;
  overall_score: number;
  categories: ReviewCategory[];
};

export type ReviewSortOption = 'newest' | 'oldest' | 'highest_rating' | 'lowest_rating';
export type ReviewFilterOption = 'all' | 'negative';

export type MemberReview = {
  id: string;
  author_name: string | null;
  author_avatar_url: string | null;
  author_avatar_preset?: string | null;
  rating: number;
  review_text: string;
  sentiment_label: string | null;
  sentiment_score: number | null;
};

export type LivePlaceDetails = {
  place_id: string;
  restaurant_id: string | null;
  name: string;
  address: string | null;
  rating: number | null;
  user_ratings_total: number | null;
  phone_number: string | null;
  website: string | null;
  opening_hours: OpeningHours | null;
  reviews: LivePlaceReview[];
  member_reviews: MemberReview[];
  member_review_count: number;
  member_avg_rating: number | null;
  maps_directions_url: string | null;
  maps_search_url: string | null;
  photo_urls?: string[];
  analysis: PlaceAnalysis | null;
};

export type ReviewFilterState = {
  sort: ReviewSortOption;
  filter: ReviewFilterOption;
};

export type ReviewReply = {
  id: string;
  review_id: string;
  author_id: string | null;
  author_email: string | null;
  author_name: string | null;
  author_avatar_url: string | null;
  author_avatar_preset?: string | null;
  reply_text: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ReviewRemedyOfferSummary = {
  id: string;
  discount_percent: number;
  code: string;
  coupon_expires_at: string;
  customer_deadline_at: string;
  status: string;
  offer_message?: string | null;
};

export type ReviewRemedyPendingItem = {
  review_id: string;
  restaurant_id: string;
  restaurant_name?: string | null;
  rating: number;
  review_text: string;
  publication_status: string;
  remedy_restaurant_deadline_at?: string | null;
  offer?: ReviewRemedyOfferSummary | null;
  accept_disclaimer: string;
  reject_disclaimer: string;
};

export type Review = {
  id: string;
  restaurant_id: string;
  review_kind?: 'visit' | 'online_order';
  restaurant_order_id?: string | null;
  author_id: string | null;
  author_email: string | null;
  author_name: string | null;
  author_avatar_url: string | null;
  author_avatar_preset?: string | null;
  author_name_display?: 'full' | 'masked' | 'nickname';
  rating: number;
  review_text: string;
  publication_status?: string | null;
  remedy_offer?: ReviewRemedyOfferSummary | null;
  sentiment_label: string | null;
  sentiment_score: number | null;
  ai_summary: string | null;
  is_demo: boolean;
  source_platform: string | null;
  categories: ReviewCategory[];
  created_at?: string | null;
  updated_at?: string | null;
  image_urls?: string[];
  helpful_count?: number;
  viewer_marked_helpful?: boolean;
  viewer_can_edit?: boolean;
  replies?: ReviewReply[];
};

export type DisplayReview = Review;

export type MyReview = Review & {
  restaurant_name: string;
};

export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  avatar_preset?: string | null;
  nickname?: string | null;
  needs_nickname_setup?: boolean;
  default_review_name_display?: 'full' | 'masked' | 'nickname';
  gastro_score: number | null;
  review_count: number;
  google_sub?: string | null;
};

export type ReviewAnalyzeResult = {
  review_id: string;
  sentiment_label: string;
  sentiment_score: number;
  summary: string;
  categories: ReviewCategory[];
};

export type GoogleReviewLink = {
  restaurant_id: string;
  platform: string;
  place_id: string;
  google_review_url: string;
  maps_directions_url: string | null;
  maps_search_url: string | null;
};

export const CATEGORY_LABELS: Record<string, string> = {
  lezzet: 'Lezzet',
  servis: 'Servis',
  fiyat: 'Fiyat',
  hijyen: 'Hijyen',
};

export type PanelAccess = {
  has_ownership: boolean;
  can_access_panel: boolean;
  panel_tier: 'limited' | 'full' | null;
  verification_status: string | null;
  subscription_status: string | null;
  trial_days_left: number | null;
  competitor_limit: number;
  can_write_actions: boolean;
  pricing_next: string | null;
  ownership_id: string | null;
  restaurant_id: string | null;
  restaurant_name: string | null;
  google_place_id: string | null;
  pending_visit: boolean;
};

export type AiAnalysisQuota = {
  can_run: boolean;
  scheduled_available: boolean;
  extra_credits: number;
  will_use_extra_credit: boolean;
  interval_days: number;
  plan_key: string;
  plan_label: string;
  last_analysis_at: string | null;
  next_analysis_at: string | null;
  days_until_next: number | null;
  message: string;
};

export type AiPricingOffer = {
  sku: string;
  title: string;
  description: string;
  price_tl: number;
  billing: 'one_time' | 'monthly_addon';
  interval_days?: number | null;
  plan_key?: string | null;
};

export type AiPricingCatalog = {
  base_panel: {
    intro_month_tl: number;
    monthly_tl: number;
    trial_days: number;
    standard_ai_interval_days: number;
  };
  offers: AiPricingOffer[];
  payments_mock_enabled: boolean;
};

export type PanelDashboard = {
  access: PanelAccess;
  restaurant: { id: string; name: string | null; google_place_id: string };
  summary: {
    open_feedback_count: number;
    maps_clicks_week: number;
    profile_views_week: number;
    search_impressions_week: number;
    maps_clicks_day: number;
    maps_clicks_month: number;
    online_orders_accepted_total: number;
    online_orders_accepted_180_days: number;
  };
  ratings: {
    google_rating: number | null;
    google_review_count: number | null;
    gastro_avg_rating: number | null;
    gastro_review_count: number;
  };
  competitors: Array<{
    id: string;
    google_place_id: string;
    name: string;
    rating: number | null;
    review_count: number | null;
  }>;
  ai_insight: string;
  ai_quota: AiAnalysisQuota;
  ai_pricing: AiPricingCatalog;
  ai_reports?: StoredAiReport[];
};

export type StoredAiReport = {
  id: string;
  competitor_id: string | null;
  competitor_name: string;
  comparison_summary: string;
  your_strengths: Array<{ category: string; summary: string; praised_products?: string[] }>;
  your_gaps: Array<{ category: string; summary: string; praised_products?: string[] }>;
  competitor_strengths: Array<{ category: string; summary: string; praised_products?: string[] }>;
  reviews_used: { own: number; competitor: number } | null;
  created_at: string | null;
};

export type AiReportTrend = {
  available: boolean;
  report_count: number;
  period_from?: string;
  period_to?: string;
  summary?: string;
  improvements?: Array<{ category: string; summary: string }>;
  new_concerns?: Array<{ category: string; summary: string }>;
  message?: string;
};

export type CompetitorInsight = {
  category: string;
  summary: string;
  evidence_quotes: string[];
  praised_products?: string[];
};

export type CompetitorAiReport = {
  competitor_name: string;
  own_name: string;
  max_review_age_days: number;
  reviews_used: { own: number; competitor: number };
  competitor_strengths: CompetitorInsight[];
  your_strengths: CompetitorInsight[];
  your_gaps: CompetitorInsight[];
  comparison_summary: string;
  models_used: string[];
  warnings: string[];
  disclaimer: string;
  saved_report_id?: string;
};

export type GourmetChatAuthor = {
  nickname: string;
  avatar_url?: string | null;
  avatar_preset?: string | null;
  is_assistant?: boolean;
};

export type GourmetChatTag = {
  id: string;
  label: string;
};

export type GourmetChatRoom = {
  slug: string;
  title: string;
  description: string;
  emoji: string;
  sort_order: number;
  allow_restaurant_cards: boolean;
  message_count: number;
};

export type GourmetChatRoomListResponse = {
  city: string;
  items: GourmetChatRoom[];
};

export type GourmetChatAnswer = {
  id: string;
  body: string;
  author: GourmetChatAuthor;
  created_at: string;
};

export type GourmetChatQuestion = {
  id: string;
  room_slug: string;
  city: string;
  tag: string;
  body: string;
  answer_count: number;
  author: GourmetChatAuthor;
  created_at: string;
  preview_answers?: GourmetChatAnswer[];
};

export type GourmetChatQuestionListResponse = {
  city: string;
  room_slug: string;
  items: GourmetChatQuestion[];
};

export type GourmetChatQuestionDetail = GourmetChatQuestion & {
  answers: GourmetChatAnswer[];
};

export type GourmetChatMessage = {
  id: string;
  room_slug: string;
  city: string;
  body: string;
  author: GourmetChatAuthor;
  mentions: string[];
  created_at: string;
};

export type GourmetChatMessageListResponse = {
  city: string;
  room_slug: string;
  items: GourmetChatMessage[];
};

export type GourmetTriviaLeaderboardItem = {
  nickname: string;
  correct_count: number;
  last_correct_at?: string | null;
};

export type GourmetTriviaLeaderboardResponse = {
  city: string;
  room_slug: string;
  items: GourmetTriviaLeaderboardItem[];
};

export type PublicUserCard = {
  id: string;
  nickname: string;
  avatar_url?: string | null;
  avatar_preset?: string | null;
  gastro_score?: number | null;
  review_count: number;
  is_friend: boolean;
  friend_request_status?: string | null;
  friend_request_id?: string | null;
  cooldown_until?: string | null;
};

export type FriendRequestItem = {
  id: string;
  direction: 'incoming' | 'outgoing';
  status: string;
  created_at: string;
  responded_at?: string | null;
  cooldown_until?: string | null;
  peer: PublicUserCard;
};

export type FriendRequestListResponse = {
  incoming: FriendRequestItem[];
  outgoing: FriendRequestItem[];
  total_pending: number;
};

export type FriendListItem = PublicUserCard & {
  friendship_id: string;
  friends_since: string;
};

export type FriendListResponse = {
  items: FriendListItem[];
  total: number;
};

export type DmThreadSummary = {
  id: string;
  peer: PublicUserCard;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count: number;
};

export type DmInboxResponse = {
  items: DmThreadSummary[];
  total: number;
  unread_total: number;
};

export type DmMessageItem = {
  id: string;
  body: string;
  sender_id: string;
  is_own: boolean;
  created_at: string;
};

export type DmMessageListResponse = {
  thread_id: string;
  peer: PublicUserCard;
  items: DmMessageItem[];
};

export type EglenceLeaderboardEntry = {
  rank: number;
  user: PublicUserCard;
  elapsed_ms?: number | null;
  score?: number | null;
  is_me: boolean;
};

export type EglenceLeaderboardResponse = {
  game: 'mini_sudoku' | 'kelime_yarismasi';
  period_key: string;
  items: EglenceLeaderboardEntry[];
};

export type JetonWalletSummary = {
  balance: number;
  today_earned: number;
  today_cap_remaining: number;
  hint_cost: number;
  free_hints_per_game: number;
  follow_today_count?: number;
  follow_bundle_threshold?: number;
  follow_bundle_granted_today?: boolean;
  daily_login_granted_today?: boolean;
};

export type DailyLoginClaimResponse = {
  ok: boolean;
  balance: number;
  amount: number;
  reason?: string | null;
};

export type JetonLedgerItem = {
  id: string;
  source: string;
  source_id?: string | null;
  amount: number;
  status: string;
  created_at: string;
};

export type JetonLedgerListResponse = {
  items: JetonLedgerItem[];
  total: number;
};

export type GameHintSpendResponse = {
  ok: boolean;
  balance: number;
  charged: number;
  reason?: string | null;
};
