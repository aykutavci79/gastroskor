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
  is_active?: boolean;
  voice_product_slug?: string | null;
};

export type VoiceProductCatalogGroup = {
  search_group: string;
  search_label: string;
  products: {
    slug: string;
    label: string;
    aliases: string[];
    hint?: string | null;
    sort_order: number;
  }[];
};

export type VoiceMenuOfferingState = {
  slug: string;
  label: string;
  search_group: string;
  enabled: boolean;
  price_tl: number | null;
  menu_item_id: string | null;
};

export type RestaurantPromoPublic = {
  has_own_courier: boolean;
  direct_order_text?: string | null;
  direct_order_phone?: string | null;
  direct_order_whatsapp?: string | null;
  direct_order_url?: string | null;
  menu_image_url?: string | null;
  card_cover_image_url?: string | null;
  gallery_image_urls?: string[];
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
  card_emoji?: string | null;
  google_rating?: number | null;
  google_review_count?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  maps_directions_url?: string | null;
  distance_meters?: number | null;
  google_place_id?: string | null;
  google_photo_url?: string | null;
  seo_noindex?: boolean;
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

export type PanelFollower = {
  user_id: string;
  display_name: string | null;
  email_masked: string;
  followed_at: string;
  has_active_coupon: boolean;
  coupon_code: string | null;
  coupon_discount_percent: number | null;
};

export type PanelFollowerListResponse = {
  items: PanelFollower[];
  total: number;
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

export type FollowerCouponRedeemResponse = {
  ok: boolean;
  message: string;
  coupon: FollowerCoupon | null;
};

export type RestaurantOrderLineRead = {
  id: string;
  menu_item_id: string | null;
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
  customer_name: string | null;
  customer_address?: string | null;
  order_day?: string | null;
  daily_no?: number | null;
  order_number?: string | null;
  note: string | null;
  payment_method?: string | null;
  payment_method_label?: string | null;
  total_tl: number;
  lines: RestaurantOrderLineRead[];
  created_at: string | null;
  decided_at: string | null;
  reject_reason_code?: string | null;
  reject_reason_label?: string | null;
  reject_reason_text?: string | null;
  reject_message?: string | null;
};

export type OnlineOrderHours = {
  timezone: string;
  weekly: Record<string, { closed?: boolean; open?: string; close?: string }>;
};

export type RestaurantPromoSettings = {
  subscription_active: boolean;
  has_own_courier: boolean;
  online_orders_enabled: boolean;
  online_order_category_tags: string[];
  direct_order_text: string | null;
  direct_order_phone: string | null;
  direct_order_whatsapp: string | null;
  direct_order_url: string | null;
  menu_image_url: string | null;
  card_cover_image_url: string | null;
  instagram: string | null;
  card_emoji: string | null;
  online_order_hours?: OnlineOrderHours | null;
  accepted_payment_methods?: string[];
  custom_payment_label?: string | null;
  order_payment_options?: { code: string; label: string }[];
  online_reservations_enabled?: boolean;
  online_reservation_max_party_size?: number;
  public_preview: RestaurantPromoPublic | null;
};

export type ReservationVitrinChecklistItem = {
  code: string;
  label: string;
  passed: boolean;
  detail: string;
};

export type ReservationVitrinState = {
  status: string;
  listed: boolean;
  applied_at: string | null;
  decided_at: string | null;
  reject_reason: string | null;
  table_count: number;
  seat_capacity: number;
  can_apply: boolean;
  checklist: ReservationVitrinChecklistItem[];
};

export type ReservationVitrinApplication = {
  ownership_id: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_city: string | null;
  restaurant_category: string | null;
  owner_email: string;
  owner_name: string | null;
  google_place_id: string | null;
  status: string;
  online_reservations_enabled: boolean;
  table_count: number;
  seat_capacity: number;
  online_order_categories: string[];
  applied_at: string | null;
  decided_at: string | null;
  reject_reason: string | null;
  tester_seed: boolean;
};

export type FloorPlanTable = {
  id: string;
  zone: 'salon' | 'bahce' | 'teras';
  label: string;
  seats_min: number;
  seats_max: number;
  x: number;
  y: number;
  reservation_closed?: boolean;
};

export type FloorPlanPoi = {
  id: string;
  kind: 'entrance' | 'exit' | 'live_music' | 'bar' | 'other';
  label: string;
  zone?: 'salon' | 'bahce' | 'teras';
  x: number;
  y: number;
};

export type FloorPlanLayout = {
  version: number;
  tables: FloorPlanTable[];
  pois: FloorPlanPoi[];
};

export type FloorPlanRead = {
  restaurant_id: string;
  background_url: string | null;
  layout: FloorPlanLayout | null;
  published_at: string | null;
  has_published: boolean;
};

export type TableReservationRead = {
  id: string;
  restaurant_id: string;
  restaurant_name?: string | null;
  user_id: string;
  table_id: string;
  table_label: string;
  zone: string;
  zone_label: string;
  party_size: number;
  reserved_at: string;
  note?: string | null;
  occasion_type?: string | null;
  occasion_label?: string | null;
  customer_phone: string;
  customer_name?: string | null;
  status:
    | 'pending_restaurant'
    | 'approved_by_restaurant'
    | 'confirmed'
    | 'rejected'
    | 'cancelled'
    | 'expired';
  reject_reason_text?: string | null;
  created_at?: string | null;
  restaurant_decided_at?: string | null;
  customer_confirmed_at?: string | null;
  customer_confirm_expires_at?: string | null;
};

export type PanelResetPublicDataResponse = {
  orders_deleted: number;
  menu_items_deleted: number;
  hide_from_public: boolean;
  restaurant_name: string | null;
};

export type CityTopResponse = {
  city: string;
  items: RestaurantTrendingItem[];
  cached: boolean;
};

export type NewMemberRestaurantsResponse = {
  items: RestaurantListItem[];
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

export type RestaurantFollowStatus = {
  following: boolean;
  follower_count: number;
};

export type Restaurant = RestaurantListItem & {
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  google_place_id: string | null;
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
  google_photo_url?: string | null;
  restaurant_id?: string | null;
  is_premium_partner?: boolean;
  promo?: RestaurantPromoPublic | null;
  menu_preview?: RestaurantMenuItem[];
  menu_item_count?: number;
  card_emoji?: string | null;
  member_avg_rating?: number | null;
};

export type FeedbackStatus = 'open' | 'in_review' | 'resolved' | 'rejected';
export type FeedbackSeverity = 'low' | 'medium' | 'high';
export type FeedbackSenderType = 'user' | 'restaurant';

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

export type Review = {
  id: string;
  restaurant_id: string;
  author_id: string | null;
  author_email: string | null;
  author_name: string | null;
  author_avatar_url: string | null;
  author_name_display?: 'full' | 'masked' | 'nickname';
  rating: number;
  review_text: string;
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

export type ReviewReply = {
  id: string;
  review_id: string;
  author_id: string | null;
  author_email: string | null;
  author_name: string | null;
  author_avatar_url: string | null;
  reply_text: string;
  created_at?: string | null;
  updated_at?: string | null;
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
  contract_required?: boolean;
  contract_signed_received?: boolean;
  contract_blocked?: boolean;
  panel_block_reason?: string | null;
};

export type PanelContractInfo = {
  version: string;
  title: string;
  updated: string;
  text: string;
  postal_address: string;
  support_email: string;
};

export type PanelApplication = {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  business_name: string;
  contact_name: string;
  panel_email: string;
  phone: string;
  address: string;
  city: string;
  website: string | null;
  google_place_id: string | null;
  google_place_name: string | null;
  contract_version: string;
  contract_accepted_at: string | null;
  contract_postal_promised: boolean;
  applicant_notes: string | null;
  admin_notes: string | null;
  reviewed_at: string | null;
  reviewed_by_email: string | null;
  ownership_id: string | null;
  created_at: string | null;
};

export type PanelNotification = {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  cta_label: string | null;
  cta_url: string | null;
  email_status: string;
  opened_at: string | null;
  clicked_at: string | null;
  created_at: string | null;
  metadata: Record<string, unknown>;
};

export type PanelNotificationsResponse = {
  items: PanelNotification[];
  unread_count: number;
};

export type PanelNotificationPreferences = {
  email_enabled: boolean;
  in_app_enabled: boolean;
  analysis_reminders: boolean;
  trial_reminders: boolean;
  negative_review_alerts: boolean;
  competitor_alerts: boolean;
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
  ai_reports: StoredAiReport[];
  google_business: GoogleBusinessStatus;
};

export type GoogleBusinessStatus = {
  connected: boolean;
  google_email: string | null;
  location_title: string | null;
  matched_place_id: string | null;
  last_sync_at: string | null;
  last_review_count: number | null;
  last_error: string | null;
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

export type StoredAiInsight = {
  category: string;
  summary: string;
  praised_products?: string[];
};

export type StoredAiReport = {
  id: string;
  report_source: 'competitor' | 'google_business' | string;
  competitor_id: string | null;
  competitor_name: string;
  comparison_summary: string;
  your_strengths: StoredAiInsight[];
  your_gaps: StoredAiInsight[];
  competitor_strengths: StoredAiInsight[];
  reviews_used: { own: number; competitor: number } | null;
  reviews_total: number | null;
  created_at: string | null;
};

export type AiReportTrend = {
  available: boolean;
  report_count: number;
  period_from?: string;
  period_to?: string;
  summary?: string;
  improvements?: StoredAiInsight[];
  new_concerns?: StoredAiInsight[];
  model?: string;
  message?: string;
  disclaimer?: string;
};
