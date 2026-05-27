import { FeedbackListPage } from '@/components/feedback/FeedbackListPage';

type Props = {
  searchParams: Promise<{ restaurant_id?: string }>;
};

export default async function PanelFeedbackListRoute({ searchParams }: Props) {
  const params = await searchParams;
  return <FeedbackListPage initialRestaurantId={params.restaurant_id ?? ''} />;
}

