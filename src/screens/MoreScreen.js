import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import { Card } from '../components/UI';

const ITEMS = [
  { key: 'focus',    icon: '⏱',  label: 'Focus Engine',   sub: 'Timed work blocks with check-in' },
  { key: 'fiverr',   icon: '💼', label: 'Fiverr Hub',     sub: 'Accounts, gigs, AI gig audit' },
  { key: 'research', icon: '🔍', label: 'Research',       sub: 'Live trends, keywords, job posts' },
  { key: 'skills',   icon: '🧠', label: 'Skill Path',     sub: 'One skill a month, graded' },
  { key: 'library',  icon: '📚', label: 'AI Library',     sub: 'Upload PDFs and notes the AI learns from' },
  { key: 'money',    icon: '📈', label: 'Earnings',       sub: 'Multi-currency income tracking' },
  { key: 'spending', icon: '💳', label: 'Spending',       sub: 'Budget by category' },
  { key: 'books',    icon: '📖', label: 'Books',          sub: '15 pages a day' },
  { key: 'leaderboard', icon: '🏆', label: 'Team Leaderboard', sub: 'Rank your team, share to WhatsApp' },
  { key: 'score',    icon: '★',  label: 'Macho Score',    sub: 'Daily discipline score' },
  { key: 'journal',  icon: '📓', label: 'Journal',        sub: 'No excuses reflection' },
  { key: 'review',   icon: '📊', label: 'Weekly Review',  sub: 'Shareable progress report' },
  { key: 'settings', icon: '⚙',  label: 'Settings',       sub: 'PIN, API key, notifications, backup' },
];

export default function MoreScreen({ onSelect }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={[s.container, { paddingTop: insets.top + 12 }]} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={s.title}>More</Text>
      <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 16 }}>Everything else in MachoHQ</Text>

      {ITEMS.map(it => (
        <TouchableOpacity key={it.key} onPress={() => onSelect(it.key)} activeOpacity={0.7}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 }}>
            <View style={s.iconBox}><Text style={{ fontSize: 20 }}>{it.icon}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.t1, fontSize: 15, fontWeight: '600' }}>{it.label}</Text>
              <Text style={{ color: COLORS.t3, fontSize: 11, marginTop: 2 }}>{it.sub}</Text>
            </View>
            <Text style={{ color: COLORS.t3, fontSize: 20 }}>›</Text>
          </Card>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.t1, marginBottom: 2 },
  iconBox: { width: 46, height: 46, borderRadius: 14, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
});
