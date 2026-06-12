import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  GastroVoiceMicButton,
  type VoiceMicUiState,
} from '@/components/GastroVoiceMicButton';
import { FloatingExampleChip } from '@/components/FloatingExampleChip';
import { SpeechMicErrorBoundary } from '@/components/SpeechMicErrorBoundary';
import { VOICE_ORB_SIZE, VoiceListenOrb } from '@/components/VoiceListenOrb';
import { GastroColors } from '@/constants/theme';
import { isExpoGo } from '@/lib/google-signin-config';

const DEMO_PHRASE = '150 TL lik lahmacun';

type Props = {
  visible: boolean;
  onClose: () => void;
  onTranscript: (text: string) => void;
};

const EXAMPLE_ITEMS = [
  { text: '150 TL lik lahmacun', position: 'chipTopLeft' },
  { text: 'Bana en yakın dönerci', position: 'chipTopRight' },
  { text: 'Online sipariş', position: 'chipMidLeft' },
  { text: 'Bursa\'da pideli köfte', position: 'chipMidRight' },
  { text: '4 yıldız üstü cantık', position: 'chipBottomLeft' },
  { text: 'Yakınımda iskender', position: 'chipBottomRight' },
] as const;

type ChipPosition = (typeof EXAMPLE_ITEMS)[number]['position'];

const CHIP_LAYOUT: Record<ChipPosition, { top?: string; bottom?: string; left?: string; right?: string }> = {
  chipTopLeft: { top: '14%', left: '4%' },
  chipTopRight: { top: '18%', right: '2%' },
  chipMidLeft: { top: '38%', left: '0%' },
  chipMidRight: { top: '42%', right: '0%' },
  chipBottomLeft: { bottom: '22%', left: '6%' },
  chipBottomRight: { bottom: '18%', right: '4%' },
};

export function KesfetVoiceSearchSheet({ visible, onClose, onTranscript }: Props) {
  const insets = useSafeAreaInsets();
  const [micActive, setMicActive] = useState(true);
  const [uiState, setUiState] = useState<VoiceMicUiState>({ listening: false, transcribing: false });
  const [liveDraft, setLiveDraft] = useState('');
  const demoTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearDemoTimers = useCallback(() => {
    demoTimersRef.current.forEach(clearTimeout);
    demoTimersRef.current = [];
  }, []);

  const scheduleDemo = useCallback((ms: number, fn: () => void) => {
    const id = setTimeout(fn, ms);
    demoTimersRef.current.push(id);
  }, []);

  useEffect(() => {
    if (!visible) {
      clearDemoTimers();
      return;
    }
    setMicActive(true);
    setUiState({ listening: false, transcribing: false });
    setLiveDraft('');
    return () => clearDemoTimers();
  }, [visible, clearDemoTimers]);

  const runVoiceDemo = useCallback(() => {
    if (uiState.listening || uiState.transcribing) {
      clearDemoTimers();
      setUiState({ listening: false, transcribing: false });
      setLiveDraft('');
      return;
    }

    setLiveDraft('');
    setUiState({ listening: true, transcribing: false });
    scheduleDemo(700, () => setLiveDraft('150 TL'));
    scheduleDemo(1400, () => setLiveDraft(DEMO_PHRASE));
    scheduleDemo(2600, () => setUiState({ listening: false, transcribing: true }));
    scheduleDemo(4000, () => {
      clearDemoTimers();
      setUiState({ listening: false, transcribing: false });
      setMicActive(false);
      onTranscript(DEMO_PHRASE);
      onClose();
    });
  }, [clearDemoTimers, onClose, onTranscript, scheduleDemo, uiState.listening, uiState.transcribing]);

  function handleTranscript(text: string, isFinal: boolean) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLiveDraft(trimmed);
    if (!isFinal) return;
    setMicActive(false);
    onTranscript(trimmed);
    onClose();
  }

  const statusLine = uiState.transcribing
    ? 'Cevriliyor…'
    : uiState.listening
      ? 'Dinliyorum…'
      : isExpoGo
        ? 'Dokun — ses önizlemesi'
        : 'Ne aramak istediğini söyle';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Kapat" />

        <View style={styles.ghost} pointerEvents="none">
          <View style={styles.ghostSearch} />
          <View style={styles.ghostChips} />
          <View style={styles.ghostBanner} />
          <View style={[styles.ghostBanner, styles.ghostBannerShort]} />
          <View style={styles.ghostStrip} />
        </View>

        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={22} color={GastroColors.text} />
          </Pressable>
        </View>

        <View style={styles.stage}>
          {EXAMPLE_ITEMS.map((item, index) => (
            <FloatingExampleChip
              key={item.text}
              text={item.text}
              layout={CHIP_LAYOUT[item.position]}
              index={index}
            />
          ))}

          <View style={styles.orbStack}>
            <VoiceListenOrb listening={uiState.listening} transcribing={uiState.transcribing} />
            <View style={styles.orbTouch}>
              {isExpoGo ? (
                <Pressable
                  style={styles.orbHit}
                  onPress={runVoiceDemo}
                  accessibilityRole="button"
                  accessibilityLabel="Sesli arama demo"
                />
              ) : (
                <SpeechMicErrorBoundary>
                  <GastroVoiceMicButton
                    orbOverlay
                    active={micActive}
                    onTranscript={handleTranscript}
                    onUiStateChange={setUiState}
                  />
                </SpeechMicErrorBoundary>
              )}
            </View>
          </View>

          <Text style={styles.status}>{statusLine}</Text>
          {isExpoGo ? <Text style={styles.demoNote}>Expo Go — gerçek mikrofon build gerektirir</Text> : null}
          {liveDraft ? (
            <Text style={styles.draft} numberOfLines={2}>
              “{liveDraft}”
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  ghost: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 12,
    paddingTop: 88,
    gap: 6,
    opacity: 0.09,
  },
  ghostSearch: {
    height: 40,
    borderRadius: 10,
    backgroundColor: GastroColors.panel,
  },
  ghostChips: {
    height: 28,
    borderRadius: 999,
    backgroundColor: GastroColors.panel,
    width: '72%',
  },
  ghostBanner: {
    flex: 1.1,
    borderRadius: 11,
    backgroundColor: GastroColors.panel,
    maxHeight: 72,
  },
  ghostBannerShort: {
    flex: 0.9,
    maxHeight: 64,
  },
  ghostStrip: {
    flex: 1.4,
    borderRadius: 12,
    backgroundColor: GastroColors.panel,
    marginBottom: 100,
  },
  topBar: {
    paddingHorizontal: 16,
    alignItems: 'flex-end',
    zIndex: 2,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: 'rgba(30,30,30,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: -24,
  },
  orbStack: {
    width: VOICE_ORB_SIZE,
    minHeight: VOICE_ORB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbTouch: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbHit: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  status: {
    marginTop: 18,
    color: 'rgba(255,107,53,0.62)',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  demoNote: {
    marginTop: 6,
    color: GastroColors.gold,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.85,
  },
  draft: {
    marginTop: 10,
    color: GastroColors.gold,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
});
