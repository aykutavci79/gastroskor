import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { HubPressable } from '@/components/eglence/HubPressable';
import {
  HUB_TASKS,
  type HubFollowProgress,
  type HubTaskDef,
  type HubTaskId,
  type HubTaskState,
} from '@/constants/eglence-hub';
import { HUB_TASK_IMAGES } from '@/constants/hub-task-images';
import { GASTROCOIN_SHORT, GastroCoinTheme } from '@/constants/gastrocoin-theme';
import { useGastroTheme } from '@/context/theme-context';

/** Açıkken en fazla ~2 görev satırı — sayfa oyunları aşağı itmesin */
export const HUB_TASK_LIST_MAX_HEIGHT = 272;

type Props = {
  taskStates: Record<HubTaskId, HubTaskState>;
  followProgress: HubFollowProgress;
  dailyLoginGranted: boolean;
  expanded: boolean;
  onToggle: () => void;
  onTaskPress: (task: HubTaskDef, anchor?: { x: number; y: number }) => void;
};

function isTaskDone(
  task: HubTaskDef,
  taskStates: Record<HubTaskId, HubTaskState>,
  followProgress: HubFollowProgress,
  dailyLoginGranted: boolean,
): boolean {
  if (task.id === 'daily-login') return dailyLoginGranted;
  if (task.id === 'follow') return followProgress.granted;
  return taskStates[task.id] === 'done';
}

function sortTasksByCompletion(
  taskStates: Record<HubTaskId, HubTaskState>,
  followProgress: HubFollowProgress,
  dailyLoginGranted: boolean,
): HubTaskDef[] {
  return [...HUB_TASKS]
    .map((task, index) => ({ task, index }))
    .sort((a, b) => {
      const aDone = isTaskDone(a.task, taskStates, followProgress, dailyLoginGranted);
      const bDone = isTaskDone(b.task, taskStates, followProgress, dailyLoginGranted);
      if (aDone !== bDone) return aDone ? 1 : -1;
      return a.index - b.index;
    })
    .map(({ task }) => task);
}

function remainingCount(
  states: Record<HubTaskId, HubTaskState>,
  followProgress: HubFollowProgress,
  dailyLoginGranted: boolean,
): number {
  return HUB_TASKS.filter((task) => {
    if (task.id === 'daily-login') return !dailyLoginGranted;
    if (task.id === 'follow') return !followProgress.granted;
    return states[task.id] !== 'done';
  }).length;
}

function followRemainingLabel(progress: HubFollowProgress): string {
  if (progress.granted) return 'Tamamlandı';
  const left = Math.max(0, progress.target - progress.current);
  if (left <= 0) return 'Ödül hazır';
  return `${left} kaldı`;
}

function TaskProgressBar({
  current,
  target,
}: {
  current: number;
  target: number;
}) {
  const { colors } = useGastroTheme();
  const filled = Math.min(Math.max(current, 0), target);

  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressTrack}>
        {Array.from({ length: target }, (_, index) => {
          const active = index < filled;
          return (
            <View
              key={index}
              style={[
                styles.progressSegment,
                { backgroundColor: colors.input, borderColor: colors.border },
                active && { backgroundColor: colors.accent, borderColor: colors.accent },
              ]}>
              {active ? <Ionicons name="heart" size={11} color="#FFFFFF" /> : null}
            </View>
          );
        })}
      </View>
      <Text style={[styles.progressHint, { color: colors.muted }]}>
        {filled}/{target}
      </Text>
    </View>
  );
}

