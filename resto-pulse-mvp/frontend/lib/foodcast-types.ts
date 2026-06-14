export type FoodcastPhotoItem = {
  id: string;
  image_url: string;
  dish_name: string;
  caption?: string | null;
  restaurant_id: string;
  restaurant_name: string;
  author_label: string;
  created_at: string;
};

export type FoodcastFeedResponse = {
  city: string;
  items: FoodcastPhotoItem[];
  total_visible: number;
};
