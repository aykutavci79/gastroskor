import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardAvoidingView } from '@/components/ui/AppKeyboardAvoidingView';

import { FollowerCouponBox } from '@/components/FollowerCouponBox';
import { RestaurantFollowButton } from '@/components/RestaurantFollowButton';
import { RestaurantShareButton } from '@/components/RestaurantShareButton';
import { GsReviewCard } from '@/components/GsReviewCard';
import { GoogleReviewsModal } from '@/components/GoogleReviewsModal';
import { PlaceDetailInfo } from '@/components/PlaceDetailInfo';
import { OnlineOrderSection } from '@/components/OnlineOrderSection';
import { RestaurantMenuBlock } from '@/components/RestaurantMenuBlock';
import { RestaurantPhotoCarousel } from '@/components/RestaurantPhotoCarousel';
import { ReviewNameDisplayPicker } from '@/components/ReviewNameDisplayPicker';
import { ReviewPhotoPicker, type ReviewPhotoAsset } from '@/components/ReviewPhotoPicker';
import { ReviewTextHighlight } from '@/components/ReviewTextHighlight';
import { StarRatingPicker } from '@/components/StarRatingPicker';
import { GastroColors } from '@/constants/theme';
import { useSession } from '@/context/session-context';
import { useKeyboardFieldFocus } from '@/hooks/use-keyboard-field-focus';
import {
  createReview,
  getCheckInStatus,
  getLivePlaceDetails,
  getRestaurant,
  listRestaurantReviews,
  moderateReviewText,
  postCheckIn,
  uploadReviewImage,
} from '@/lib/api';
import { ReviewModerationApiError } from '@/lib/api';
import { resolveCategoryVisual } from '@/lib/restaurant-category-visual';
import { hasPublicMenu } from '@/lib/restaurant-menu';
import { averageGsRating, isOwnReview, renderStarRow, sortReviewsWithViewerFirst } from '@/lib/review-display';
import { estimateTravelMinutes, haversineMeters } from '@/lib/travel-estimate';
import type { AuthorNameDisplayMode } from '@/lib/display-name';
import { coerceNumber, formatNumber } from '@/lib/coerce-number';
import { googleCardPhotosEnabled } from '@/lib/google-card-photos';
import { ensureAccessToken } from '@/lib/auth-token';
import { useScreenKeyboardOffset } from '@/lib/keyboard-layout';
import { REVIEW_NAME_DISPLAY_STORAGE_KEY } from '@/lib/display-name';
import { isUuid, parseLiveScoreParams } from '@/lib/uuid';
import type { CheckInStatus, DisplayReview, LivePlaceDetails, LivePlaceReview, Restaurant } from '@/lib/types';