function TaskRow({
  task,
  state,
  followProgress,
  dailyLoginGranted,
  onPress,
}: {
  task: HubTaskDef;
  state: HubTaskState;
  followProgress: HubFollowProgress;
  dailyLoginGranted: boolean;
  onPress: (anchor?: { x: number; y: number }) => void;
}) {
  const { colors } = useGastroTheme();
  const ctaAnchorRef = useRef<View>(null);
  const isFollow = task.id === 'follow';
  const isDailyLogin = task.id === 'daily-login';
  const done = isFollow
    ? followProgress.granted
    : isDailyLogin
      ? dailyLoginGranted
      : state === 'done';
  const taskImage = HUB_TASK_IMAGES[task.id];
  const followReady =
    isFollow && !followProgress.granted && followProgress.current >= followProgress.target;
  const ctaLabel = isFollow
    ? followReady
      ? 'Ödülü al'
      : task.cta
    : task.cta;
  const isClaimCta = ctaLabel === 'Ödülü al';

  function handlePress() {
    if (isClaimCta && ctaAnchorRef.current) {
      ctaAnchorRef.current.measureInWindow((x, y, width, height) => {
        onPress({ x: x + width / 2, y: y + height / 2 });
      });
    } else {
      onPress();
    }
  }

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.panel,
          borderColor: state === 'active' || followReady ? colors.accent : colors.border,
        },
        (state === 'active' || followReady) && !done ? styles.rowActive : null,
      ]}>
      <View style={styles.rowMain}>
        <View style={styles.rowTop}>
          <View style={[styles.iconWrap, { backgroundColor: task.iconBg, borderColor: task.iconColor }]}>
            {taskImage ? (
              <Image
                source={taskImage}
                style={[styles.taskImage, done && styles.taskImageDone]}
                contentFit="cover"
                accessibilityLabel={task.title}
              />
            ) : (
              <Ionicons name={task.icon} size={22} color={task.iconColor} />
            )}
          </View>
          <View style={styles.meta}>
            <Text
              style={[
                styles.title,
                { color: colors.text },
                done ? styles.titleDone : null,
              ]}>
              {task.title}
            </Text>
            <View style={styles.rewardRow}>
              <Ionicons name="logo-bitcoin" size={12} color={GastroCoinTheme.coinGold} />
              <Text style={[styles.reward, { color: colors.success }]}>+{task.reward} {GASTROCOIN_SHORT}</Text>
            </View>
            {isFollow && !done ? (
              <Text style={[styles.followSub, { color: colors.muted }]}>
                {followRemainingLabel(followProgress)}
              </Text>
            ) : null}
          </View>
          {done ? (
            <View style={[styles.doneBadge, { backgroundColor: 'rgba(76, 175, 121, 0.18)' }]}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={[styles.doneText, { color: colors.success }]}>Tamamlandı</Text>
            </View>
          ) : (
            <View ref={ctaAnchorRef} style={styles.ctaAnchor} collapsable={false}>
              <HubPressable
                onPress={handlePress}
                style={({ pressed }) => [
                  styles.cta,
                  { backgroundColor: followReady ? colors.gold : colors.accent },
                  pressed && { opacity: 0.9 },
                ]}>
                <Text style={[styles.ctaText, followReady && { color: '#1A1A1A' }]}>{ctaLabel}</Text>
              </HubPressable>
            </View>
          )}
        </View>
        {isFollow && !done ? (
          <TaskProgressBar current={followProgress.current} target={followProgress.target} />
        ) : null}
      </View>
    </View>
  );
}

export function EglenceTaskList({
  taskStates,
  followProgress,
  dailyLoginGranted,
  expanded,
  onToggle,
  onTaskPress,
}: Props) {
  const { colors } = useGastroTheme();
  const left = remainingCount(taskStates, followProgress, dailyLoginGranted);
  const sortedTasks = useMemo(
    () => sortTasksByCompletion(taskStates, followProgress, dailyLoginGranted),
    [taskStates, followProgress, dailyLoginGranted],
  );

  return (
    <View style={[styles.wrap, { backgroundColor: colors.panel, borderColor: colors.border }]}>
      <HubPressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel="Günlük Gastro-Görevler"
        style={({ pressed }) => [styles.header, pressed && { opacity: 0.88 }]}>
        <View style={styles.headerLeft}>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.muted}
          />
          <View style={styles.headerTextBlock}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Günlük Gastro-Görevler</Text>
            {!expanded ? (
              <Text style={[styles.headerSub, { color: colors.muted }]}>
                {HUB_TASKS.length} görev · {left > 0 ? 'dokun aç' : 'hepsi tamam'}
              </Text>
            ) : null}
          </View>
        </View>
        <Text style={[styles.headerHint, { color: colors.accent }]}>
          {left > 0 ? `${left} kaldı` : 'Hepsi tamam'}
        </Text>
      </HubPressable>
      {expanded ? (
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listContent}
          nestedScrollEnabled
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled">
          {sortedTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              state={taskStates[task.id]}
              followProgress={followProgress}
              dailyLoginGranted={dailyLoginGranted}
              onPress={(anchor) => onTaskPress(task, anchor)}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  headerTextBlock: { flex: 1, gap: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  headerSub: { fontSize: 11, fontWeight: '600' },
  headerHint: { fontSize: 13, fontWeight: '700' },
  listScroll: { maxHeight: HUB_TASK_LIST_MAX_HEIGHT },
  listContent: { gap: 10, paddingBottom: 2 },
  row: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  rowActive: { borderLeftWidth: 4 },
  rowMain: { gap: 10 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskImage: { width: '100%', height: '100%' },
  taskImageDone: { opacity: 0.55 },
  meta: { flex: 1, gap: 3 },
  title: { fontSize: 14, fontWeight: '800', lineHeight: 19 },
  titleDone: { textDecorationLine: 'line-through', opacity: 0.65 },
  followSub: { fontSize: 11, fontWeight: '700' },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reward: { fontSize: 12, fontWeight: '700' },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 64 },
  progressTrack: { flex: 1, flexDirection: 'row', gap: 6 },
  progressSegment: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressHint: { fontSize: 11, fontWeight: '800', minWidth: 28, textAlign: 'right' },
  ctaAnchor: {
    position: 'relative',
    zIndex: 2,
  },
  cta: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  ctaText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  doneText: { fontSize: 11, fontWeight: '800' },
});
