import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { COLORS } from '../theme';
import { Card, Badge, ProgressBar, Btn } from '../components/UI';
import { today, daysBetween } from '../utils/storage';
import { NEWBIE_REQS, skillLevel, earnedThisMonth, earningStreak, incomeForMonth, monthKey } from '../data/constants';

export default function LeaderboardScreen({ team }) {
  const [sortBy, setSortBy] = useState('pv');

  const readiness = (m) => {
    const done = NEWBIE_REQS.filter(r => m.reqs?.[r.id]).length;
    return Math.round((done / NEWBIE_REQS.length) * 100);
  };

  // Activity score: PV + progression + income stage + recency of contact
  const activityScore = (m) => {
    let score = 0;
    score += Math.min(40, (m.pv || 0) / 10);           // up to 40 for PV
    score += readiness(m) * 0.2;                        // up to 20 for requirements
    const lvlIdx = ['none', 'learning', 'ready', 'selling'].indexOf(m.skillLevel || 'none');
    score += lvlIdx * 5;                                // up to 15 for skill level
    if (earnedThisMonth(m)) score += 12;                // earning this month matters most
    score += Math.min(6, earningStreak(m) * 2);         // consistency bonus
    const days = daysBetween(m.lastContact || m.joined, today());
    score += days <= 3 ? 16 : days <= 7 ? 8 : 0;        // up to 16 for staying in touch
    return Math.round(score);
  };

  const sorted = [...(team || [])].sort((a, b) => {
    if (sortBy === 'pv') return (b.pv || 0) - (a.pv || 0);
    if (sortBy === 'ready') return readiness(b) - readiness(a);
    return activityScore(b) - activityScore(a);
  });

  const shareBoard = () => {
    const lines = sorted.slice(0, 10).map((m, i) => {
      const medal = i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : `${i + 1}.`;
      return `${medal} ${m.name} — ${m.pv} PV · ${m.status}`;
    });
    const msg = `MACHO TEAM LEADERBOARD\n${new Date().toLocaleDateString()}\n\n${lines.join('\n')}\n\nTogether we grow.`;
    Share.share({ message: msg }).catch(() => {});
  };

  const medalColor = (i) => i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : COLORS.t3;

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={s.title}>Team Leaderboard</Text>
      <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 14 }}>
        Share it in the group. Competition moves people.
      </Text>

      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
        {[['pv', 'By PV'], ['ready', 'By progress'], ['activity', 'By activity']].map(([key, label]) => (
          <TouchableOpacity key={key} onPress={() => setSortBy(key)}
            style={[s.sortBtn, sortBy === key && { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '22' }]}>
            <Text style={{ color: sortBy === key ? COLORS.primary : COLORS.t3, fontSize: 11, fontWeight: '600' }}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {(team || []).length === 0 && (
        <Card style={{ alignItems: 'center', padding: 26 }}>
          <Text style={{ fontSize: 26, marginBottom: 8 }}>🏆</Text>
          <Text style={{ color: COLORS.t2, fontSize: 13 }}>No team members yet</Text>
        </Card>
      )}

      {sorted.map((m, i) => {
        const lvl = skillLevel(m.skillLevel || 'none');
        const rec = incomeForMonth(m, monthKey());
        const score = activityScore(m);
        return (
          <Card key={m.id} style={{ padding: 13, borderLeftWidth: i < 3 ? 3 : 0, borderLeftColor: medalColor(i) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[s.rank, { backgroundColor: i < 3 ? medalColor(i) + '22' : COLORS.surface }]}>
                <Text style={{ color: i < 3 ? medalColor(i) : COLORS.t3, fontSize: 14, fontWeight: '800' }}>
                  {i + 1}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.t1, fontSize: 14, fontWeight: '600' }}>{m.name}</Text>
                <Text style={{ color: COLORS.t3, fontSize: 10 }}>
                  {m.status} · {lvl.label}
                  {rec?.earned ? (rec.amount ? ` · ₦${(rec.amount/1000).toFixed(0)}k this month` : ' · earned') : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: m.pv >= 250 ? COLORS.primary : m.pv > 0 ? COLORS.warn : COLORS.danger, fontSize: 16, fontWeight: '700' }}>
                  {m.pv}
                </Text>
                <Text style={{ color: COLORS.t3, fontSize: 9 }}>PV</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, alignItems: 'center' }}>
              <Text style={{ color: COLORS.t3, fontSize: 10, width: 54 }}>Activity</Text>
              <View style={{ flex: 1 }}>
                <ProgressBar value={score} max={100} color={score >= 70 ? COLORS.primary : score >= 40 ? COLORS.warn : COLORS.danger} height={4} />
              </View>
              <Text style={{ color: COLORS.t3, fontSize: 10, width: 26, textAlign: 'right' }}>{score}</Text>
            </View>
          </Card>
        );
      })}

      {(team || []).length > 0 && (
        <>
          <Btn full onPress={shareBoard} style={{ marginTop: 8 }}>Share to WhatsApp group</Btn>
          <Card style={{ marginTop: 12, backgroundColor: COLORS.surface }}>
            <Text style={{ color: COLORS.t3, fontSize: 10, lineHeight: 16 }}>
              Activity score blends PV, requirement progress, income stage and how recently you
              spoke. Someone can rank high on effort even with low PV — that is the point.
            </Text>
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.t1, marginBottom: 2 },
  sortBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  rank: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});