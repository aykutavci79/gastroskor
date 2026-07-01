import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { GastroColorsOnlineOrder } from '@/constants/online-order-theme';
import { formatVoiceOrderSummary, type VoiceOrderQuery } from '@/lib/parse-voice-order-query';
import type { VoiceOrderRestaurantOption } from '@/lib/voice-order-letters';

type Props = {
  voiceQuery: VoiceOrderQuery;
  voiceSearchExpanded: boolean;
  cityLabel: string;
  voiceRestaurantOptions: VoiceOrderRestaurantOption[];
  itemsCount: number;
  onEditSearch: () => void;
  onOpenCommand: () => void;
  onExitVoice: () => void;
};

export function OnlineOrderVoiceResultBanner({
  voiceQuery,
  voiceSearchExpanded,
  cityLabel,
  voiceRestaurantOptions,
  itemsCount,
  onEditSearch,
  onOpenCommand,
  onExitVoice,
}: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.banner}>
      <View style={styles.topRow}>
        <Text style={styles.label}>{t('order.voiceSearchLabel')}</Text>
        <View style={styles.actions}>
          <Pressable onPress={onEditSearch} hitSlop={8}>
            <Text style={styles.link}>{t('order.retrySearch')}</Text>
          </Pressable>
          <Pressable onPress={onExitVoice} hitSlop={8}>
            <Text style={styles.linkMuted}>{t('order.backToList')}</Text>
          </Pressable>
        </View>
      </View>
      <Text style={styles.summary}>{formatVoiceOrderSummary(voiceQuery)}</Text>
      {voiceSearchExpanded ? (
        <Text style={styles.hint}>
          {t('order.voiceOutsideCity', { city: cityLabel })}
        </Text>
      ) : null}
      {voiceRestaurantOptions.length > 0 ? (
        <Text style={styles.legend} numberOfLines={3}>
          {t('order.voiceCommandLetter')}{' '}
          {voiceRestaurantOptions.map((row) => `${row.letter}=${row.name}`).join(' · ')}
        </Text>
      ) : null}
      {itemsCount > 0 ? (
        <Pressable style={styles.commandLink} onPress={onOpenCommand}>
          <Text style={styles.link}>{t('order.voiceCommandInput')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const ink = GastroColorsOnlineOrder;

const styles = StyleSheet.create({
  banner: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ink.border,
    backgroundColor: ink.panel,
    padding: 12,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  actions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  label: {
    color: ink.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    flex: 1,
  },
  summary: { color: ink.text, fontSize: 15, fontWeight: '700' },
  hint: { color: ink.muted, fontSize: 12, lineHeight: 16, marginTop: 4 },
  legend: { color: ink.muted, fontSize: 11, lineHeight: 15, marginTop: 2 },
  link: { color: ink.accent, fontSize: 13, fontWeight: '700' },
  linkMuted: { color: ink.muted, fontSize: 13, fontWeight: '700' },
  commandLink: { marginTop: 2, alignSelf: 'flex-start', paddingVertical: 4 },
});
