import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useGastroPostHog } from '@/lib/gastro-posthog';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GastroColorsLight } from '@/constants/theme';
import { getActiveRestaurantOrder, submitRestaurantOrder } from '@/lib/api';
import { resolveCardCoverUrl } from '@/lib/card-cover';
import { coerceNumber } from '@/lib/coerce-number';
import { formatDeliveryFeeLabel, resolveDeliveryFeeTl } from '@/lib/delivery-fee';
import {
  formatDiscountBadgeLabel,
  formatDiscountBadgeSubline,
  resolveDiscountBandVisual,
} from '@/lib/discount-band-visual';
import { ensureArray } from '@/lib/ensure-array';
import { formatApiError } from '@/lib/format-api-error';
import { coercePriceTl, formatPriceTl } from '@/lib/format-price-tl';
import { loadOrderContactSnapshot } from '@/lib/order-contact-ready';
import { resolveOnlineMenuDiscountPercent } from '@/lib/resolve-online-discount';
import { resolveRatingBandVisual } from '@/lib/rating-band-visual';
import { resolveCategoryVisual } from '@/lib/restaurant-category-visual';
import { readStoredDeliveryAddress } from '@/lib/delivery-address-storage';
import { resolveDeviceCoords } from '@/lib/device-location';
import { readStoredOrderPhone } from '@/lib/order-contact-secure-storage';
import { estimateTravelMinutes, formatDistanceLabel } from '@/lib/travel-estimate';
import type { Restaurant, RestaurantMenuItem, RestaurantOrderRead, OrderPaymentOption } from '@/lib/types';
import {
  DEFAULT_ORDER_PAYMENT_OPTIONS,
  OrderPaymentMethodPicker,
} from '@/components/OrderPaymentMethodPicker';

const PAGE_BG = '#FFFFFF';
const ACCENT = '#FF6B35';

type LineState = { quantity: number };

type Props = {
  restaurant: Restaurant;
  userEmail: string | null;
  distanceMeters?: number | null;
  googleRating?: number | null;
};

