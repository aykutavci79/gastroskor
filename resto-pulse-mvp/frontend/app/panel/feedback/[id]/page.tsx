import { FeedbackDetailPage } from '@/components/feedback/FeedbackDetailMockPage';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ restaurant_id?: string }>;
};

export default async function PanelFeedbackDetailRoute({ params, searchParams }: Props) {
  const routeParams = await params;
  const query = await searchParams;
  return <FeedbackDetailPage feedbackId={routeParams.id} restaurantId={query.restaurant_id} />;
}