export default function RestaurantDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string | string[] | undefined>>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const focus = Array.isArray(params.focus) ? params.focus[0] : params.focus;
  const { user, loading: sessionLoading } = useSession();
  const gastroScores = useMemo(() => parseLiveScoreParams(params), [params]);

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [liveDetails, setLiveDetails] = useState<LivePlaceDetails | null>(null);
  const [visitReviews, setVisitReviews] = useState<DisplayReview[]>([]);
  const [orderReviews, setOrderReviews] = useState<DisplayReview[]>([]);
  const [reviewKind, setReviewKind] = useState<'visit' | 'online_order'>('visit');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [googleRating, setGoogleRating] = useState<number | null>(null);
  const [googleReviewCount, setGoogleReviewCount] = useState<number | null>(null);
  const [googleReviews, setGoogleReviews] = useState<LivePlaceReview[]>([]);
  const [googleReviewsVisible, setGoogleReviewsVisible] = useState(false);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<ReviewPhotoAsset[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [moderationHighlights, setModerationHighlights] = useState<string[]>([]);
  const [nameDisplay, setNameDisplay] = useState<AuthorNameDisplayMode>('full');
  const [following, setFollowing] = useState(false);
  const [checkInStatus, setCheckInStatus] = useState<CheckInStatus | null>(null);
  const [checkInBusy, setCheckInBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const onFieldFocus = useKeyboardFieldFocus(scrollRef);
  const keyboardOffset = useScreenKeyboardOffset();
  const reviewFormOffsetY = useRef(0);
  const reviewFormBottomY = useRef(0);
  const menuOffsetY = useRef(0);
  const reviewsSectionY = useRef(0);
  const reviewCardY = useRef<Record<string, number>>({});
  const pendingMenuFocus = useRef(focus === 'menu');

  const scrollToY = useCallback(
    (targetY: number, capBottomY?: number) => {
      onFieldFocus(targetY, { extraGap: 48, capBottomY });
    },
    [onFieldFocus],
  );

  const scrollToOrderField = useCallback(
    (offsetInSection: number) => {
      scrollToY(menuOffsetY.current + offsetInSection);
    },
    [scrollToY],
  );

  useEffect(() => {
    AsyncStorage.getItem(REVIEW_NAME_DISPLAY_STORAGE_KEY)
      .then((raw) => {
        if (raw === 'masked' || raw === 'full') setNameDisplay(raw);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed.length < 5) {
      setModerationHighlights([]);
      return;
    }
    const timer = setTimeout(() => {
      void moderateReviewText(trimmed)
        .then((result) => {
          setModerationHighlights(result.allowed ? [] : result.highlights ?? []);
        })
        .catch(() => undefined);
    }, 450);
    return () => clearTimeout(timer);
  }, [text]);

  useEffect(() => {
    if (!id) {
      setError('Geçersiz restoran bağlantısı.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setLiveDetails(null);

    function applyLiveSnapshot(live: LivePlaceDetails) {
      setLiveDetails(live);
      setGoogleRating(coerceNumber(live.rating));
      setGoogleReviewCount(coerceNumber(live.user_ratings_total));
      setGoogleReviews(live.reviews ?? []);
    }

    async function applyDistance(restaurantData: Restaurant) {
      if (restaurantData.latitude == null || restaurantData.longitude == null) return;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({});
        if (!cancelled) {
          setDistanceMeters(
            haversineMeters(
              pos.coords.latitude,
              pos.coords.longitude,
              restaurantData.latitude,
              restaurantData.longitude,
            ),
          );
        }
      } catch {
        // mesafe opsiyonel
      }
    }

    (async () => {
      try {
        let restaurantId = id;
        let googlePlaceId: string | null = isUuid(id) ? null : id;

        if (!isUuid(id)) {
          const live = await getLivePlaceDetails(id);
          if (cancelled) return;
          applyLiveSnapshot(live);
          if (!live.restaurant_id) {
            setError('Restoran kaydı oluşturulamadı.');
            setRestaurant(null);
            return;
          }
          restaurantId = live.restaurant_id;
          googlePlaceId = live.place_id ?? id;

          const [restaurantData, visitReviewData, orderReviewData] = await Promise.all([
            getRestaurant(restaurantId),
            listRestaurantReviews(restaurantId, user?.email, { kind: 'visit' }),
            listRestaurantReviews(restaurantId, user?.email, { kind: 'online_order' }),
          ]);
          if (cancelled) return;

          const gallery: string[] = [];
          const cover =
            restaurantData.promo?.card_cover_image_url?.trim() ||
            restaurantData.promo?.menu_image_url?.trim();
          if (cover) gallery.push(cover);
          if (googleCardPhotosEnabled()) {
            for (const url of live.photo_urls ?? []) {
              if (!gallery.includes(url)) gallery.push(url);
            }
          }

          setRestaurant({
            ...restaurantData,
            maps_directions_url:
              restaurantData.maps_directions_url?.trim() || live.maps_directions_url || null,
          });
          setVisitReviews(sortReviewsWithViewerFirst(visitReviewData, user?.email, user?.id));
          setOrderReviews(orderReviewData);
          setPhotoUrls(gallery);
          setGoogleRating(coerceNumber(live.rating) ?? coerceNumber(restaurantData.google_rating));
          setGoogleReviewCount(live.user_ratings_total ?? null);
          if (!cancelled) setLoading(false);
          void applyDistance(restaurantData);
          return;
        }

        const [restaurantData, visitReviewData, orderReviewData] = await Promise.all([
          getRestaurant(restaurantId),
          listRestaurantReviews(restaurantId, user?.email, { kind: 'visit' }),
          listRestaurantReviews(restaurantId, user?.email, { kind: 'online_order' }),
        ]);
        if (cancelled) return;

        setRestaurant(restaurantData);
        setVisitReviews(sortReviewsWithViewerFirst(visitReviewData, user?.email, user?.id));
        setOrderReviews(orderReviewData);

        const gallery: string[] = [];
        const cover =
          restaurantData.promo?.card_cover_image_url?.trim() ||
          restaurantData.promo?.menu_image_url?.trim();
        if (cover) gallery.push(cover);
        setPhotoUrls(gallery);
        setGoogleRating(coerceNumber(restaurantData.google_rating));
        if (!cancelled) setLoading(false);

        googlePlaceId = restaurantData.google_place_id ?? googlePlaceId;

        if (googlePlaceId) {
          try {
            const live = await getLivePlaceDetails(googlePlaceId);
            if (!cancelled) {
              applyLiveSnapshot(live);
              const liveGallery = [...gallery];
              if (googleCardPhotosEnabled()) {
                for (const url of live.photo_urls ?? []) {
                  if (!liveGallery.includes(url)) liveGallery.push(url);
                }
              }
              setPhotoUrls(liveGallery);
              setGoogleRating(coerceNumber(live.rating) ?? coerceNumber(restaurantData.google_rating));
              setGoogleReviewCount(coerceNumber(live.user_ratings_total));
            }
          } catch {
            if (!cancelled) setGoogleReviews([]);
          }
        } else {
          setGoogleReviews([]);
        }

        if (!cancelled) {
          void applyDistance(restaurantData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Restoran yüklenemedi');
          setRestaurant(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, user?.email, user?.id]);

  useEffect(() => {
    if (!restaurant?.id || !isUuid(restaurant.id)) {
      setCheckInStatus(null);
      return;
    }
    let cancelled = false;
    void getCheckInStatus(restaurant.id, user?.email)
      .then((status) => {
        if (!cancelled) setCheckInStatus(status);
      })
      .catch(() => {
        if (!cancelled) setCheckInStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, [restaurant?.id, user?.email]);

  useEffect(() => {
    if (!pendingMenuFocus.current || loading || !restaurant || !hasPublicMenu(restaurant)) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, menuOffsetY.current - 12),
        animated: true,
      });
      pendingMenuFocus.current = false;
    });
  }, [loading, restaurant, focus]);

  const visitRating = useMemo(() => {
    const fromApi = coerceNumber(restaurant?.avg_rating);
    if (fromApi != null) return fromApi;
    const avg = averageGsRating(visitReviews);
    return avg != null ? coerceNumber(avg) : null;
  }, [restaurant?.avg_rating, visitReviews]);
  const orderRatings = restaurant?.order_ratings;
  const deliveryRating = coerceNumber(orderRatings?.lezzet_avg);
  const showDeliveryChannel = Boolean(
    restaurant?.online_orders_available ||
      (orderRatings?.review_count ?? 0) > 0 ||
      orderReviews.length > 0,
  );
  const activeReviews = reviewKind === 'visit' ? visitReviews : orderReviews;
  const googleRatingLabel = formatNumber(googleRating);
  const visitRatingLabel = formatNumber(visitRating);
  const deliveryRatingLabel = formatNumber(deliveryRating);
  const hasOwnReview = useMemo(
    () => visitReviews.some((row) => isOwnReview(row, user?.email, user?.id)),
    [visitReviews, user?.email, user?.id],
  );
  const visual = restaurant
    ? resolveCategoryVisual({
        category: restaurant.category,
        name: restaurant.name,
        menuItems: restaurant.menu ?? restaurant.menu_preview,
      })
    : null;
  const travel =
    distanceMeters != null && distanceMeters > 0
      ? estimateTravelMinutes(distanceMeters)
      : null;
  const mapsUrl = restaurant?.maps_directions_url?.trim() || null;
  const locationLine = [restaurant?.district, restaurant?.city, restaurant?.address]
    .filter(Boolean)
    .join(' · ');
  const visitorCount =
    checkInStatus?.visitor_count ?? restaurant?.check_in_visitor_count ?? 0;
  const lastVisitLabel = checkInStatus?.last_check_in_at
    ? new Date(checkInStatus.last_check_in_at).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  async function onCheckIn() {
    if (!restaurant?.id) return;
    if (!user?.email) {
      router.push('/(tabs)/profil');
      return;
    }
    setCheckInBusy(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Konum gerekli', 'Check-in için konum izni vermelisiniz.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const result = await postCheckIn(restaurant.id, {
        user_email: user.email,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      setCheckInStatus({
        visitor_count: result.visitor_count,
        checked_in_today: true,
        last_check_in_at: result.created_at,
      });
      setRestaurant((prev) =>
        prev ? { ...prev, check_in_visitor_count: result.visitor_count } : prev,
      );
    } catch (err) {
      Alert.alert('Check-in', formatApiError(err, 'Check-in'));
    } finally {
      setCheckInBusy(false);
    }
  }

  async function submitReview() {
    if (!restaurant) return;
    if (sessionLoading) return;
    if (!user?.email) {
      setSubmitError('Yorum yapmak için giriş yap');
      return;
    }
    const token = await ensureAccessToken();
    if (!token) {
      setSubmitError('Oturum süresi doldu. Hesap sekmesinden çıkış yapıp tekrar giriş yap.');
      return;
    }
    if (rating < 1) {
      setSubmitError('Lütfen yıldız puanı ver');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setModerationHighlights([]);
    try {
      await AsyncStorage.setItem(REVIEW_NAME_DISPLAY_STORAGE_KEY, nameDisplay);
      let saved = await createReview({
        restaurant_id: restaurant.id,
        rating,
        review_text: text.trim(),
        author_email: user.email,
        author_name: user.fullName,
        author_name_display: nameDisplay,
      });
      for (const photo of photos) {
        saved = await uploadReviewImage(
          saved.id,
          user.email,
          photo.uri,
          photo.mimeType,
          photo.fileName,
        );
      }
      const withMeta: DisplayReview = {
        ...saved,
        viewer_can_edit: saved.viewer_can_edit ?? true,
        created_at: saved.created_at ?? new Date().toISOString(),
      };
      setVisitReviews((prev) => sortReviewsWithViewerFirst([withMeta, ...prev], user?.email, user?.id));
      setText('');
      setPhotos([]);
      setRating(0);
      setModerationHighlights([]);
    } catch (err) {
      if (err instanceof ReviewModerationApiError) {
        setSubmitError(err.message);
        setModerationHighlights(err.highlights);
      } else {
        const message = err instanceof Error ? err.message : 'Yorum gönderilemedi';
        if (/401|oturum gerekli|geçersiz veya süresi dolmuş|author_email gerekli/i.test(message)) {
          setSubmitError('Oturum süresi doldu. Hesap sekmesinden çıkış yapıp tekrar giriş yap.');
        } else {
          setSubmitError(message);
        }
        setModerationHighlights([]);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={GastroColors.accent} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (error || !restaurant) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorWrap}>
          <Pressable onPress={() => router.back()} style={styles.backBtnInline}>
            <Text style={styles.backText}>← Geri</Text>
          </Pressable>
          <Text style={styles.errorText}>{error ?? 'Restoran bulunamadı.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.heroWrap}>
        <RestaurantPhotoCarousel photos={photoUrls} />
        <SafeAreaView edges={['top']} style={styles.backOverlay}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>←</Text>
          </Pressable>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior="padding"
        keyboardVerticalOffset={keyboardOffset}>
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive">
        <View style={styles.section}>
          <Text style={styles.title}>{restaurant.name}</Text>
          {locationLine ? <Text style={styles.location}>{locationLine}</Text> : null}

          <RestaurantFollowButton
            restaurantId={restaurant.id}
            userEmail={user?.email}
            onFollowingChange={setFollowing}
          />
          <FollowerCouponBox
            key={`${restaurant.id}-${following ? '1' : '0'}`}
            restaurantId={restaurant.id}
            userEmail={user?.email}
          />

          <View style={styles.scoreRow}>
            {googleRatingLabel != null ? (
              <Text style={styles.googleScore}>
                <Text style={styles.star}>★ </Text>
                Google {googleRatingLabel}
                {googleReviewCount != null && googleReviewCount > 0
                  ? ` · ${Math.round(googleReviewCount).toLocaleString('tr-TR')}`
                  : ''}
              </Text>
            ) : null}
          </View>

          {showDeliveryChannel ? (
            <View style={styles.dualScoreRow}>
              <Pressable
                style={[styles.scoreCard, reviewKind === 'visit' && styles.scoreCardActive]}
                onPress={() => setReviewKind('visit')}>
                <Text style={styles.scoreCardLabel}>Mekan</Text>
                <Text style={styles.scoreCardValue}>
                  {visitRatingLabel != null ? (
                    <>
                      <Text style={styles.star}>★ </Text>
                      {visitRatingLabel}
                    </>
                  ) : (
                    '—'
                  )}
                </Text>
                <Text style={styles.scoreCardMeta}>
                  {visitReviews.length > 0
                    ? `${visitReviews.length} yorum`
                    : 'Ziyaret puanı'}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.scoreCard, reviewKind === 'online_order' && styles.scoreCardActive]}
                onPress={() => setReviewKind('online_order')}>
                <Text style={styles.scoreCardLabel}>Teslimat</Text>
                <Text style={styles.scoreCardValue}>
                  {deliveryRatingLabel != null ? (
                    <>
                      <Text style={styles.star}>★ </Text>
                      {deliveryRatingLabel}
                    </>
                  ) : (
                    '—'
                  )}
                </Text>
                <Text style={styles.scoreCardMeta} numberOfLines={2}>
                  {orderRatings?.servis_avg != null || orderRatings?.kurye_avg != null
                    ? [
                        orderRatings?.servis_avg != null
                          ? `S ${orderRatings.servis_avg.toFixed(1)}`
                          : null,
                        orderRatings?.kurye_avg != null
                          ? `K ${orderRatings.kurye_avg.toFixed(1)}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    : orderReviews.length > 0
                      ? `${orderReviews.length} siparis yorumu`
                      : 'L·S·K puan'}
                </Text>
              </Pressable>
            </View>
          ) : visitRatingLabel != null ? (
            <Text style={styles.gsScore}>
              <Text style={styles.star}>★ </Text>
              GS Mekan {visitRatingLabel}
            </Text>
          ) : null}

          {visual ? (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {visual.emoji} {visual.label}
              </Text>
            </View>
          ) : null}

          {visitorCount > 0 ? (
            <Text style={styles.checkInMeta}>
              👣 {visitorCount.toLocaleString('tr-TR')} benzersiz ziyaretçi
            </Text>
          ) : null}

          {user && lastVisitLabel ? (
            <Text style={styles.checkInMeta}>
              Son ziyaretin: {checkInStatus?.checked_in_today ? 'bugün' : lastVisitLabel}
            </Text>
          ) : null}

          {isUuid(restaurant.id) ? (
            !user ? (
              <Pressable onPress={() => router.push('/(tabs)/profil')}>
                <Text style={styles.checkInLogin}>Check-in için giriş yap →</Text>
              </Pressable>
            ) : (
              <Pressable
                style={[
                  styles.checkInBtn,
                  (checkInBusy || checkInStatus?.checked_in_today) && styles.checkInBtnDisabled,
                ]}
                onPress={() => void onCheckIn()}
                disabled={checkInBusy || Boolean(checkInStatus?.checked_in_today)}>
                <Text style={styles.checkInBtnText}>
                  {checkInStatus?.checked_in_today
                    ? '✓ Bugün check-in yaptın'
                    : checkInBusy
                      ? 'Konum alınıyor…'
                      : '📍 Buradayım (check-in)'}
                </Text>
              </Pressable>
            )
          ) : null}

          {(mapsUrl || travel) && (
            <View style={styles.actionRow}>
              {mapsUrl ? (
                <Pressable style={styles.ghostBtn} onPress={() => void Linking.openURL(mapsUrl)}>
                  <Text style={styles.ghostBtnText}>🗺️ Haritada Aç</Text>
                </Pressable>
              ) : null}
              {travel ? (
                <>
                  <View style={styles.travelPill}>
                    <Text style={styles.travelPillText}>🚶 {travel.walkMin} dk</Text>
                  </View>
                  <View style={styles.travelPill}>
                    <Text style={styles.travelPillText}>🚗 {travel.driveMin} dk</Text>
                  </View>
                </>
              ) : null}
            </View>
          )}
          {restaurant ? (
            <View style={styles.shareRow}>
              <RestaurantShareButton
                restaurant={restaurant}
                googleRating={googleRating}
                gastroRating={visitRating}
              />
            </View>
          ) : null}
          {googleReviews.length > 0 ? (
            <Pressable style={styles.ghostBtn} onPress={() => setGoogleReviewsVisible(true)}>
              <Text style={styles.ghostBtnText}>💬 Google yorumları ({googleReviews.length})</Text>
            </Pressable>
          ) : null}
        </View>

        {restaurant && (restaurant.online_orders_available || hasPublicMenu(restaurant)) ? (
          <View
            style={styles.section}
            onLayout={(event) => {
              menuOffsetY.current = event.nativeEvent.layout.y;
            }}>
            {restaurant.online_orders_available ? (
              <OnlineOrderSection
                restaurant={restaurant}
                userEmail={user?.email ?? null}
                onFieldFocus={scrollToOrderField}
              />
            ) : null}
            {hasPublicMenu(restaurant) ? (
              <RestaurantMenuBlock restaurant={restaurant} menuOverride={restaurant.menu} />
            ) : null}
          </View>
        ) : null}

        <View style={styles.section}>
          <PlaceDetailInfo live={liveDetails} gastroScores={gastroScores} />
        </View>

        <View
          style={styles.section}
          onLayout={(event) => {
            reviewsSectionY.current = event.nativeEvent.layout.y;
          }}>
          <Text style={styles.sectionTitle}>GastroSkor yorumları</Text>

          {showDeliveryChannel ? (
            <View style={styles.reviewTabs}>
              <Pressable
                style={[styles.reviewTab, reviewKind === 'visit' && styles.reviewTabActive]}
                onPress={() => setReviewKind('visit')}>
                <Text
                  style={[
                    styles.reviewTabText,
                    reviewKind === 'visit' && styles.reviewTabTextActive,
                  ]}>
                  Mekan
                </Text>
              </Pressable>
              <Pressable
                style={[styles.reviewTab, reviewKind === 'online_order' && styles.reviewTabActive]}
                onPress={() => setReviewKind('online_order')}>
                <Text
                  style={[
                    styles.reviewTabText,
                    reviewKind === 'online_order' && styles.reviewTabTextActive,
                  ]}>
                  Teslimat
                </Text>
              </Pressable>
            </View>
          ) : null}

          {reviewKind === 'visit' && isUuid(restaurant.id) ? (
            <View
              onLayout={(event) => {
                reviewFormOffsetY.current = event.nativeEvent.layout.y;
                reviewFormBottomY.current =
                  event.nativeEvent.layout.y + event.nativeEvent.layout.height;
              }}>
              <Text style={styles.subsectionTitle}>Yorum yap</Text>
              {sessionLoading ? (
                <Text style={styles.loginHint}>Oturum kontrol ediliyor…</Text>
              ) : !user?.email ? (
                <Pressable onPress={() => router.push('/(tabs)/profil')}>
                  <Text style={styles.loginHint}>Yorum ve isim gizleme için giriş yap →</Text>
                </Pressable>
              ) : (
                <>
                  <ReviewNameDisplayPicker
                    fullName={user.fullName ?? user.email}
                    value={nameDisplay}
                    onChange={setNameDisplay}
                  />
                  <Text style={styles.communityHint}>
                    Argo/küfür içeren yorumlar yayınlanmaz; ban yok, metni düzeltmen yeterli.
                  </Text>
                  <StarRatingPicker value={rating} onChange={setRating} />
                  <TextInput
                    value={text}
                    onFocus={() => {
                      const formTop = reviewsSectionY.current + reviewFormOffsetY.current;
                      const formBottom = reviewsSectionY.current + reviewFormBottomY.current;
                      scrollToY(formTop + 80, formBottom);
                    }}
                    onChangeText={(value) => {
                      setText(value);
                      if (moderationHighlights.length) setModerationHighlights([]);
                      if (submitError) setSubmitError(null);
                    }}
                    placeholder="Bu restoran hakkında ne düşünüyorsun?"
                    placeholderTextColor={GastroColors.placeholder}
                    style={[
                      styles.textArea,
                      moderationHighlights.length > 0 && styles.textAreaFlagged,
                    ]}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  {moderationHighlights.length > 0 ? (
                    <View style={styles.moderationBox}>
                      <Text style={styles.moderationTitle}>
                        İşaretli ifadeler yayınlanamaz — düzeltip tekrar dene.
                      </Text>
                      <ReviewTextHighlight text={text} highlights={moderationHighlights} />
                    </View>
                  ) : null}
                  <ReviewPhotoPicker photos={photos} onChange={setPhotos} />
                  <Pressable
                    style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                    disabled={submitting}
                    onPress={() => void submitReview()}>
                    <Text style={styles.submitBtnText}>
                      {submitting ? 'Gönderiliyor...' : 'Yorum Gönder'}
                    </Text>
                  </Pressable>
                  {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}
                </>
              )}
            </View>
          ) : null}

          {reviewKind === 'visit' && hasOwnReview ? (
            <View style={styles.visitedHint}>
              <Text style={styles.visitedHintText}>
                Daha önce bu restorana gitmişsin — puanın ve yorumun en üstte.
              </Text>
            </View>
          ) : null}

          {activeReviews.length === 0 ? (
            <Text style={styles.emptyReviews}>
              {reviewKind === 'online_order'
                ? 'Henuz teslimat yorumu yok.'
                : 'Henüz üye yorumu yok — ilk yorumu sen yaz.'}
            </Text>
          ) : (
            activeReviews.map((rev) => (
              <GsReviewCard
                key={rev.id}
                review={rev}
                viewerEmail={user?.email ?? null}
                viewerUserId={user?.id ?? null}
                viewerName={user?.fullName ?? null}
                onCardLayout={(cardY) => {
                  reviewCardY.current[rev.id] = cardY;
                }}
                onInputFocus={() =>
                  scrollToY(reviewsSectionY.current + (reviewCardY.current[rev.id] ?? 0) + 140)
                }
                onChange={(updated) => {
                  const setter = reviewKind === 'visit' ? setVisitReviews : setOrderReviews;
                  setter((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
                }}
                onDelete={(reviewId) => {
                  const setter = reviewKind === 'visit' ? setVisitReviews : setOrderReviews;
                  setter((prev) => prev.filter((row) => row.id !== reviewId));
                }}
              />
            ))
          )}
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <GoogleReviewsModal
        visible={googleReviewsVisible}
        title={restaurant.name}
        loading={false}
        error={null}
        reviews={googleReviews}
        onClose={() => setGoogleReviewsVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GastroColors.bg },
  keyboardAvoid: { flex: 1 },
  scrollView: { flex: 1 },
  safe: { flex: 1, backgroundColor: GastroColors.bg },
  heroWrap: { position: 'relative' },
  backOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  backBtn: {
    marginLeft: 12,
    marginTop: 4,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { color: GastroColors.text, fontSize: 22, fontWeight: '700' },
  scroll: { paddingBottom: 32, gap: 16 },
  section: {
    paddingHorizontal: 16,
    gap: 10,
  },
  title: { color: GastroColors.text, fontSize: 22, fontWeight: '800' },
  location: { color: GastroColors.muted, fontSize: 13, lineHeight: 18 },
  scoreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  dualScoreRow: { flexDirection: 'row', gap: 10 },
  scoreCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: GastroColors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
    backgroundColor: GastroColors.input,
  },
  scoreCardActive: {
    borderColor: GastroColors.accent,
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
  },
  scoreCardLabel: { color: GastroColors.muted, fontSize: 11, fontWeight: '700' },
  scoreCardValue: { color: GastroColors.text, fontSize: 18, fontWeight: '800' },
  scoreCardMeta: { color: GastroColors.muted, fontSize: 11, fontWeight: '600' },
  star: { color: GastroColors.gold },
  googleScore: { color: GastroColors.google, fontSize: 14, fontWeight: '600' },
  gsScore: { color: GastroColors.accent, fontSize: 14, fontWeight: '700' },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: GastroColors.input,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  categoryText: { color: GastroColors.muted, fontSize: 12, fontWeight: '600' },
  checkInMeta: { color: GastroColors.muted, fontSize: 12, fontWeight: '600' },
  checkInLogin: { color: GastroColors.accent, fontSize: 13, fontWeight: '700' },
  checkInBtn: {
    alignSelf: 'flex-start',
    backgroundColor: GastroColors.accent,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  checkInBtnDisabled: { opacity: 0.55 },
  checkInBtnText: { color: GastroColors.accentDark, fontWeight: '800', fontSize: 13 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  shareRow: { marginTop: 4 },
  ghostBtn: {
    borderWidth: 1,
    borderColor: GastroColors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  ghostBtnText: { color: GastroColors.text, fontSize: 13, fontWeight: '600' },
  travelPill: {
    borderWidth: 1,
    borderColor: GastroColors.border,
    borderRadius: 8,
    backgroundColor: GastroColors.input,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  travelPillText: { color: GastroColors.muted, fontSize: 12, fontWeight: '600' },
  sectionTitle: { color: GastroColors.text, fontSize: 18, fontWeight: '800' },
  subsectionTitle: { color: GastroColors.text, fontSize: 15, fontWeight: '700' },
  reviewTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  reviewTab: {
    borderWidth: 1,
    borderColor: GastroColors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: GastroColors.input,
  },
  reviewTabActive: {
    borderColor: GastroColors.accent,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
  },
  reviewTabText: { color: GastroColors.muted, fontSize: 13, fontWeight: '700' },
  reviewTabTextActive: { color: GastroColors.accent },
  visitedHint: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.25)',
  },
  visitedHintText: { color: GastroColors.accent, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  loginHint: { color: GastroColors.accent, fontSize: 14, fontWeight: '700' },
  communityHint: { color: GastroColors.muted, fontSize: 11, lineHeight: 16, marginBottom: 4 },
  textArea: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: GastroColors.border,
    borderRadius: 12,
    backgroundColor: GastroColors.input,
    color: GastroColors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textAreaFlagged: {
    borderColor: 'rgba(248, 113, 113, 0.65)',
  },
  moderationBox: {
    marginTop: 8,
    gap: 6,
  },
  moderationTitle: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: GastroColors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: GastroColors.text, fontWeight: '800', fontSize: 15 },
  submitError: { color: GastroColors.bad, fontSize: 13 },
  photoNote: { color: GastroColors.muted, fontSize: 11, lineHeight: 16 },
  emptyReviews: { color: GastroColors.muted, fontSize: 14, lineHeight: 20 },
  reviewCard: {
    backgroundColor: GastroColors.input,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    marginBottom: 8,
  },
  reviewHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'center',
  },
  reviewAuthor: { color: GastroColors.text, fontWeight: '800', fontSize: 14, flex: 1 },
  reviewDate: { color: GastroColors.muted, fontSize: 11 },
  reviewStars: { color: GastroColors.accent, fontSize: 14, letterSpacing: 1 },
  reviewText: { color: GastroColors.text, fontSize: 13, lineHeight: 19 },
  reviewPhoto: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 8,
    marginTop: 4,
    backgroundColor: GastroColors.panel,
  },
  errorWrap: { padding: 16, gap: 12 },
  backBtnInline: { alignSelf: 'flex-start' },
  backText: { color: GastroColors.accent, fontWeight: '700' },
  errorText: { color: GastroColors.bad, fontSize: 14 },
});