export function OnlineOrderDetailScreen({
  restaurant,
  userEmail,
  distanceMeters: distanceMetersProp,
  googleRating: googleRatingProp,
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const posthog = useGastroPostHog();
  const insets = useSafeAreaInsets();

  const menuItems = useMemo(
    () =>
      ensureArray<RestaurantMenuItem>(restaurant.menu ?? restaurant.menu_preview).filter(
        (item) => Boolean(item?.id && item?.name),
      ),
    [restaurant.menu, restaurant.menu_preview],
  );

  const [lines, setLines] = useState<Record<string, LineState>>({});
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingOrder, setPendingOrder] = useState<RestaurantOrderRead | null>(null);
  const [rejectedOrder, setRejectedOrder] = useState<RestaurantOrderRead | null>(null);
  const [available, setAvailable] = useState(restaurant.online_orders_available ?? false);
  const [orderOpenNow, setOrderOpenNow] = useState(
    restaurant.online_orders_open_now ?? restaurant.online_orders_available ?? true,
  );
  const [hoursRangeLabel, setHoursRangeLabel] = useState(
    restaurant.online_order_hours_range_label?.trim() ?? null,
  );
  const [paymentOptions, setPaymentOptions] = useState<OrderPaymentOption[]>(
    restaurant.order_payment_options?.length
      ? restaurant.order_payment_options
      : DEFAULT_ORDER_PAYMENT_OPTIONS,
  );
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);

  const resolvedPaymentOptions = useMemo(
    () => (paymentOptions.length > 0 ? paymentOptions : DEFAULT_ORDER_PAYMENT_OPTIONS),
    [paymentOptions],
  );

  useEffect(() => {
    setPaymentMethod((current) => {
      if (current && resolvedPaymentOptions.some((row) => row.code === current)) {
        return current;
      }
      return resolvedPaymentOptions[0]?.code ?? null;
    });
  }, [resolvedPaymentOptions]);

  const distanceMeters = distanceMetersProp ?? restaurant.distance_meters ?? null;
  const distanceLabel = formatDistanceLabel({ distance_meters: distanceMeters });
  const deliveryFeeTl =
    restaurant.delivery_fee_tl ?? resolveDeliveryFeeTl(distanceMeters);
  const travel =
    distanceMeters != null && distanceMeters > 0
      ? estimateTravelMinutes(distanceMeters)
      : null;
  const etaMin = travel ? Math.max(20, travel.driveMin + 18) : null;
  const etaMax = travel ? travel.driveMin + 35 : null;

  const rating = coerceNumber(
    restaurant.order_ratings?.lezzet_avg ??
      googleRatingProp ??
      restaurant.google_rating ??
      restaurant.avg_rating,
  );
  const ratingVisual = resolveRatingBandVisual(rating);
  const discountPercent = resolveOnlineMenuDiscountPercent(restaurant);
  const discountVisual = resolveDiscountBandVisual(discountPercent);
  const promoText = restaurant.promo?.direct_order_text?.trim() ?? '';
  const cover = resolveCardCoverUrl(restaurant);
  const visual = resolveCategoryVisual({
    category: restaurant.category,
    name: restaurant.name,
    menuItems,
  });

  const selectedTotal = useMemo(
    () =>
      menuItems.reduce((sum, item) => {
        const qty = lines[item.id]?.quantity ?? 0;
        if (qty < 1) return sum;
        return sum + (coercePriceTl(item.price_tl) ?? 0) * qty;
      }, 0),
    [lines, menuItems],
  );

  const selectedCount = useMemo(
    () => Object.values(lines).reduce((n, row) => n + (row.quantity > 0 ? row.quantity : 0), 0),
    [lines],
  );

  const refreshActive = useCallback(async () => {
    if (!userEmail || !restaurant.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const active = await getActiveRestaurantOrder(restaurant.id, userEmail);
      setAvailable(active.online_orders_available);
      setOrderOpenNow(active.online_orders_open_now ?? active.online_orders_available);
      setHoursRangeLabel(active.online_order_hours_range_label?.trim() ?? null);
      if (active.order_payment_options?.length) {
        setPaymentOptions(active.order_payment_options);
      }
      setPendingOrder(active.pending_order);
      setRejectedOrder(active.pending_order ? null : active.recent_rejected_order ?? null);
      if (!active.pending_order) setLines({});
    } catch {
      setAvailable(restaurant.online_orders_available ?? false);
    } finally {
      setLoading(false);
    }
  }, [restaurant.id, restaurant.online_orders_available, userEmail]);

  useEffect(() => {
    void refreshActive();
  }, [refreshActive]);

  function addItem(itemId: string) {
    setLines((prev) => {
      const current = prev[itemId]?.quantity ?? 0;
      return { ...prev, [itemId]: { quantity: Math.min(99, current + 1) } };
    });
  }

  function removeItem(itemId: string) {
    setLines((prev) => {
      const current = prev[itemId]?.quantity ?? 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return { ...prev, [itemId]: { quantity: current - 1 } };
    });
  }

  async function onSubmit() {
    if (!userEmail) {
      Alert.alert(t('auth.loginRequired'), t('order.loginRequiredBody'));
      return;
    }
    if (selectedCount === 0) {
      setError(t('order.emptyCart'));
      return;
    }
    if (!paymentMethod) {
      setError(t('order.paymentMethodRequired'));
      return;
    }

    const contact = await loadOrderContactSnapshot(userEmail);
    if (!contact.ready || !contact.phone) {
      router.push(
        `/hesap/siparis-bilgileri?returnTo=${encodeURIComponent(`/online-siparis/${restaurant.id}`)}` as never,
      );
      return;
    }

    const payloadLines = menuItems
      .filter((item) => (lines[item.id]?.quantity ?? 0) > 0)
      .map((item) => ({
        menu_item_id: item.id,
        quantity: lines[item.id]?.quantity ?? 1,
      }));

    setSubmitting(true);
    setError(null);
    posthog.capture('order_started', {
      restaurant_id: restaurant.id,
      item_count: payloadLines.length,
      source: 'online_order_detail',
    });
    try {
      const storedAddress = await readStoredDeliveryAddress().catch(() => null);
      const phone =
        contact.phone ?? (await readStoredOrderPhone().catch(() => null))?.trim() ?? '';
      if (!storedAddress?.streetNodeId || !storedAddress.doorNumber?.trim()) {
        router.push(
          `/hesap/siparis-bilgileri?returnTo=${encodeURIComponent(`/online-siparis/${restaurant.id}`)}` as never,
        );
        return;
      }
      const deviceCoords = await resolveDeviceCoords({ requestPermission: true });
      const order = await submitRestaurantOrder(restaurant.id, {
        user_email: userEmail,
        customer_phone: phone,
        delivery_street_node_id: storedAddress.streetNodeId,
        delivery_door_number: storedAddress.doorNumber,
        delivery_address_note: storedAddress.note,
        device_lat: deviceCoords?.lat,
        device_lng: deviceCoords?.lng,
        note: note.trim() || undefined,
        payment_method: paymentMethod,
        lines: payloadLines,
      });
      posthog.capture('order_completed', {
        restaurant_id: restaurant.id,
        order_total: order.total_tl,
        payment_method: paymentMethod,
      });
      await refreshActive();
    } catch (err) {
      setError(formatApiError(err, t('order.submitFailed')));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={ACCENT} size="large" />
      </View>
    );
  }

  if (!available && !pendingOrder) {
    return (
      <View style={[styles.center, styles.page, { paddingTop: insets.top }]}>
        <Text style={styles.emptyTitle}>{t('order.closedTitle')}</Text>
        <Text style={styles.emptySub}>{t('order.closedBody')}</Text>
        <Pressable style={styles.profileLink} onPress={() => router.back()}>
          <Text style={styles.profileLinkText}>{t('order.goBack')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: selectedCount > 0 ? 120 + insets.bottom : 24 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          {cover ? (
            <Image source={{ uri: cover }} style={styles.heroImage} contentFit="cover" />
          ) : (
            <View style={[styles.heroFallback, { backgroundColor: '#FFF7ED' }]}>
              <Text style={styles.heroEmoji}>{visual.emoji}</Text>
            </View>
          )}
          <View style={styles.heroOverlay} />
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.name}>{restaurant.name}</Text>
              {restaurant.district || restaurant.city ? (
                <Text style={styles.metaLine}>
                  {[restaurant.district, restaurant.city].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
            </View>
            {rating != null && ratingVisual ? (
              <View style={[styles.ratingPill, { backgroundColor: ratingVisual.softBackground }]}>
                <Text style={[styles.ratingText, { color: ratingVisual.accent }]}>
                  {rating.toFixed(1)} ★
                </Text>
              </View>
            ) : null}
          </View>

          {discountVisual != null ? (
            <View
              style={[
                styles.promoBand,
                {
                  backgroundColor: discountVisual.background,
                  borderColor: discountVisual.border,
                },
              ]}>
              <Text style={[styles.promoTitle, { color: discountVisual.text }]}>
                {formatDiscountBadgeLabel(discountPercent)}
              </Text>
              <Text style={[styles.promoSub, { color: discountVisual.text }]}>
                {formatDiscountBadgeSubline(discountPercent) ?? t('order.allMenu')}
              </Text>
            </View>
          ) : promoText ? (
            <View style={styles.offerChip}>
              <Text style={styles.offerChipText}>{promoText}</Text>
            </View>
          ) : null}

          {!orderOpenNow && hoursRangeLabel ? (
            <Text style={styles.hoursLine} numberOfLines={2}>
              {hoursRangeLabel}
            </Text>
          ) : null}

          <View style={styles.deliveryStrip}>
            {etaMin != null && etaMax != null ? (
              <DeliveryChip icon="time-outline" label={`${etaMin}–${etaMax} dk`} />
            ) : null}
            {distanceLabel ? <DeliveryChip icon="navigate-outline" label={distanceLabel} /> : null}
            {deliveryFeeTl != null ? (
              <DeliveryChip icon="bicycle-outline" label={formatDeliveryFeeLabel(deliveryFeeTl)} />
            ) : null}
          </View>

          <Pressable
            style={styles.profileLink}
            onPress={() =>
              router.push(
                `/restaurant/${restaurant.id}?focus=reviews&source=online-order` as never,
              )
            }>
            <Text style={styles.profileLinkText}>{t('order.reviewsLink')}</Text>
            <Ionicons name="chevron-forward" size={16} color={ACCENT} />
          </Pressable>

          {pendingOrder ? (
            <View style={styles.pendingCard}>
              <Text style={styles.pendingTitle}>{t('order.pendingTitle')}</Text>
              <Text style={styles.pendingBody}>
                {t('order.pendingBody')}
              </Text>
              <Text style={styles.pendingMeta}>
                {pendingOrder.order_number ? `${pendingOrder.order_number} · ` : ''}
                {formatPriceTl(pendingOrder.total_tl, 0) ?? '—'} ₺
              </Text>
            </View>
          ) : rejectedOrder ? (
            <View style={styles.rejectedCard}>
              <Text style={styles.rejectedTitle}>{t('order.cancelledTitle')}</Text>
              <Text style={styles.rejectedBody}>
                {rejectedOrder.reject_message
                  ? `${restaurant.name}: ${rejectedOrder.reject_message}`
                  : t('order.cancelledBy', { name: restaurant.name })}
              </Text>
              <Pressable style={styles.dismissBtn} onPress={() => setRejectedOrder(null)}>
                <Text style={styles.dismissBtnText}>{t('order.reorderBtn')}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.menuTitle}>{t('order.menuTitle')}</Text>
              <View style={styles.menuList}>
                {menuItems.map((item) => {
                  const qty = lines[item.id]?.quantity ?? 0;
                  const price = formatPriceTl(item.price_tl, 0);
                  return (
                    <View key={item.id} style={styles.menuRow}>
                      <View style={styles.menuText}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        {item.description ? (
                          <Text style={styles.itemDesc} numberOfLines={2}>
                            {item.description}
                          </Text>
                        ) : null}
                        <Text style={styles.itemPrice}>{price ?? '—'} ₺</Text>
                      </View>
                      {qty > 0 ? (
                        <View style={styles.qtyControl}>
                          <Pressable style={styles.qtyBtn} onPress={() => removeItem(item.id)}>
                            <Ionicons name="remove" size={18} color={GastroColorsLight.text} />
                          </Pressable>
                          <Text style={styles.qtyValue}>{qty}</Text>
                          <Pressable style={styles.qtyBtn} onPress={() => addItem(item.id)}>
                            <Ionicons name="add" size={18} color={GastroColorsLight.text} />
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable style={styles.addBtn} onPress={() => addItem(item.id)}>
                          <Ionicons name="add" size={22} color="#141414" />
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>

              <Pressable style={styles.noteToggle} onPress={() => setNoteOpen((v) => !v)}>
                <Text style={styles.noteToggleText}>
                  {noteOpen ? t('order.noteHide') : t('order.noteAdd')}
                </Text>
              </Pressable>
              {noteOpen ? (
                <TextInput
                  style={styles.noteInput}
                  value={note}
                  onChangeText={setNote}
                  placeholder={t('order.notePlaceholder')}
                  placeholderTextColor={GastroColorsLight.placeholder}
                  multiline
                />
              ) : null}

              {!pendingOrder && orderOpenNow ? (
                <OrderPaymentMethodPicker
                  options={resolvedPaymentOptions}
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  title={t('order.paymentMethodTitle')}
                  hint={t('order.paymentMethodHint')}
                />
              ) : null}

              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Text style={styles.legal}>
                {t('order.privacyNote')}
              </Text>
            </>
          )}
        </View>
      </ScrollView>

      {selectedCount > 0 && !pendingOrder && orderOpenNow ? (
        <View style={[styles.stickyBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.stickyMeta}>
            <Text style={styles.stickyCount}>{t('order.itemCount', { count: selectedCount })}</Text>
            <Text style={styles.stickyTotal}>{formatPriceTl(selectedTotal, 0) ?? '0'} ₺</Text>
          </View>
          <Pressable
            style={[styles.submitBtn, submitting && styles.submitDisabled]}
            disabled={submitting}
            onPress={() => void onSubmit()}>
            {submitting ? (
              <ActivityIndicator color="#141414" />
            ) : (
              <Text style={styles.submitText}>{t('order.submitBtn')}</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function DeliveryChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={14} color={GastroColorsLight.muted} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: PAGE_BG },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  scroll: { flexGrow: 1 },
  heroWrap: { height: 200, backgroundColor: '#F3F4F6' },
  heroImage: { width: '100%', height: '100%' },
  heroFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroEmoji: { fontSize: 56 },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  body: { padding: 16, gap: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  titleBlock: { flex: 1, gap: 4 },
  name: { color: GastroColorsLight.text, fontSize: 22, fontWeight: '900', letterSpacing: -0.3 },
  metaLine: { color: GastroColorsLight.muted, fontSize: 13 },
  ratingPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  ratingText: { fontWeight: '800', fontSize: 14 },
  promoBand: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
  },
  promoTitle: { fontSize: 16, fontWeight: '900' },
  promoSub: { fontSize: 13, fontWeight: '600' },
  hoursLine: {
    color: GastroColorsLight.bad,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  offerChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF7ED',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FDBA74',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  offerChipText: { color: '#9A3412', fontWeight: '700', fontSize: 13 },
  deliveryStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F9FAFB',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: GastroColorsLight.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: { color: GastroColorsLight.text, fontSize: 12, fontWeight: '600' },
  profileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  profileLinkText: { color: ACCENT, fontWeight: '700', fontSize: 13 },
  menuTitle: { color: GastroColorsLight.text, fontSize: 18, fontWeight: '800', marginTop: 4 },
  menuList: { gap: 0, borderTopWidth: 1, borderTopColor: GastroColorsLight.border },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: GastroColorsLight.border,
  },
  menuText: { flex: 1, gap: 4 },
  itemName: { color: GastroColorsLight.text, fontSize: 15, fontWeight: '700' },
  itemDesc: { color: GastroColorsLight.muted, fontSize: 12, lineHeight: 16 },
  itemPrice: { color: GastroColorsLight.text, fontSize: 14, fontWeight: '800' },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF7ED',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: GastroColorsLight.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: { minWidth: 20, textAlign: 'center', fontWeight: '800', color: GastroColorsLight.text },
  noteToggle: { paddingVertical: 4 },
  noteToggleText: { color: ACCENT, fontWeight: '700', fontSize: 13 },
  noteInput: {
    borderWidth: 1,
    borderColor: GastroColorsLight.border,
    borderRadius: 12,
    padding: 12,
    minHeight: 72,
    color: GastroColorsLight.text,
    backgroundColor: '#FFFFFF',
    textAlignVertical: 'top',
  },
  error: { color: '#DC2626', fontSize: 13 },
  legal: { color: GastroColorsLight.muted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: PAGE_BG,
    borderTopWidth: 1,
    borderTopColor: GastroColorsLight.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -4 },
      },
      android: { elevation: 12 },
    }),
  },
  stickyMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stickyCount: { color: GastroColorsLight.muted, fontWeight: '700', fontSize: 13 },
  stickyTotal: { color: GastroColorsLight.text, fontWeight: '900', fontSize: 20 },
  submitBtn: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#141414', fontWeight: '900', fontSize: 16 },
  pendingCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
    padding: 14,
    gap: 6,
  },
  pendingTitle: { color: '#92400E', fontWeight: '800', fontSize: 16 },
  pendingBody: { color: GastroColorsLight.text, fontSize: 13, lineHeight: 18 },
  pendingMeta: { color: GastroColorsLight.muted, fontSize: 12, fontWeight: '700' },
  rejectedCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    padding: 14,
    gap: 8,
  },
  rejectedTitle: { color: '#DC2626', fontWeight: '800', fontSize: 16 },
  rejectedBody: { color: GastroColorsLight.text, fontSize: 13, lineHeight: 18 },
  dismissBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GastroColorsLight.border,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dismissBtnText: { color: GastroColorsLight.text, fontWeight: '700' },
  emptyTitle: { color: GastroColorsLight.text, fontSize: 18, fontWeight: '800' },
  emptySub: { color: GastroColorsLight.muted, fontSize: 14, marginTop: 6, textAlign: 'center' },
});
