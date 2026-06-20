import type { ImageSourcePropType } from 'react-native';

import type { HubTaskId } from '@/constants/eglence-hub';

export const HUB_TASK_IMAGES: Partial<Record<HubTaskId, ImageSourcePropType>> = {
  'daily-login': require('@/assets/gastro-hub/tasks/daily-login.png'),
  invite: require('@/assets/gastro-hub/tasks/invite.png'),
  follow: require('@/assets/gastro-hub/tasks/follow.png'),
  review: require('@/assets/gastro-hub/tasks/review.png'),
  order: require('@/assets/gastro-hub/tasks/order.png'),
};
