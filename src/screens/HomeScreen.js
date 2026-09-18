import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../theme';
import { Card, Badge, ProgressBar } from '../components/UI';
import { daysBetween, today, greeting, getData, setData } from '../utils/storage';
import { CHALLENGE } from '../data/constants';
import { requestPermissions, scheduleDailyNudges } from '../utils/notifications';

const QUICK_LINKS = [
  { key: 'focus',    icon: '⏱', label: 'Focus' },
  { key: 'tasks',    icon: '✓', label: 'Tasks' },
  { key: 'outreach', icon: '📲', label: 'Outreach' },
  { key: 'fiverr',   icon: '💼', label: 'Fiverr' },
  { key: 'books',    icon: '📖', label: 'Books' },
  { key: 'journal',  icon: '📝', label: 'Journal' },
  { key: 'score',    icon: '⚡', label: 'Score' },
  { key: 'calendar', icon: '📅', label: 'Calendar' },
];

export default function HomeScreen({ data, dailyActions, toggleAction, team, prospects, profile, onOpenBrief, onNavigate }) {
  const insets = useSafeAreaInsets();
  const daysLeft = daysBetween(today(), CHALLENGE.end);
  const actionsDone = dailyActions.filter(a => a.done).length;
  const totalActions = dailyActions.length || 1;
  const score = Math.round((actionsDone / totalActions) * 100);
  const nickname = profile?.nickname || profile?.name || 'Macho';

  const startDate = data?.startDate ? new Date(data.startDate) : new Date();
  const dayNumber = Math.max(1, Math.ceil((Date.now() - startDate.getTime()) / 86400000));

  useEffect(() => {
    (async () => {
      const done = await getData('dailyRemindersSet_v3');
      if (done) return;
      const granted = await requestPermissions();
      if (!granted) return;
      await scheduleDailyNudges();
      await setData('dailyRemindersSet_v3', true);
    })();
  }, []);

  const zeroPV = (team || []).filter(m => m.pv === 0).length;
  const overdue = (prospects || []).filter(p => {
    const d = daysBetween(p.lastContact || p.added, today());
    return d >= 3 && p.stage !== 'Joined' && p.stage !== 'Went Cold';
  }).length;
  const coldTeam = (team || []).filter(m => daysBetween(m.lastContact || m.joined, today()) >= 7).length;
  const totalAttention = zeroPV + overdue + coldTeam;

  const streakLabel = (s) => {
    if (s >= 100) return 'Unstoppable';
    if (s >= 60) return 'Identity';
    if (s >= 30) return 'Discipline';
    if (s >= 14) return 'Momentum';
    if (s >= 7) return 'Foundation';
    return '';
  };

  const pct = actionsDone / totalActions;
  const progressColor = pct >= 0.75 ? COLORS.lime : pct >= 0.5 ? COLORS.success : pct >= 0.25 ? COLORS.accent : COLORS.t3;

  const nav = (key) => {
    if (onNavigate) onNavigate(key);
  };

  return (
    <ScrollView style={[st.container, { paddingTop: insets.top + 6 }]} contentContainerStyle={{ paddingBottom: 100 }}>

      {/* ═══ BOLD COUNTDOWN ═══ */}
      <View style={st.countdownSection}>
        <LinearGradient colors={['#1a1230', '#080A12']} style={st.countdownGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={st.countdownSub}>{greeting()}, {nickname}</Text>
          <View style={st.countdownRow}>
            <Text style={st.countdownNum}>{daysLeft}</Text>
            <View>
              <Text style={st.countdownLabel}>DAYS TO</Text>
              <Text style={st.countdownTitle}>DIRECTOR</Text>
            </View>
          </View>
          <View style={st.monthBar}>
            {(CHALLENGE.months || [1,2,3,4,5,6]).map((m, i) => (
              <View key={i} style={[st.monthDot, i === 0 && st.monthActive]} />
            ))}
          </View>
          <View style={st.qpvRow}>
            <Text style={st.qpvLabel}>September QPV</Text>
            <Text style={st.qpvValue}>{data.qpv || 0} / 750</Text>
          </View>
          <ProgressBar value={data.qpv || 0} max={750} height={4} color={COLORS.accent} />
        </LinearGradient>
      </View>

      {/* ═══ QUICK ACCESS GRID ═══ */}
      <View style={st.quickGrid}>
        {QUICK_LINKS.map(q => (
          <TouchableOpacity key={q.key} style={st.quickItem} onPress={() => nav(q.key)} activeOpacity={0.7}>
            <View style={st.quickIcon}><Text style={{ fontSize: 18 }}>{q.icon}</Text></View>
            <Text style={st.quickLabel}>{q.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ═══ STATS STRIP ═══ */}
      <View style={st.statsRow}>
        <View style={st.statPill}>
          <Text style={{ fontSize: 14 }}>🔥</Text>
          <Text style={st.statNum}>{data.streak || 0}</Text>
          <Text style={st.statSub}>streak</Text>
        </View>
        <View style={st.statPill}>
          <Text style={{ fontSize: 14 }}>⚡</Text>
          <Text style={[st.statNum, { color: COLORS.primary }]}>{score}</Text>
          <Text style={st.statSub}>score</Text>
        </View>
        <View style={st.statPill}>
          <Text style={{ fontSize: 14 }}>📊</Text>
          <Text style={[st.statNum, { color: COLORS.lime }]}>{actionsDone}/{totalActions}</Text>
          <Text style={st.statSub}>done</Text>
        </View>
      </View>

      {/* ═══ CRITICAL ACTIONS ═══ */}
      {totalAttention > 0 && (
        <TouchableOpacity onPress={onOpenBrief} activeOpacity={0.7}>
          <Card style={{ borderLeftWidth: 3, borderLeftColor: COLORS.danger, padding: 14 }}>
            <Text style={{ color: COLORS.t1, fontSize: 14, fontWeight: '700' }}>
              {totalAttention} people need you
            </Text>
            <View style={{ flexDirection: 'row', gap: 14, marginTop: 6 }}>
              {zeroPV > 0 && <Text style={{ color: COLORS.danger, fontSize: 11 }}>{zeroPV} zero PV</Text>}
              {overdue > 0 && <Text style={{ color: COLORS.accent, fontSize: 11 }}>{overdue} cold prospects</Text>}
              {coldTeam > 0 && <Text style={{ color: COLORS.blue, fontSize: 11 }}>{coldTeam} quiet team</Text>}
            </View>
          </Card>
        </TouchableOpacity>
      )}

      {/* ═══ ATTACK PLAN ═══ */}
      <TouchableOpacity onPress={onOpenBrief} activeOpacity={0.7}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
          <View style={st.attackIcon}><Text style={{ fontSize: 18 }}>⚡</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.t1, fontSize: 14, fontWeight: '600' }}>Today's attack plan</Text>
            <Text style={{ color: COLORS.t3, fontSize: 11, marginTop: 2 }}>
              {totalAttention > 0 ? `${totalAttention} actions · messages ready` : 'Everyone covered — go prospect'}
            </Text>
          </View>
          <Text style={{ color: COLORS.t3, fontSize: 18 }}>›</Text>
        </Card>
      </TouchableOpacity>

      {/* ═══ DAILY POWER ACTIONS ═══ */}
      <Card>
        <View style={[st.row, { marginBottom: 8 }]}>
          <Text style={{ color: COLORS.t2, fontSize: 13, fontWeight: '600' }}>Power Actions</Text>
          <Text style={{ color: progressColor, fontSize: 12, fontWeight: '700' }}>{actionsDone}/{totalActions}</Text>
        </View>
        {/* Progress dots */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
          {dailyActions.map(a => (
            <TouchableOpacity key={a.id} onPress={() => toggleAction(a.id)}>
              <View style={[st.dot, a.done && { backgroundColor: progressColor, borderColor: progressColor }]}>
                {a.done && <Text style={{ color: COLORS.bg, fontSize: 9, fontWeight: '700' }}>✓</Text>}
              </View>
            </TouchableOpacity>
          ))}
        </View>
        {dailyActions.map(a => (
          <TouchableOpacity key={a.id} onPress={() => toggleAction(a.id)} style={st.actionRow}>
            <View style={[st.checkbox, a.done && { backgroundColor: progressColor, borderColor: progressColor }]}>
              {a.done && <Text style={{ color: COLORS.bg, fontSize: 12, fontWeight: '700' }}>✓</Text>}
            </View>
            <Text style={{ fontSize: 15, marginRight: 8 }}>{a.icon}</Text>
            <Text style={[st.actionLabel, a.done && st.actionDone]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </Card>

      {/* ═══ DAY CONQUERED ═══ */}
      {pct >= 1 && (
        <Card style={{ borderWidth: 1, borderColor: COLORS.lime, padding: 18, alignItems: 'center' }}>
          <Text style={{ fontSize: 28 }}>🏆</Text>
          <Text style={{ color: COLORS.lime, fontSize: 18, fontWeight: '800', marginTop: 6 }}>DAY CONQUERED</Text>
          <Text style={{ color: COLORS.t2, fontSize: 12, marginTop: 4 }}>You kept your word today.</Text>
        </Card>
      )}

      {/* ═══ STREAK ═══ */}
      {(data.streak || 0) >= 3 && (
        <Card style={{ padding: 14, alignItems: 'center' }}>
          <Text style={{ fontSize: 28 }}>🔥</Text>
          <Text style={{ color: COLORS.accent, fontSize: 26, fontWeight: '800' }}>{data.streak}</Text>
          <Text style={{ color: COLORS.t3, fontSize: 10, letterSpacing: 2 }}>DAYS</Text>
          {streakLabel(data.streak) ? (
            <View style={st.milestoneBadge}>
              <Text style={{ color: COLORS.lime, fontSize: 11, fontWeight: '700' }}>{streakLabel(data.streak)}</Text>
            </View>
          ) : null}
          <Text style={{ color: COLORS.t3, fontSize: 11, marginTop: 8, fontStyle: 'italic' }}>
            Don't break what you're becoming.
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16 },

  // Countdown
  countdownSection: { borderRadius: 16, overflow: 'hidden', marginBottom: 14 },
  countdownGrad: { padding: 20, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
  countdownSub: { color: COLORS.t2, fontSize: 13, marginBottom: 8 },
  countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  countdownNum: { fontSize: 64, fontWeight: '900', color: COLORS.t1, lineHeight: 68 },
  countdownLabel: { color: COLORS.accent, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  countdownTitle: { color: COLORS.accent, fontSize: 20, fontWeight: '800' },
  monthBar: { flexDirection: 'row', gap: 4, marginTop: 12, marginBottom: 10 },
  monthDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: COLORS.border },
  monthActive: { backgroundColor: COLORS.accent },
  qpvRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  qpvLabel: { color: COLORS.t3, fontSize: 11 },
  qpvValue: { color: COLORS.t2, fontSize: 12, fontWeight: '600' },

  // Quick access
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  quickItem: { width: '22%', alignItems: 'center', paddingVertical: 10 },
  quickIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  quickLabel: { color: COLORS.t3, fontSize: 9, fontWeight: '600' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 8, borderRadius: 10,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  statNum: { color: COLORS.accent, fontSize: 15, fontWeight: '800' },
  statSub: { color: COLORS.t3, fontSize: 9 },

  // Attack
  attackIcon: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: COLORS.primaryDim, alignItems: 'center', justifyContent: 'center',
  },

  // Actions
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dot: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: COLORS.t3, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { color: COLORS.t1, fontSize: 13 },
  actionDone: { color: COLORS.t3, textDecorationLine: 'line-through' },

  // Streak
  milestoneBadge: {
    marginTop: 6, paddingVertical: 3, paddingHorizontal: 10,
    borderRadius: 8, backgroundColor: COLORS.limeDim, borderWidth: 1, borderColor: COLORS.lime,
  },
});
