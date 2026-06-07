import type { RestaurantListItem, RestaurantMenuItem, RestaurantPromoPublic } from '@/lib/types';

type MenuCarrier = {
  menu?: RestaurantMenuItem[];
  menu_preview?: RestaurantMenuItem[];
  menu_item_count?: number;
  promo?: RestaurantPromoPublic | null;
};

export function restaurantMenuItems(restaurant: MenuCarrier): RestaurantMenuItem[] {
  if (restaurant.menu?.length) return restaurant.menu;
  return restaurant.menu_preview ?? [];
}

export function restaurantMenuItemCount(restaurant: MenuCarrier): number {
  return restaurant.menu_item_count ?? restaurantMenuItems(restaurant).length;
}

export function hasStructuredMenu(restaurant: MenuCarrier): boolean {
  return restaurantMenuItemCount(restaurant) > 0;
}

export function hasMenuPhoto(restaurant: MenuCarrier): boolean {
  return Boolean(restaurant.promo?.menu_image_url?.trim());
}

export function hasPublicMenu(restaurant: MenuCarrier): boolean {
  return hasStructuredMenu(restaurant) || hasMenuPhoto(restaurant);
}
