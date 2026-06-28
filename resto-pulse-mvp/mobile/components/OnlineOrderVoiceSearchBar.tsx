import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { GastroVoiceMicButton, type VoiceMicUiState } from '@/components/GastroVoiceMicButton';
import { SpeechMicErrorBoundary } from '@/components/SpeechMicErrorBoundary';
import type { GastroColorScheme } from '@/constants/theme';
import { GastroColorsLight } from '@/constants/theme';
import { useGastroTheme } from '@/context/theme-context';
import { parseVoiceOrderQuery, type VoiceOrderQuery } from '@/lib/parse-voice-order-query';
import { polishVoiceOrderQueryTranscript } from '@/lib/voice-order-stt-fix';

type Props = {
  initialDraft?: string;
  searching?: boolean;
  onSearch: (query: VoiceOrderQuery) => void;
  tone?: 'default' | 'light';
  children?: ReactNode;
};

export function OnlineOrderVoiceSearchBar({
  initialDraft,
  searching = false,
  onSearch,
  tone = 'default',
  children,
}: Props) {
  const { colors } = useGastroTheme();
  const ink = tone === 'light' ? GastroColorsLight : colors;
  const styles = useMemo(() => createStyles(colors, tone), [colors, tone]);
  const [draft, setDraft] = useState('');
  const [micHint, setMicHint] = useState<string | null>(null);
  const [micUiState, setMicUiState] = useState<VoiceMicUiState>({
    listening: false,
    transcribing: false,
  });
  const parsed = useMemo(() => parseVoiceOrderQuery(draft), [draft]);
  const canSearch = (parsed.isCartOrder || parsed.voiceProduct != null) && !searching;

  useEffect(() => {
    setDraft(initialDraft?.trim() ?? '');
  }, [initialDraft]);

  useEffect(() => {
    if (micUiState.listening) {
      setDraft('');
      setMicHint(null);
    }
  }, [micUiState.listening]);

  const handleSearch = useCallback(() => {
    if (!canSearch) return;
    onSearch(parsed);
  }, [canSearch, onSearch, parsed]);

  const handleVoiceTranscript = useCallback(
    (text: string, isFinal: boolean) => {
      const polished = polishVoiceOrderQueryTranscript(text);
      if (!polished) {
        if (isFinal) setDraft('');
        return;
      }
      setDraft(polished);
      if (!isFinal) return;
      if (searching) return;
      const query = parseVoiceOrderQuery(polished);
      if (query.voiceProduct || query.isCartOrder) {
        onSearch(query);
      }
    },
    [onSearch, searching],
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.searchGroup}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={ink.muted} style={styles.searchIcon} />
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="150 TL lahmacun, cantık…"
            placeholderTextColor={ink.placeholder}
            style={styles.input}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            editable={!searching}
            onSubmitEditing={handleSearch}
          />
          <SpeechMicErrorBoundary compact>
            <GastroVoiceMicButton
              compact
              active={!searching}
              autoStart={false}
              disabled={searching || micUiState.transcribing}
              onTranscript={handleVoiceTranscript}
              onUiStateChange={setMicUiState}
              onHintChange={setMicHint}
            />
          </SpeechMicErrorBoundary>
        </View>
        {micHint ? <Text style={styles.micHint}>{micHint}</Text> : null}
        <Text style={styles.hint}>Örn: 150 TL lahmacun yaz yada dikte et</Text>
        {canSearch ? (
          <Pressable
            style={({ pressed }) => [styles.searchBtn, pressed && styles.searchBtnPressed]}
            onPress={handleSearch}
            accessibilityRole="button"
            accessibilityLabel="Gastro Sipariş ara">
            <Text style={styles.searchBtnText}>Ara</Text>
          </Pressable>
        ) : null}
      </View>
      {children ? (
        <>
          <View style={styles.sectionDivider} />
          <View style={styles.childrenBlock}>{children}</View>
        </>
      ) : null}
    </View>
  );
}

function createStyles(colors: GastroColorScheme, tone: 'default' | 'light') {
  const light = tone === 'light';
  const ink = light ? GastroColorsLight : colors;
  return StyleSheet.create({
    wrap: {
      gap: light ? 16 : 6,
      ...(light
        ? {
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: GastroColorsLight.border,
            padding: 16,
          }
        : {}),
    },
    searchGroup: { gap: 6 },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: ink.border,
      backgroundColor: ink.input,
      paddingHorizontal: 10,
      paddingVertical: 8,
      minHeight: 48,
    },
    searchIcon: { flexShrink: 0 },
    input: {
      flex: 1,
      minWidth: 0,
      color: ink.text,
      fontSize: 14,
      padding: 0,
    },
    micHint: { color: colors.gold, fontSize: 11, lineHeight: 15 },
    hint: {
      color: ink.muted,
      fontSize: 12,
      lineHeight: 16,
      paddingHorizontal: 2,
    },
    searchBtn: {
      alignSelf: 'flex-start',
      borderRadius: 10,
      backgroundColor: colors.accent,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    searchBtnPressed: { opacity: 0.92 },
    searchBtnText: {
      color: light ? GastroColorsLight.text : colors.accentDark,
      fontSize: 14,
      fontWeight: '800',
    },
    sectionDivider: {
      height: 1,
      backgroundColor: ink.border,
    },
    childrenBlock: { gap: 10 },
  });
}
