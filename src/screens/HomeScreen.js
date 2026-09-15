import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import { Card, Badge, ProgressBar } from '../components/UI';
import { daysBetween, today, greeting } from '../utils/storage';
import { CHALLENGE } from '../data/constants';

export default function HomeScreen({ data, dailyActions, toggleAction }) {
  const insets = useSafeAreaInsets();
  const daysLeft = daysBetween(today(), CHALLENGE.end);
  const actionsDone = dailyActions.filter(a => a.done).length;
  const score = Math.round((actionsDone / (dailyActions.length || 1)) * 100);

  return (
    <ScrollView style={[s.container, { paddingTop: insets.top + 12 }]} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={s.header}>
        <Text style={s.dayLabel}>Day {new Date().getDate()} of 30</Text>
        <Text style={s.greeting}>{greeting()}, Macho</Text>
      </View>

      <Card glow={COLORS.accent} style={{ backgroundColor: COLORS.card }}>
        <View style={s.row}>
          <Text style={s.challengeLabel}>DIRECTOR CHALLENGE</Text>
          <Badge text="Month 1 / 6" color={COLORS.accent} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
          <Text style={{ fontSize: 36, fontWeight: '800', color: COLORS.t1 }}>{daysLeft}</Text>
          <Text style={{ color: COLORS.t2, fontSize: 13 }}>days to Director</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 3, marginBottom: 8 }}>
          {CHALLENGE.months.map((m, i) => (
            <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i === 0 ? COLORS.accent : COLORS.border }} />
          ))}
        </View>
        <View style={s.row}>
          <Text style={{ color: COLORS.t2, fontSize: 12 }}>September QPV</Text>
          <Text style={{ color: COLORS.t1, fontSize: 14, fontWeight: '600' }}>{data.qpv} / 750</Text>
        </View>
        <ProgressBar value={data.qpv} max={750} height={6} />
      </Card>

      <Card>
        <View style={[s.row, { marginBottom: 10 }]}>
          <Text style={{ color: COLORS.t2, fontSize: 13, fontWeight: '600' }}>Daily power actions</Text>
          <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '600' }}>{actionsDone}/{dailyActions.length}</Text>
        </View>
        {dailyActions.map(a => (
          <TouchableOpacity key={a.id} onPress={() => toggleAction(a.id)} style={s.actionRow}>
            <View style={[s.checkbox, a.done && s.checkboxDone]}>
              {a.done && <Text style={{ color: COLORS.bg, fontSize: 12, fontWeight: '700' }}>✓</Text>}
            </View>
            <Text style={{ fontSize: 15, marginRight: 8 }}>{a.icon}</Text>
            <Text style={[s.actionLabel, a.done && s.actionDone]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </Card>

      <Card glow={COLORS.primary} style={{ backgroundColor: COLORS.card }}>
        <View style={s.row}>
          <View>
            <Text style={s.scoreLabel}>MACHO SCORE</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={{ fontSize: 36, fontWeight: '800', color: COLORS.t1 }}>{score}</Text>
              <Text style={{ color: COLORS.t3, fontSize: 14 }}>/100</Text>
            </View>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 24 }}>🔥</Text>
            <Text style={{ color: COLORS.primary, fontSize: 18, fontWeight: '700' }}>{data.streak}</Text>
            <Text style={{ color: COLORS.t3, fontSize: 9 }}>streak</Text>
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16 },
  header: { marginBottom: 20 },
  dayLabel: { color: COLORS.t3, fontSize: 11 },
  greeting: { fontSize: 22, fontWeight: '700', color: COLORS.t1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  challengeLabel: { color: COLORS.accent, fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: COLORS.t3, alignItems: 'center', justifyContent: 'center' },
  checkboxDone: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  actionLabel: { color: COLORS.t1, fontSize: 13 },
  actionDone: { color: COLORS.t3, textDecorationLine: 'line-through' },
  scoreLabel: { color: COLORS.primary, fontSize: 10, fontWeight: '600', letterSpacing: 1, marginBottom: 4 },
});