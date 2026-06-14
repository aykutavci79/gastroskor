import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { KesfetVoiceSearchSheet } from '@/components/KesfetVoiceSearchSheet';
import {
  emitKesfetOnlineOrderVoice,
  emitKesfetVoiceSearch,
  registerKesfetVoiceOpener,
  unregisterKesfetVoiceOpener,
} from '@/lib/kesfet-voice-bridge';
import { gastroSpeak, gastroStopSpeaking } from '@/lib/gastro-speak';
import { parseKesfetVoiceNavigationIntent } from '@/lib/parse-kesfet-voice-intent';

/** Tab bar mic → her zaman acik ses overlay (index mount olmasa da). */
export function KesfetVoiceOverlayRoot() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  const openOverlay = useCallback(() => {
    gastroStopSpeaking();
    router.navigate('/(tabs)');
    setVisible(true);
  }, [router]);

  useEffect(() => {
    registerKesfetVoiceOpener(openOverlay);
    return () => unregisterKesfetVoiceOpener(openOverlay);
  }, [openOverlay]);

  function handleTranscript(text: string) {
    const intent = parseKesfetVoiceNavigationIntent(text);
    if (intent?.kind === 'online_order') {
      setVisible(false);
      emitKesfetOnlineOrderVoice({ orderText: intent.orderText });
      gastroSpeak('Online siparişe geçiyorum.');
      router.push('/siparis-acik' as never);
      return;
    }

    setVisible(false);
    router.navigate('/(tabs)');
    emitKesfetVoiceSearch(text);
  }

  return (
    <KesfetVoiceSearchSheet
      visible={visible}
      onClose={() => setVisible(false)}
      onTranscript={handleTranscript}
    />
  );
}
