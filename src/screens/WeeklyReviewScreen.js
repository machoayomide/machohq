import React from 'react';
import { View, Text, ScrollView, StyleSheet, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import { Card, Badge, ProgressBar, Btn } from '../components/UI';

export default function WeeklyReviewScreen({ data, team, prospects, earnings, dailyActions, books }) {
  const insets = useSafeAreaInsets();
  const score = Math.round(((dailyActions || []).filter(a => a.done).length / ((dailyActions || []).length || 1)) * 100);
  const totalPV = (team || []).reduce((s, m) => s + m.pv, 0);
  const totalProspects = (prospects || []).length;
  const joinedCount = (prospects || []).filter(p => p.stage === 7).length;
  const totalEarned = (earnings || []).reduce((s, e) => s + e.net, 0);
  const booksReading = (books || []).filter(b => b.started && !b.completed).length;
  const booksCompleted = (books || []).filter(b => b.completed).length;

  const weekMetrics = [
    { label: 'QPV Progress', value: `${data?.qpv || 0} / 750`, pct: ((data?.qpv || 0) / 750) * 100, color: COLORS.primary },
    { label: 'Prospects in pipeline', value: totalProspects, pct: Math.min(100, totalProspects * 10), color: COLORS.accent },
    { label: 'Converted to Joined', value: joinedCount, pct: totalProspects > 0 ? (joinedCount / totalProspects) * 100 : 0, color: COLORS.primary },
    { label: 'Team PV total', value: totalPV, pct: Math.min(100, (totalPV / 750) * 100), color: COLORS.blue },
    { label: 'Freelance earned', value: `$${totalEarned.toFixed(0)}`, pct: Math.min(100, totalEarned * 2), color: COLORS.primary },
    { label: 'Books in progress', value: booksReading, pct: booksReading > 0 ? 50 : 0, color: COLORS.accent },
  ];

  const shareReport = async () => {
    const report = `MachoHQ Weekly Review\n` +
      `Date: ${new Date().toLocaleDateString()}\n` +
      `Macho Score: ${score}/100\n` +
      `Streak: ${data?.streak || 0} days\n\n` +
      `QPV: ${data?.qpv || 0} / 750\n` +
      `Team size: ${(team || []).length}\n` +
      `Team PV: ${totalPV}\n` +
      `Prospects: ${totalProspects}\n` +
      `Joined: ${joinedCount}\n` +
      `Earnings: $${totalEarned.toFixed(2)}\n\n` +
      `Director Challenge: Month 1 of 6\n` +
      `— MachoHQ: Your Operating System`;

    try {
      await Share.share({ message: report });
    } catch {}
  };

  return (
    <ScrollView style={[s.container, { paddingTop: 12 }]} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={s.title}>Weekly Review</Text>
      <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 16 }}>
        Week of {new Date().toLocaleDateString('en', { month: 'long', day: 'numeric' })}
      </Text>

      {/* Score Summary */}
      <Card glow={score >= 70 ? COLORS.primary : COLORS.warn}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: COLORS.t3, fontSize: 10 }}>WEEKLY SCORE</Text>
            <Text style={{ fontSize: 36, fontWeight: '800', color: COLORS.t1 }}>{score}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Badge text={`${data?.streak || 0}-day streak`} color={COLORS.primary} />
            <Text style={{ color: COLORS.t3, fontSize: 10, marginTop: 4 }}>
              {score >= 80 ? 'Strong week' : score >= 60 ? 'Decent — room to grow' : 'Needs work'}
            </Text>
          </View>
        </View>
      </Card>

      {/* Director Challenge Status */}
      <Card>
        <Text style={{ color: COLORS.accent, fontSize: 10, fontWeight: '600', letterSpacing: 1, marginBottom: 6 }}>DIRECTOR CHALLENGE — MONTH 1</Text>
        <ProgressBar value={data?.qpv || 0} max={750} height={8} color={COLORS.accent} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <Text style={{ color: COLORS.t3, fontSize: 10 }}>{data?.qpv || 0} QPV</Text>
          <Text style={{ color: COLORS.t3, fontSize: 10 }}>Target: 750</Text>
        </View>
      </Card>

      {/* Metrics */}
      <Card>
        <Text style={{ color: COLORS.t2, fontSize: 13, fontWeight: '600', marginBottom: 12 }}>This week's numbers</Text>
        {weekMetrics.map((m, i) => (
          <View key={i} style={[s.metricRow, i < weekMetrics.length - 1 && { borderBottomWidth: 1, borderBottomColor: COLORS.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ color: COLORS.t2, fontSize: 12 }}>{m.label}</Text>
              <Text style={{ color: COLORS.t1, fontSize: 13, fontWeight: '600' }}>{m.value}</Text>
            </View>
            <ProgressBar value={m.pct} max={100} color={m.color} height={4} />
          </View>
        ))}
      </Card>

      {/* Team Status */}
      {(team || []).length > 0 && (
        <Card>
          <Text style={{ color: COLORS.t2, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Team status</Text>
          {(team || []).map(m => (
            <View key={m.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
              <View>
                <Text style={{ color: COLORS.t1, fontSize: 12 }}>{m.name}</Text>
                <Text style={{ color: COLORS.t3, fontSize: 10 }}>{m.status}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: m.pv >= 250 ? COLORS.primary : COLORS.danger, fontSize: 12, fontWeight: '600' }}>{m.pv} PV</Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* Share */}
      <Btn full onPress={shareReport} style={{ marginBottom: 12 }}>Share report via WhatsApp</Btn>
      <Btn full outline onPress={shareReport}>Export as text</Btn>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.t1, marginBottom: 4 },
  metricRow: { paddingVertical: 8 },
});