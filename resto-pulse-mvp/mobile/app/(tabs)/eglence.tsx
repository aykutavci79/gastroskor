import EglenceHubFullScreen, { type EglenceHubBisectStep } from '@/components/eglence/EglenceHubFullScreen';

/**
 * Hub geri ekleme (bisect) — cold-start 86'da kalsın, özellikler sırayla:
 * 1 carousel · 2 görevler · 3 jeton · 4 cüzdan · 5 GC animasyon + oyun meta + market
 */
const BISECT_STEP: EglenceHubBisectStep = 4;

export default function EglenceTabScreen() {
  return <EglenceHubFullScreen bisectStep={BISECT_STEP} />;
}
