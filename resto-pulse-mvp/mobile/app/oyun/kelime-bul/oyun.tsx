import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, InteractionManager, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EglenceGameLobbyScreen } from '@/components/eglence/EglenceGameLobbyScreen';
import { EglenceResultModal } from '@/components/eglence/EglenceResultModal';
import { KelimeBulGrid } from '@/components/kelime-bul/KelimeBulGrid';
import { KelimeBulWordList } from '@/components/kelime-bul/KelimeBulWordList';
import { eglenceLobbyTheme } from '@/constants/eglence-card-art-theme';
import {
  eslesenKelime,
  hucreAnahtar,
  hucrelerBulunanKelimeler,
  uretKelimeBulBulmaca,
  yolMetni,
} from '@/lib/kelime-bul/engine';
import {
  freshKelimeBulProgress,
  loadKelimeBulSession,
  saveKelimeBulSession,
  type KelimeBulProgress,
} from '@/lib/kelime-bul/storage';
import { sofraKelimeBuyuk } from '@/lib/kelime-sofrasi/turkce-harf';

function safeHaptic(fn: () => Promise<unknown>): void {
  void fn().catch(() => undefined);
}

function pathToCellKeys(path: { row: number; col: number }[]): Set<string> {
  const keys = new Set<string>();
  for (const { row, col } of path) keys.add(hucreAnahtar(row, col));
  return keys;
}

export default function KelimeBulOyunScreen() {
  const t = eglenceLobbyTheme('kelime-bul');
  const router = useRouter();
  const { puzzleId: puzzleIdParam } = useLocalSearchParams<{ puzzleId?: string }>();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<KelimeBulProgress | null>(null);
  const [foundCellKeys, setFoundCellKeys] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [gridSelecting, setGridSelecting] = useState(false);
  const progressRef = useRef<KelimeBulProgress | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  progressRef.current = progress;

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const scheduleSave = useCallback((next: KelimeBulProgress) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void saveKelimeBulSession(next);
    }, 120);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const puzzleId = typeof puzzleIdParam === 'string' ? puzzleIdParam : '';
      if (!puzzleId) {
        router.back();
        return;
      }
      const existing = await loadKelimeBulSession();
      if (existing?.puzzleId === puzzleId) {
        if (!cancelled) {
          setProgress(existing);
          setLoading(false);
          if (existing.completedAt) setShowComplete(true);
          InteractionManager.runAfterInteractions(() => {
            if (!cancelled) {
              setFoundCellKeys(hucrelerBulunanKelimeler(existing.grid, existing.foundWords));
            }
          });
        }
        return;
      }
      try {
        const puzzle = uretKelimeBulBulmaca(puzzleId);
        const fresh = freshKelimeBulProgress(puzzle);
        if (!cancelled) {
          progressRef.current = fresh;
          setProgress(fresh);
          setFoundCellKeys(new Set());
          setLoading(false);
        }
        void saveKelimeBulSession(fresh);
      } catch {
        if (!cancelled) {
          setLoading(false);
          router.back();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [puzzleIdParam, router]);

  const persistProgress = useCallback(
    (next: KelimeBulProgress) => {
      progressRef.current = next;
      setProgress(next);
      scheduleSave(next);
    },
    [scheduleSave],
  );

  const onSelectionEnd = useCallback(
    (path: { row: number; col: number }[]) => {
      const prev = progressRef.current;
      if (!prev || prev.completedAt) return;

      const text = yolMetni(prev.grid, path);
      const found = new Set(prev.foundWords.map(sofraKelimeBuyuk));
      const remaining = prev.words.filter((w) => !found.has(sofraKelimeBuyuk(w)));
      const match = eslesenKelime(text, remaining);

      if (!match) {
        safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
        setMessage('Bu kelime listede yok');
        return;
      }

      const canonical = sofraKelimeBuyuk(match);
      if (found.has(canonical)) {
        setMessage('Zaten bulundu');
        return;
      }

      safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
      const foundWords = [...prev.foundWords, canonical];
      const completedAt =
        foundWords.length >= prev.words.length ? new Date().toISOString() : null;
      const next: KelimeBulProgress = { ...prev, foundWords, completedAt };

      setFoundCellKeys((keys) => {
        const merged = new Set(keys);
        for (const key of pathToCellKeys(path)) merged.add(key);
        return merged;
      });
      persistProgress(next);
      setMessage(`+ ${canonical}`);
      if (completedAt) setShowComplete(true);
    },
    [persistProgress],
  );

  const gridTheme = useMemo(
    () => ({
      text: t.text,
      muted: t.muted,
      accent: t.accent,
      accentSoft: t.accentSoft,
      panel: t.panel,
      border: t.border,
      foundSoft: 'rgba(76, 175, 121, 0.35)',
    }),
    [t],
  );

  const listTheme = useMemo(
    () => ({
      text: t.text,
      muted: t.muted,
      accent: t.accent,
      panel: t.panel,
      border: t.border,
    }),
    [t],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: { padding: 16, gap: 16, paddingBottom: 32 },
        message: {
          textAlign: 'center',
          color: t.accent,
          fontWeight: '700',
          minHeight: 20,
        },
        backBtn: {
          alignSelf: 'center',
          paddingVertical: 10,
        },
        backText: { color: t.muted, fontSize: 14, fontWeight: '600' },
      }),
    [t],
  );

  if (loading || !progress) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg }}>
        <ActivityIndicator color={t.accent} />
      </View>
    );
  }

  return (
    <>
      <EglenceGameLobbyScreen gameId="kelime-bul" scroll={false} edges={['left', 'right', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.content}
          scrollEnabled={!gridSelecting}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={false}
          showsVerticalScrollIndicator={false}>
          <KelimeBulGrid
            grid={progress.grid}
            foundCellKeys={foundCellKeys}
            disabled={Boolean(progress.completedAt)}
            theme={gridTheme}
            onSelectingChange={setGridSelecting}
            onSelectionEnd={onSelectionEnd}
          />
          <Text style={styles.message}>{message ?? ' '}</Text>
          <KelimeBulWordList words={progress.words} foundWords={progress.foundWords} theme={listTheme} />
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>Lobiye dön</Text>
          </Pressable>
        </ScrollView>
      </EglenceGameLobbyScreen>

      <EglenceResultModal
        visible={showComplete}
        onClose={() => setShowComplete(false)}
        onDone={() => {
          setShowComplete(false);
          router.back();
        }}
        gameLabel="Kelime Bul"
        periodKey={progress.periodId}
        scoreDetail="Tüm kelimeleri buldun!"
        showLeaderboard={false}
      />
    </>
  );
}
