/** Bildirim metadata / push data → expo-router path. */

export function notificationOpenPath(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata) return null;

  const orderId = metadata.order_id;
  if (typeof orderId === 'string' && orderId.trim()) {
    return `/siparis/${orderId.trim()}`;
  }

  const reservationId = metadata.reservation_id;
  if (typeof reservationId === 'string' && reservationId.trim()) {
    return `/online-rezervasyon/${reservationId.trim()}`;
  }

  const openPath = metadata.open_path;
  if (typeof openPath === 'string' && openPath.startsWith('/')) {
    return openPath;
  }

  const restaurantId = metadata.restaurant_id;
  if (typeof restaurantId === 'string' && restaurantId.trim()) {
    return `/restaurant/${restaurantId.trim()}`;
  }

  return null;
}
