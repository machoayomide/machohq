import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import { Card, Badge, ProgressBar, Ring, Btn } from '../components/UI';

export default function ScoreScreen({ dailyActions, data }) {
  const insets = useSafeAreaInsets();
  const done = (dailyActions || []).filter(a => a.done).length;
  const total = (dailyActions || []).length || 1;
  const score = Math.round((done / total) * 100);
  const streak = data?.streak || 0;

  const categories = [
    { name: 'Focus blocks', earned: 14, max: 20, color: COLORS.primary },
    { name: 'Prospecting', earned: 12, max: 15, color: COLORS.accent },
    { name: 'Follow-ups', earned: 9, max: 10, color: COLORS.blue },
    { name: 'Reading', earned: 6, max: 10, color: COLORS.warn },
    { name: 'PV activity', earned: 9, max: 10, color: COLORS.primary },
    { name: 'Fiverr work', earned: 6, max: 10, color: COLORS.blue },
    { name: 'Skill study', earned: 8, max: 10, color: COLORS.accent },
    { name: 'Accountability', earned: 7, max: 10, color: COLORS.warn },
  ];

  const weekData = [
    { day: 'Mon', score: 75 }, { day: 'Tue', score: 82 },
    { day: 'Wed', score: 60 }, { day: 'Thu', score: 90 },
    { day: 'Fri', score: 45 }, { day: 'Sat', score: 88 },
    { day: 'Sun', score: score },
  ];

  const achievements = [
    { name: 'First 90+ day', done: false, icon: '🏆' },
    { name: '7-day streak', done: streak >= 7, icon: '🔥' },
    { name: '30-day streak', done: streak >= 30, icon: '💎' },
    { name: 'First book completed', done: false, icon: '📚' },
    { name: 'First gig audit', done: false, icon: '🔍' },
    { name: 'All blocks completed', done: false, icon: '⏱' },
    { name: 'First training hosted', done: false, icon: '🎓' },
    { name: 'Zero missed follow-ups', done: false, icon: '📞' },
  ];

  const punishment = score < 40;

  return (
    <ScrollView style={[s.container, { paddingTop: insets.top + 12 }]} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={s.title}>Macho Score</Text>
      <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 16 }}>
        {new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
      </Text>

      <View style={{ alignItems: 'center', marginBottom: 16 }}>
        <Ring value={score} max={100} size={180} strokeWidth={12}
          color={score >= 80 ? COLORS.primary : score >= 60 ? COLORS.warn : COLORS.danger}>
          <Text style={{ fontSize: 48, fontWeight: '800', color: COLORS.t1 }}>{score}</Text>
          <Text style={{ color: COLORS.t3, fontSize: 11 }}>out of 100 today</Text>
        </Ring>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
        <Badge text={`${streak}-day streak`} color={COLORS.primary} />
        <Badge text={score > 70 ? 'Strong day' : 'Push harder'} color={score > 70 ? COLORS.accent : COLORS.warn} />
      </View>

      {/* Punishment */}
      {punishment && (
        <Card style={{ borderLeftWidth: 3, borderLeftColor: COLORS.danger }}>
          <Text style={{ color: COLORS.danger, fontSize: 10, fontWeight: '600', letterSpacing: 1, marginBottom: 6 }}>PUNISHMENT ACTIVE</Text>
          <Text style={{ color: COLORS.t1, fontSize: 13, fontWeight: '600', marginBottom: 4 }}>Score below 40 — penalty triggered</Text>
          <Text style={{ color: COLORS.t2, fontSize: 12, marginBottom: 12, lineHeight: 18 }}>
            Cold call 3 prospects from your cold list. Record a 30-second voice note explaining your Director plan. Submit proof to clear this penalty.
          </Text>
          <Btn full color={COLORS.danger}>Mark punishment as done</Btn>
        </Card>
      )}

      {/* Score Breakdown */}
      <Card>
        <Text style={{ color: COLORS.t2, fontSize: 13, fontWeight: '600', marginBottom: 12 }}>Your day, in eight parts</Text>
        {categories.map((c, i) => (
          <View key={i} style={[s.catRow, i < categories.length - 1 && { borderBottomWidth: 1, borderBottomColor: COLORS.border }]}>
            <Text style={{ color: COLORS.t2, fontSize: 12, flex: 1 }}>{c.name}</Text>
            <View style={{ width: 80, marginRight: 10 }}>
              <ProgressBar value={c.earned} max={c.max} color={c.color} height={5} />
            </View>
            <Text style={{ color: c.earned >= c.max * 0.8 ? COLORS.primary : COLORS.t3, fontSize: 11, fontWeight: '600', width: 40, textAlign: 'right' }}>
              {c.earned}/{c.max}
            </Text>
          </View>
        ))}
      </Card>

      {/* Weekly Chart */}
      <Card>
        <Text style={{ color: COLORS.t2, fontSize: 13, fontWeight: '600', marginBottom: 12 }}>This week</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 120 }}>
          {weekData.map((d, i) => {
            const barColor = d.score >= 80 ? COLORS.primary : d.score >= 60 ? COLORS.warn : COLORS.danger;
            return (
              <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ color: COLORS.t3, fontSize: 9, marginBottom: 4 }}>{d.score}</Text>
                <View style={{ height: d.score, width: '100%', backgroundColor: barColor, borderRadius: 4, marginBottom: 4 }} />
                <Text style={{ color: i === 6 ? COLORS.t1 : COLORS.t3, fontSize: 9, fontWeight: i === 6 ? '600' : '400' }}>{d.day}</Text>
              </View>
            );
          })}
        </View>
      </Card>

      {/* Stats */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
        <Card style={{ flex: 1, padding: 12, marginBottom: 0, alignItems: 'center' }}>
          <Text style={{ color: COLORS.t3, fontSize: 10 }}>Week avg</Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.t1 }}>74</Text>
        </Card>
        <Card style={{ flex: 1, padding: 12, marginBottom: 0, alignItems: 'center' }}>
          <Text style={{ color: COLORS.t3, fontSize: 10 }}>Month avg</Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.t1 }}>68</Text>
        </Card>
        <Card style={{ flex: 1, padding: 12, marginBottom: 0, alignItems: 'center' }}>
          <Text style={{ color: COLORS.t3, fontSize: 10 }}>Best ever</Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.primary }}>94</Text>
        </Card>
      </View>

      {/* Achievements */}
      <Card>
        <Text style={{ color: COLORS.t2, fontSize: 13, fontWeight: '600', marginBottom: 12 }}>Achievements</Text>
        {achievements.map((a, i) => (
          <View key={i} style={[s.achRow, i < achievements.length - 1 && { borderBottomWidth: 1, borderBottomColor: COLORS.border }]}>
            <View style={[s.achIcon, { backgroundColor: a.done ? COLORS.primary + '22' : COLORS.border }]}>
              <Text style={{ fontSize: 12 }}>{a.done ? a.icon : '🔒'}</Text>
            </View>
            <Text style={{ color: a.done ? COLORS.t1 : COLORS.t3, fontSize: 12 }}>{a.name}</Text>
            {a.done && <Badge text="Earned" color={COLORS.primary} />}
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.t1, marginBottom: 4 },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  achRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  achIcon: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});