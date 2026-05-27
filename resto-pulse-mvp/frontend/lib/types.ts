export type GeoIndication = {
  product: string;
  region: string | null;
  registry_note: string | null;
};

export type ReviewCategory = {
  category: string;
  score: number | null;
  label: string | null;
  reason: string | null;
};

export type RestaurantListItem = {
  id: string;
  name: string;
  city: string | null;
  district: string | null;
  category: string | null;
  avg_rating: number | null;
  geo_indications: GeoIndication[];
  has_geographical_indication: boolean;
  gi_product_name: string | null;
};

export type Restaurant = RestaurantListItem & {
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  google_place_id: string | null;
  maps_directions_url: string | null;
  /** @deprecated maps_directions_url kullanin */
  maps_search_url: string | null;
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
  gastro_score: number;
  maps_directions_url: string | null;
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
  rating: number;
  review_text: string;
  sentiment_label: string | null;
  sentiment_score: number | null;
  ai_summary: string | null;
  is_demo: boolean;
  source_platform: string | null;
  categories: ReviewCategory[];
};

export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
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
