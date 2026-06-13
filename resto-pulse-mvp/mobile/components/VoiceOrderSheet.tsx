import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GastroVoiceMicButton } from '@/components/GastroVoiceMicButton';
import { SpeechMicErrorBoundary } from '@/components/SpeechMicErrorBoundary';
import { GastroColors } from '@/constants/theme';
import { useKeyboardBottomInset } from '@/hooks/use-keyboard-bottom-inset';
import { useKeyboardFieldFocus } from '@/hooks/use-keyboard-field-focus';
import { gastroSpeakListening, gastroStopSpeaking } from '@/lib/gastro-speak';
import {
  formatVoiceOrderSummary,
  parseVoiceOrderQuery,
  type VoiceOrderQuery,
} from '@/lib/parse-voice-order-query';
import { polishVoiceOrderQueryTranscript } from '@/lib/voice-order-stt-fix';

type Props = {
  visible: boolean;
  searching?: boolean;
  onClose: () => void;
  onSearch: (query: VoiceOrderQuery) => void;
};

const EXAMPLES = [
  '1 km mesafede 150 TL lahmacun',
  'Yakınımda 120 liraya kadar cantık',
  '200 TL adana kebap',
];

export function VoiceOrderSheet({ visible, searching = false, onClose, onSearch }: Props) {
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardBottomInset();
  const scrollRef = useRef<ScrollView>(null);
  const onFieldFocus = useKeyboardFieldFocus(scrollRef);
  const inputRowYRef = useRef(0);
  const [draft, setDraft] = useState('');
  const [micActive, setMicActive] = useState(true);

  const parsed = useMemo(() => parseVoiceOrderQuery(draft), [draft]);
  const canSearch = parsed.voiceProduct != null && parsed.priceMax != null && !searching;

  useEffect(() => {
    if (!visible) {
      setMicActive(false);
      gastroStopSpeaking();
      return;
    }
    setDraft('');
    setMicActive(false);
    gastroSpeakListening(() => setMicActive(true));
  }, [visible]);

  function applyExample(text: string) {
    setDraft(text);
  }

  function handleSearch() {
    if (!canSearch) return;
    setMicActive(false);
    onSearch(parsed);
  }

  function handleVoiceTranscript(text: string, isFinal: boolean) {
    const polished = polishVoiceOrderQueryTranscript(text);
    if (!polished) return;
    setDraft(polished);
    if (!isFinal || searching) return;
    const query = parseVoiceOrderQuery(polished);
    if (query.voiceProduct && query.priceMax != null) {
      setMicActive(false);
      onSearch(query);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent={false}>
      {visible ? (
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <KeyboardAvoidingView
          style={styles.keyboardWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={styles.scrollContent}
            bounces={false}>
            <Pressable
              style={[
                styles.sheet,
                { paddingBottom: Math.max(insets.bottom, 16) + keyboardInset },
              ]}
              onPress={(e) => e.stopPropagation()}>
              <View style={styles.handle} />
              <Text style={styles.kicker}>Gastro Sipariş</Text>
              <Text style={styles.title}>Ne arıyorsun?</Text>
              <Text style={styles.sub}>
                {Platform.OS === 'ios'
                  ? 'Mikrofona bas, tum cumleyi soyle (orn: 200 lira lahmacun). Bitirince tekrar dokun — metin geldikten sonra otomatik arar.'
                  : 'Mikrofona bas, tum cumleyi soyle (orn: 200 lira lahmacun). Bitirince tekrar dokun veya 2–3 sn sus — sonra otomatik arar.'}
              </Text>

              <View
                style={styles.inputRow}
                onLayout={(event) => {
                  inputRowYRef.current = event.nativeEvent.layout.y;
                }}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Örn: 1 km mesafede 150 TL lahmacun"
                  placeholderTextColor={GastroColors.muted}
                  multiline
                  style={[styles.input, styles.inputFlex]}
                  editable={!searching}
                  onFocus={() => onFieldFocus(inputRowYRef.current, 24)}
                />
                <SpeechMicErrorBoundary compact>
                  <GastroVoiceMicButton
                    compact
                    active={micActive}
                    autoStart={Platform.OS === 'ios' && micActive}
                    disabled={searching}
                    onTranscript={handleVoiceTranscript}
                  />
                </SpeechMicErrorBoundary>
              </View>

              <View style={styles.preview}>
                <Text style={styles.previewLabel}>Anladığım</Text>
                <Text style={styles.previewText}>{formatVoiceOrderSummary(parsed)}</Text>
                {parsed.issues.length > 0 && parsed.confidence !== 'high' ? (
                  <Text style={styles.previewIssues}>{parsed.issues.join(' ')}</Text>
                ) : null}
              </View>

              <View style={styles.examples}>
                {EXAMPLES.map((line) => (
                  <Pressable key={line} style={styles.exampleChip} onPress={() => applyExample(line)}>
                    <Text style={styles.exampleText}>{line}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.actions}>
                <Pressable style={styles.cancelBtn} onPress={onClose} disabled={searching}>
                  <Text style={styles.cancelText}>Kapat</Text>
                </Pressable>
                <Pressable
                  style={[styles.searchBtn, !canSearch && styles.searchBtnDisabled]}
                  onPress={handleSearch}
                  disabled={!canSearch}>
                  {searching ? (
                    <ActivityIndicator color="#141414" />
                  ) : (
                    <Text style={styles.searchText}>Ara</Text>
                  )}
                </Pressable>
              </View>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  keyboardWrap: { maxHeight: '92%' },
  scrollContent: { flexGrow: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: '#1a1210',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.35)',
    paddingHorizontal: 18,
    paddingTop: 10,
    gap: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: GastroColors.border,
    marginBottom: 4,
  },
  kicker: {
    color: GastroColors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  title: { color: GastroColors.text, fontSize: 22, fontWeight: '900' },
  sub: { color: GastroColors.muted, fontSize: 13, lineHeight: 18 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  inputFlex: { flex: 1 },
  input: {
    minHeight: 72,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.panel,
    color: GastroColors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  preview: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.panel,
    padding: 12,
    gap: 4,
  },
  previewLabel: { color: GastroColors.muted, fontSize: 11, fontWeight: '700' },
  previewText: { color: GastroColors.text, fontSize: 15, fontWeight: '700' },
  previewIssues: { color: GastroColors.gold, fontSize: 12, lineHeight: 17 },
  examples: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  exampleChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: GastroColors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: GastroColors.panel,
  },
  exampleText: { color: GastroColors.muted, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GastroColors.border,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: { color: GastroColors.muted, fontWeight: '700' },
  searchBtn: {
    flex: 1.4,
    borderRadius: 14,
    backgroundColor: GastroColors.gold,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  searchBtnDisabled: { opacity: 0.45 },
  searchText: { color: '#141414', fontSize: 16, fontWeight: '900' },
});
