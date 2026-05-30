import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RestaurantPhotoCarousel } from '@/components/RestaurantPhotoCarousel';
import { ReviewPhotoPicker, type ReviewPhotoAsset } from '@/components/ReviewPhotoPicker';
import { StarRatingPicker } from '@/components/StarRatingPicker';
import { GastroColors } from '@/constants/theme';
import { useSession } from '@/context/session-context';
import {
  createReview,
  getLivePlaceDetails,
  getRestaurant,
  listRestaurantReviews,
} from '@/lib/api';
import { resolveCategoryVisual } from '@/lib/restaurant-category-visual';
import { averageGsRating, formatReviewDate, renderStarRow } from '@/lib/review-display';
import { estimateTravelMinutes, haversineMeters } from '@/lib/travel-estimate';
import { isUuid } from '@/lib/uuid';
import type { DisplayReview, Restaurant } from '@/lib/types';

export default function RestaurantDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user } = useSession();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [reviews, setReviews] = useState<DisplayReview[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [googleRating, setGoogleRating] = useState<number | null>(null);
  const [googleReviewCount, setGoogleReviewCount] = useState<number | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<ReviewPhotoAsset[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !isUuid(id)) {
      setError('Geçersiz restoran bağlantısı.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [restaurantData, reviewData] = await Promise.all([
          getRestaurant(id),
          listRestaurantReviews(id),
        ]);
        if (cancelled) return;

        setRestaurant(restaurantData);
        setReviews(reviewData);

        const gallery: string[] = [];
        const cover =
          restaurantData.promo?.card_cover_image_url?.trim() ||
          restaurantData.promo?.menu_image_url?.trim();
        if (cover) gallery.push(cover);

        let googleScore = restaurantData.google_rating ?? null;
        let googleCount: number | null = null;

        if (restaurantData.google_place_id) {
          try {
            const live = await getLivePlaceDetails(restaurantData.google_place_id);
            if (!cancelled) {
              for (const url of live.photo_urls ?? []) {
                if (!gallery.includes(url)) gallery.push(url);
              }
              googleScore = live.rating ?? googleScore;
              googleCount = live.user_ratings_total ?? null;
            }
          } catch {
            // Google detay opsiyonel
          }
        }

        if (!cancelled) {
          setPhotoUrls(gallery);
          setGoogleRating(googleScore);
          setGoogleReviewCount(googleCount);

          if (restaurantData.latitude != null && restaurantData.longitude != null) {
            try {
              const { status } = await Location.requestForegroundPermissionsAsync();
              if (status === 'granted') {
                const pos = await Location.getCurrentPositionAsync({});
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
  }, [id]);

  const gsRating = useMemo(() => averageGsRating(reviews), [reviews]);
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

  async function submitReview() {
    if (!restaurant) return;
    if (!user?.email) {
      setSubmitError('Yorum yapmak için giriş yap');
      return;
    }
    if (text.trim().length < 5) {
      setSubmitError('Yorum en az 5 karakter olmalı');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await createReview({
        restaurant_id: restaurant.id,
        rating,
        review_text: text.trim(),
        author_email: user.email,
        author_name: user.fullName,
      });
      const withPhotos: DisplayReview = {
        ...created,
        created_at: created.created_at ?? new Date().toISOString(),
        localPhotoUris: photos.map((p) => p.uri),
      };
      setReviews((prev) => [withPhotos, ...prev]);
      setText('');
      setPhotos([]);
      setRating(5);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Yorum gönderilemedi');
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

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.title}>{restaurant.name}</Text>
          {locationLine ? <Text style={styles.location}>{locationLine}</Text> : null}

          <View style={styles.scoreRow}>
            {googleRating != null ? (
              <Text style={styles.googleScore}>
                <Text style={styles.star}>★ </Text>
                Google {googleRating.toFixed(1)}
                {googleReviewCount != null && googleReviewCount > 0
                  ? ` · ${googleReviewCount.toLocaleString('tr-TR')}`
                  : ''}
              </Text>
            ) : null}
            {gsRating != null ? (
              <Text style={styles.gsScore}>
                <Text style={styles.star}>★ </Text>
                GS {gsRating.toFixed(1)}
              </Text>
            ) : null}
          </View>

          {visual ? (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {visual.emoji} {visual.label}
              </Text>
            </View>
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
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deneyimini Paylaş</Text>
          {!user ? (
            <Pressable onPress={() => router.push('/(tabs)/profil')}>
              <Text style={styles.loginHint}>Yorum yapmak için giriş yap →</Text>
            </Pressable>
          ) : (
            <>
              <StarRatingPicker value={rating} onChange={setRating} />
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Bu restoran hakkında ne düşünüyorsun?"
                placeholderTextColor={GastroColors.placeholder}
                style={styles.textArea}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
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
              {photos.length > 0 ? (
                <Text style={styles.photoNote}>
                  Fotoğraflar şimdilik yalnızca cihazında görünür; sunucu yüklemesi yakında.
                </Text>
              ) : null}
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yorumlar</Text>
          {reviews.length === 0 ? (
            <Text style={styles.emptyReviews}>Henüz yorum yok, ilk yorumu sen yaz! 🍽️</Text>
          ) : (
            reviews.map((rev) => (
              <View key={rev.id} style={styles.reviewCard}>
                <View style={styles.reviewHead}>
                  <Text style={styles.reviewAuthor}>{rev.author_name ?? 'GastroSkor Üyesi'}</Text>
                  {rev.created_at ? (
                    <Text style={styles.reviewDate}>{formatReviewDate(rev.created_at)}</Text>
                  ) : null}
                </View>
                <Text style={styles.reviewStars}>{renderStarRow(rev.rating)}</Text>
                <Text style={styles.reviewText}>{rev.review_text}</Text>
                {rev.localPhotoUris && rev.localPhotoUris.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {rev.localPhotoUris.map((uri) => (
                      <Image key={uri} source={{ uri }} style={styles.reviewPhoto} />
                    ))}
                  </ScrollView>
                ) : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GastroColors.bg },
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
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
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
  loginHint: { color: GastroColors.accent, fontSize: 14, fontWeight: '700' },
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
