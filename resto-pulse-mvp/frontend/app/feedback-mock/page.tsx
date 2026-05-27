import { FeedbackDetailMockPage } from '@/components/feedback/FeedbackDetailMockPage';

type Props = {
  searchParams: Promise<{ id?: string; restaurant_id?: string }>;
};

export default async function FeedbackMockRoutePage({ searchParams }: Props) {
  const params = await searchParams;
  return <FeedbackDetailMockPage feedbackId={params.id ?? ''} restaurantId={params.restaurant_id} />;
}

