import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { eglenceLobbyTheme } from '@/components/eglence/EglenceGameLobbyScreen';
import { EGLENCE_ARCHIVE_DAY_COST } from '@/constants/eglence-archive';
import { GASTROCOIN_SHORT } from '@/constants/gastrocoin-theme';
import {
  buildSofraMonthGrid,
  canNavigateSofraMonth,
  formatSofraGunIdLong,
  formatSofraMonthYear,
  isSofraArchiveDay,
  monthGunIdFromGunId,
  shiftMonthGunId,
  SOFRA_WEEKDAY_LABELS,
} from '@/lib/kelime-sofrasi/sofra-archive';
import { fetchSofraArchiveDays } from '@/lib/kelime-sofrasi/puzzle-api';
import { activePuzzleId } from '@/lib/mini-sudoku/schedule';

type Props = {
  value: string;
  onChange: (gunId: string) => void;
  userEmail?: string | null;
  unlockedGunIds: Set<string>;
  onRequestUnlock: (gunId: string) => Promise<boolean>;
};

export function SofraDatePicker({
  value,
  onChange,
  userEmail,
  unlockedGunIds,
  onRequestUnlock,
}: Props) {
  const t = eglenceLobbyTheme('kelime-sofrasi');
  const [open, setOpen] = useState(false);
  const [monthGunId, setMonthGunId] = useState(() => monthGunIdFromGunId(value));
  const [poolDays, setPoolDays] = useState<Set<string>>(new Set());
  const [unlocking, setUnlocking] = useState(false);
  const archiveCost = EGLENCE_ARCHIVE_DAY_COST.kelime_sofrasi;

  useEffect(() => {
    if (!open) return;
    setMonthGunId(monthGunIdFromGunId(value));
    void fetchSofraArchiveDays().then((days) => {
      setPoolDays(new Set(days));
    });
  }, [open, value]);

  const cells = useMemo(() => buildSofraMonthGrid(monthGunId), [monthGunId]);
  const activeGunId = activePuzzleId();
  const archive = isSofraArchiveDay(value);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        trigger: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: t.panel,
          borderWidth: 1,
          borderColor: t.borderStrong,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          gap: 8,
        },
        triggerText: { flex: 1, color: t.text, fontSize: 15, fontWeight: '700' },
        triggerSub: { color: t.muted, fontSize: 12, marginTop: 2 },
        chevron: { color: t.muted, fontSize: 16, fontWeight: '700' },
        overlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.45)',
          justifyContent: 'center',
          padding: 20,
        },
        sheet: {
          backgroundColor: t.panel,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: t.border,
          padding: 14,
          gap: 10,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 16,
          elevation: 8,
        },
        monthRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        monthTitle: { color: t.text, fontSize: 16, fontWeight: '800' },
        navBtn: {
          width: 32,
          height: 32,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.accentSoft,
        },
        navBtnDisabled: { opacity: 0.35 },
        navBtnText: { color: t.text, fontSize: 16, fontWeight: '800' },
        weekdayRow: { flexDirection: 'row' },
        weekday: { flex: 1, textAlign: 'center', color: t.muted, fontSize: 12, fontWeight: '700' },
        grid: { flexDirection: 'row', flexWrap: 'wrap' },
        dayCell: {
          width: `${100 / 7}%`,
          aspectRatio: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 2,
        },
        dayInner: {
          width: 34,
          height: 34,
          borderRadius: 17,
          alignItems: 'center',
          justifyContent: 'center',
        },
        dayInnerSelected: { backgroundColor: '#2563eb' },
        dayInnerToday: { borderWidth: 1.5, borderColor: t.accent },
        dayInnerLocked: { opacity: 0.72 },
        dayText: { color: t.text, fontSize: 14, fontWeight: '600' },
        dayTextMuted: { color: t.muted, opacity: 0.55 },
        dayTextSelected: { color: '#fff', fontWeight: '800' },
        dayTextDisabled: { color: t.muted, opacity: 0.28 },
        poolDot: {
          position: 'absolute',
          bottom: 4,
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: t.accent,
        },
        lockMark: {
          position: 'absolute',
          top: 1,
          right: 1,
          fontSize: 8,
          color: t.muted,
        },
        legend: { color: t.muted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
      }),
    [t],
  );

  const isDayUnlocked = useCallback(
    (gunId: string | null) => {
      if (!gunId) return false;
      if (gunId >= activeGunId) return true;
      return unlockedGunIds.has(gunId);
    },
    [activeGunId, unlockedGunIds],
  );

  const handleSelect = useCallback(
    async (gunId: string | null, selectable: boolean) => {
      if (!gunId || !selectable || unlocking) return;

      if (isDayUnlocked(gunId)) {
        onChange(gunId);
        setOpen(false);
        return;
      }

      if (!userEmail) {
        Alert.alert(
          'Giriş gerekli',
          'Geçmiş günler için giriş yapıp GastroCoin ile arşiv günü açmalısın.',
        );
        return;
      }

      Alert.alert(
        'Arşiv günü aç',
        `${formatSofraGunIdLong(gunId)} sofrasını ${archiveCost} ${GASTROCOIN_SHORT} ile açmak ister misin?`,
        [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: `${archiveCost} ${GASTROCOIN_SHORT} harca`,
            onPress: () => {
              setUnlocking(true);
              void onRequestUnlock(gunId)
                .then((ok) => {
                  if (ok) {
                    onChange(gunId);
                    setOpen(false);
                  }
                })
                .finally(() => setUnlocking(false));
            },
          },
        ],
      );
    },
    [archiveCost, isDayUnlocked, onChange, onRequestUnlock, unlocking, userEmail],
  );

  const canPrev = canNavigateSofraMonth(monthGunId, -1);
  const canNext = canNavigateSofraMonth(monthGunId, 1);

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)} accessibilityRole="button">
        <View style={{ flex: 1 }}>
          <Text style={styles.triggerText}>{formatSofraGunIdLong(value)}</Text>
          <Text style={styles.triggerSub}>
            {archive
              ? `Arşiv · ${archiveCost} ${GASTROCOIN_SHORT}/gün (bir kez)`
              : `Bugün ücretsiz · arşiv ${archiveCost} ${GASTROCOIN_SHORT}/gün`}
          </Text>
        </View>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.monthRow}>
              <Pressable
                style={[styles.navBtn, !canPrev && styles.navBtnDisabled]}
                disabled={!canPrev}
                onPress={() => setMonthGunId((m) => shiftMonthGunId(m, -1))}>
                <Text style={styles.navBtnText}>‹</Text>
              </Pressable>
              <Text style={styles.monthTitle}>{formatSofraMonthYear(monthGunId)}</Text>
              <Pressable
                style={[styles.navBtn, !canNext && styles.navBtnDisabled]}
                disabled={!canNext}
                onPress={() => setMonthGunId((m) => shiftMonthGunId(m, 1))}>
                <Text style={styles.navBtnText}>›</Text>
              </Pressable>
            </View>

            <View style={styles.weekdayRow}>
              {SOFRA_WEEKDAY_LABELS.map((label) => (
                <Text key={label} style={styles.weekday}>
                  {label}
                </Text>
              ))}
            </View>

            <View style={styles.grid}>
              {cells.map((cell, index) => {
                const selected = cell.gunId === value;
                const today = cell.gunId === activeGunId;
                const disabled = !cell.selectable;
                const locked = cell.gunId != null && cell.selectable && !isDayUnlocked(cell.gunId);
                const hasPool = cell.gunId != null && poolDays.has(cell.gunId);
                const dayNum = cell.gunId ? Number(cell.gunId.split('-')[2]) : 0;
                return (
                  <Pressable
                    key={`${cell.gunId ?? 'x'}-${index}`}
                    style={styles.dayCell}
                    disabled={disabled || !cell.gunId || unlocking}
                    onPress={() => void handleSelect(cell.gunId, cell.selectable)}>
                    <View
                      style={[
                        styles.dayInner,
                        selected && styles.dayInnerSelected,
                        !selected && today && styles.dayInnerToday,
                        locked && styles.dayInnerLocked,
                      ]}>
                      <Text
                        style={[
                          styles.dayText,
                          !cell.inMonth && styles.dayTextMuted,
                          disabled && styles.dayTextDisabled,
                          selected && styles.dayTextSelected,
                        ]}>
                        {dayNum}
                      </Text>
                      {locked ? <Text style={styles.lockMark}>🔒</Text> : null}
                      {hasPool && !selected && !locked ? <View style={styles.poolDot} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.legend}>
              Bugün ücretsiz · arşiv günü {archiveCost} {GASTROCOIN_SHORT} (bir kez açılır)
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
