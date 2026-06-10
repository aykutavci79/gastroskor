import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { PanelMenuSection } from '@/components/panel/PanelMenuSection';
import { PanelPromoSection } from '@/components/panel/PanelPromoSection';
import { Screen } from '@/components/ui/Screen';
import { GastroColors, GastroStyles } from '@/constants/theme';
import { useSession } from '@/context/session-context';
import {
  analyzePanelCompetitor,
  getPanelAccess,
  getPanelAiReportTrend,
  getPanelDashboard,
} from '@/lib/api';
import type { AiReportTrend, CompetitorAiReport, PanelAccess, PanelDashboard } from '@/lib/types';

export default function PanelScreen() {
  const { user, loading: sessionLoading } = useSession();
  const [access, setAccess] = useState<PanelAccess | null>(null);
  const [dashboard, setDashboard] = useState<PanelDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiReport, setAiReport] = useState<CompetitorAiReport | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiTrend, setAiTrend] = useState<AiReportTrend | null>(null);

  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getPanelAccess(user.email)
      .then(async (acc) => {
        setAccess(acc);
        if (acc.can_access_panel) {
          const dash = await getPanelDashboard(user.email);
          setDashboard(dash);
          if ((dash.ai_reports?.length ?? 0) >= 2) {
            getPanelAiReportTrend(user.email).then(setAiTrend).catch(() => setAiTrend(null));
          } else {
            setAiTrend(null);
          }
        } else {
          setDashboard(null);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Panel yuklenemedi'))
      .finally(() => setLoading(false));
  }, [user?.email]);

  if (sessionLoading || loading) {
    return (
      <Screen scroll={false}>
        <ActivityIndicator color={GastroColors.accent} style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen>
        <View style={styles.hero}>
          <Text style={styles.title}>Isletme paneli</Text>
          <Text style={styles.sub}>Once Hesap sekmesinden webdeki Google e-postanizi baglayin.</Text>
        </View>
        <Link href="/(tabs)/profil" asChild>
          <Pressable style={styles.btn}>
            <Text style={styles.btnText}>Hesaba git</Text>
          </Pressable>
        </Link>
      </Screen>
    );
  }

  if (!access?.has_ownership) {
    return (
      <Screen>
        <View style={styles.hero}>
          <Text style={styles.title}>Mekan kaydi yok</Text>
          <Text style={styles.sub}>Isletmenizi Google uzerinden dogrulayarak panele baglayin.</Text>
        </View>
        <Link href="/panel/claim" asChild>
          <Pressable style={styles.btn}>
            <Text style={styles.btnText}>Mekan kaydet</Text>
          </Pressable>
        </Link>
      </Screen>
    );
  }

  const subscriptionActive =
    access.subscription_status === 'trial' || access.subscription_status === 'active';

  return (
    <Screen refreshing={false}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Restoran paneli</Text>
        <Text style={styles.title}>{access.restaurant_name ?? 'Isletme'}</Text>
        {access.trial_days_left != null ? (
          <Text style={styles.sub}>Deneme: {access.trial_days_left} gun kaldi</Text>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {dashboard ? (
        <View style={styles.stats}>
          <Stat label="Acik sikayet" value={String(dashboard.summary.open_feedback_count)} />
          <Stat label="Google" value={dashboard.ratings.google_rating?.toFixed(1) ?? '—'} />
          <Stat label="Gastro" value={dashboard.ratings.gastro_avg_rating?.toFixed(1) ?? '—'} />
        </View>
      ) : null}

      <PanelPromoSection userEmail={user.email} subscriptionActive={subscriptionActive} />
      <PanelMenuSection userEmail={user.email} subscriptionActive={subscriptionActive} />

      {dashboard?.competitors?.length ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Rakipler ve AI</Text>
          {dashboard.competitors.map((c) => (
            <View key={c.id} style={styles.competitorRow}>
              <Text style={styles.competitorName}>{c.name}</Text>
              <Pressable
                disabled={analyzingId === c.id}
                onPress={async () => {
                  setAnalyzingId(c.id);
                  try {
                    const report = await analyzePanelCompetitor(user.email, c.id);
                    setAiReport(report);
                    const dash = await getPanelDashboard(user.email);
                    setDashboard(dash);
                    if ((dash.ai_reports?.length ?? 0) >= 2) {
                      getPanelAiReportTrend(user.email).then(setAiTrend).catch(() => setAiTrend(null));
                    }
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'AI hatasi');
                  } finally {
                    setAnalyzingId(null);
                  }
                }}>
                <Text style={styles.link}>
                  {analyzingId === c.id ? 'Analiz...' : 'AI analiz'}
                </Text>
              </Pressable>
            </View>
          ))}
          {aiReport ? (
            <Text style={styles.aiSummary} numberOfLines={8}>
              {aiReport.comparison_summary}
              {aiReport.saved_report_id ? '\n\n(Ozet rapor kaydedildi.)' : ''}
            </Text>
          ) : null}
        </View>
      ) : null}

      {dashboard?.ai_reports && dashboard.ai_reports.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>AI rapor gecmisi</Text>
          {aiTrend?.available && aiTrend.summary ? (
            <Text style={styles.trendText} numberOfLines={6}>
              {aiTrend.period_from && aiTrend.period_to
                ? `${aiTrend.period_from} — ${aiTrend.period_to}: `
                : ''}
              {aiTrend.summary}
            </Text>
          ) : null}
          {dashboard.ai_reports.slice(0, 6).map((row) => (
            <Text key={row.id} style={styles.reportLine} numberOfLines={2}>
              {row.created_at
                ? new Date(row.created_at).toLocaleDateString('tr-TR')
                : '—'}{' '}
              · {row.competitor_name}
            </Text>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 4 },
  kicker: { color: GastroColors.accent, fontSize: 11, fontWeight: '700' },
  title: { color: GastroColors.text, fontSize: 22, fontWeight: '800' },
  sub: { color: GastroColors.muted, fontSize: 13 },
  btn: {
    ...GastroStyles.btnPrimary,
    padding: 14,
  },
  btnText: GastroStyles.btnPrimaryText,
  stats: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1,
    backgroundColor: GastroColors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GastroColors.border,
    padding: 12,
    alignItems: 'center',
  },
  statValue: { color: GastroColors.text, fontSize: 18, fontWeight: '800' },
  statLabel: { color: GastroColors.muted, fontSize: 10, marginTop: 2 },
  card: {
    ...GastroStyles.card,
    gap: 8,
  },
  cardTitle: { color: GastroColors.text, fontWeight: '700' },
  competitorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  competitorName: { ...GastroStyles.bodyText, flex: 1 },
  link: { ...GastroStyles.linkText, fontSize: 12 },
  aiSummary: { color: GastroColors.muted, fontSize: 12, lineHeight: 18 },
  trendText: { color: GastroColors.accent, fontSize: 12, lineHeight: 18 },
  reportLine: { color: GastroColors.muted, fontSize: 12 },
  error: GastroStyles.errorText,
});
