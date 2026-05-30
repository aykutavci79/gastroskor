import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { GastroColors, GastroStyles } from '@/constants/theme';
import { useSession } from '@/context/session-context';
import {
  analyzeReview,
  createReview,
  getGoogleReviewLink,
  getRestaurant,
  listRestaurantReviews,
} from '@/lib/api';
import { isUuid } from '@/lib/uuid';
import type { Restaurant, Review } from '@/lib/types';

export default function RestaurantDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user } = useSession();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState('5');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    if (!isUuid(id)) {
      setError('Bu kayit Google listesinden geliyor; detay icin ana sayfadaki Haritada ac dugmesini kullanin.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([getRestaurant(id), listRestaurantReviews(id)])
      .then(([r, rev]) => {
        setRestaurant(r);
        setReviews(rev);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Restoran yuklenemedi');
        setRestaurant(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Screen scroll={false}>
        <ActivityIndicator color={GastroColors.accent} style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  if (error || !restaurant) {
    return (
      <Screen>
        <Text style={styles.error}>{error ?? 'Restoran bulunamadi.'}</Text>
      </Screen>
    );
  }

  const premium = Boolean(restaurant.is_premium_partner);
  const promo = restaurant.promo;

  return (
    <Screen>
      {premium ? <Text style={styles.premiumBadge}>Uye isletme</Text> : null}
      <Text style={styles.title}>{restaurant.name}</Text>
      <Text style={styles.meta}>
        {[restaurant.category, restaurant.district, restaurant.city].filter(Boolean).join(' · ')}
      </Text>
      {restaurant.address ? <Text style={styles.address}>{restaurant.address}</Text> : null}

      {promo?.instagram_url ? (
        <Pressable onPress={() => Linking.openURL(promo.instagram_url!)}>
          <Text style={styles.link}>Instagram</Text>
        </Pressable>
      ) : null}
      {promo?.menu_image_url ? (
        <Image source={{ uri: promo.menu_image_url }} style={styles.menuImage} resizeMode="contain" />
      ) : null}

      {restaurant.menu && restaurant.menu.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Menu</Text>
          {restaurant.menu.map((item) => (
            <Text key={item.id} style={styles.menuLine}>
              {item.name} · {item.price_tl.toLocaleString('tr-TR')} TL
            </Text>
          ))}
        </View>
      ) : null}

      {restaurant.maps_directions_url ? (
        <Pressable style={styles.btnOutline} onPress={() => Linking.openURL(restaurant.maps_directions_url!)}>
          <Text style={styles.btnOutlineText}>Haritada ac</Text>
        </Pressable>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Yorum yaz</Text>
        <TextInput
          value={rating}
          onChangeText={setRating}
          keyboardType="number-pad"
          placeholder="Puan 1-5"
          placeholderTextColor={GastroColors.placeholder}
          style={styles.input}
        />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Deneyiminizi yazin..."
          placeholderTextColor={GastroColors.placeholder}
          style={[styles.input, styles.textArea]}
          multiline
        />
        <Pressable
          style={styles.btn}
          disabled={submitting}
          onPress={async () => {
            setSubmitting(true);
            setMessage(null);
            try {
              const created = await createReview({
                restaurant_id: restaurant.id,
                rating: Number(rating),
                review_text: text.trim(),
                author_email: user?.email ?? null,
                author_name: user?.fullName ?? null,
              });
              const analyzed = await analyzeReview(created.id);
              setReviews((prev) => [
                { ...created, ai_summary: analyzed.summary, categories: analyzed.categories },
                ...prev,
              ]);
              setText('');
              setMessage('Yorum kaydedildi ve analiz edildi');
            } catch (err) {
              setMessage(err instanceof Error ? err.message : 'Yorum gonderilemedi');
            } finally {
              setSubmitting(false);
            }
          }}>
          <Text style={styles.btnText}>{submitting ? 'Gonderiliyor...' : 'Gonder ve analiz et'}</Text>
        </Pressable>
        {message ? <Text style={styles.ok}>{message}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Yorumlar ({reviews.length})</Text>
        {reviews.map((rev) => (
          <View key={rev.id} style={styles.review}>
            <Text style={styles.reviewRating}>{rev.rating}/5</Text>
            <Text style={styles.reviewText}>{rev.review_text}</Text>
            {rev.ai_summary ? <Text style={styles.ai}>{rev.ai_summary}</Text> : null}
          </View>
        ))}
      </View>

      <Pressable
        style={styles.btnOutline}
        onPress={async () => {
          const link = await getGoogleReviewLink(restaurant.id);
          if (link.google_review_url) Linking.openURL(link.google_review_url);
        }}>
        <Text style={styles.btnOutlineText}>Google'a yorum aktar</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  premiumBadge: GastroStyles.featuredBadge,
  title: { color: GastroColors.text, fontSize: 26, fontWeight: '800' },
  meta: { color: GastroColors.muted, fontSize: 14 },
  address: { color: GastroColors.placeholder, fontSize: 13 },
  link: GastroStyles.linkText,
  menuImage: { width: '100%', height: 220, borderRadius: 12, backgroundColor: GastroColors.panel },
  card: {
    ...GastroStyles.card,
    borderRadius: 14,
    gap: 8,
  },
  cardTitle: { color: GastroColors.text, fontWeight: '700', fontSize: 15 },
  menuLine: GastroStyles.bodyText,
  input: {
    ...GastroStyles.input,
    ...GastroStyles.inputSm,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  btn: {
    ...GastroStyles.btnPrimary,
    borderRadius: 10,
  },
  btnText: GastroStyles.btnPrimaryText,
  btnOutline: {
    ...GastroStyles.btnOutline,
    borderRadius: 10,
  },
  btnOutlineText: GastroStyles.btnOutlineText,
  review: { borderTopWidth: 1, borderTopColor: GastroColors.border, paddingTop: 8, gap: 4 },
  reviewRating: { color: GastroColors.gold, fontWeight: '700' },
  reviewText: GastroStyles.bodyText,
  ai: { color: GastroColors.muted, fontSize: 12 },
  ok: { color: GastroColors.accent, fontSize: 12 },
  error: GastroStyles.errorText,
});
