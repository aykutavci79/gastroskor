import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { KesfetVoiceSearchSheet } from '@/components/KesfetVoiceSearchSheet';
import {
  emitKesfetVoiceSearch,
  registerKesfetVoiceOpener,
  unregisterKesfetVoiceOpener,
} from '@/lib/kesfet-voice-bridge';

/** Tab bar mic → her zaman acik ses overlay (index mount olmasa da). */
export function KesfetVoiceOverlayRoot() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  const openOverlay = useCallback(() => {
    router.navigate('/(tabs)');
    setVisible(true);
  }, [router]);

  useEffect(() => {
    registerKesfetVoiceOpener(openOverlay);
    return () => unregisterKesfetVoiceOpener(openOverlay);
  }, [openOverlay]);

  function handleTranscript(text: string) {
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
