import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import { Card, Badge, ProgressBar, Btn, Input } from '../components/UI';
import { today } from '../utils/storage';
import { NAIRA_RATE } from '../data/constants';

const CATEGORIES = [
  { name: 'Feeding', icon: '🍛', budget: 30000 },
  { name: 'Transport', icon: '🚗', budget: 15000 },
  { name: 'Data/Airtime', icon: '📱', budget: 10000 },
  { name: 'Tools', icon: '💻', budget: 20000 },
  { name: 'NeoLife', icon: '💎', budget: 25000 },
  { name: 'Savings', icon: '🏦', budget: 50000 },
  { name: 'Giving', icon: '🤝', budget: 5000 },
  { name: 'Entertainment', icon: '🎮', budget: 5000 },
  { name: 'School', icon: '📚', budget: 10000 },
  { name: 'Other', icon: '📦', budget: 10000 },
];

export default function SpendingScreen({ spending, setSpending, earnings }) {
  const insets = useSafeAreaInsets();
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Feeding');
  const [note, setNote] = useState('');

  const totalSpent = (spending || []).reduce((s, e) => s + e.amount, 0);
  const totalEarned = (earnings || []).reduce((s, e) => s + e.naira, 0);
  const remaining = totalEarned - totalSpent;

  const addSpend = () => {
    if (!amount) return;
    setSpending(prev => [...(prev || []), {
      id: Date.now(), amount: parseFloat(amount), category, note, date: today()
    }]);
    setAmount(''); setNote(''); setAdding(false);
  };

  const catTotals = CATEGORIES.map(c => ({
    ...c,
    spent: (spending || []).filter(s => s.category === c.name).reduce((sum, s) => sum + s.amount, 0),
  })).filter(c => c.spent > 0 || c.budget > 0);

  return (
    <ScrollView style={[s.container, { paddingTop: insets.top + 12 }]} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={s.title}>Spending Tracker</Text>
      <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 16 }}>Stay accountable · Budget smart</Text>

      {/* Summary */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
        <Card style={{ flex: 1, padding: 12, marginBottom: 0 }}>
          <Text style={{ color: COLORS.t3, fontSize: 10 }}>Total spent</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.warn }}>₦{totalSpent.toLocaleString()}</Text>
        </Card>
        <Card style={{ flex: 1, padding: 12, marginBottom: 0 }}>
          <Text style={{ color: COLORS.t3, fontSize: 10 }}>Remaining</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: remaining >= 0 ? COLORS.primary : COLORS.danger }}>
            ₦{remaining.toLocaleString()}
          </Text>
        </Card>
      </View>

      <Btn full outline onPress={() => setAdding(true)} style={{ marginBottom: 12 }}>+ Log expense</Btn>

      {adding && (
        <Card style={{ borderColor: COLORS.warn + '44' }}>
          <Input value={amount} onChangeText={setAmount} placeholder="Amount in ₦" keyboardType="numeric" />
          <View style={{ height: 8 }} />

          <Text style={{ color: COLORS.t2, fontSize: 12, marginBottom: 6 }}>Category</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {CATEGORIES.map(c => (
              <TouchableOpacity key={c.name} onPress={() => setCategory(c.name)}
                style={[s.catBtn, category === c.name && { borderColor: COLORS.warn, backgroundColor: COLORS.warn + '22' }]}>
                <Text style={{ fontSize: 12 }}>{c.icon}</Text>
                <Text style={{ color: category === c.name ? COLORS.warn : COLORS.t3, fontSize: 10 }}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input value={note} onChangeText={setNote} placeholder="Note (optional)" />
          <View style={{ height: 8 }} />

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn full color={COLORS.warn} onPress={addSpend}>Save</Btn>
            <Btn full outline onPress={() => setAdding(false)}>Cancel</Btn>
          </View>
        </Card>
      )}

      {/* Category breakdown */}
      <Card>
        <Text style={{ color: COLORS.t2, fontSize: 13, fontWeight: '600', marginBottom: 12 }}>By category</Text>
        {catTotals.map((c, i) => {
          const pct = c.budget > 0 ? (c.spent / c.budget) * 100 : 0;
          const over = pct > 80;
          return (
            <View key={c.name} style={[s.catRow, i < catTotals.length - 1 && { borderBottomWidth: 1, borderBottomColor: COLORS.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={{ fontSize: 14 }}>{c.icon}</Text>
                <Text style={{ color: COLORS.t1, fontSize: 12, flex: 1 }}>{c.name}</Text>
                <Text style={{ color: over ? COLORS.danger : COLORS.t2, fontSize: 12, fontWeight: '600' }}>
                  ₦{c.spent.toLocaleString()}
                </Text>
                <Text style={{ color: COLORS.t3, fontSize: 10 }}>/ ₦{c.budget.toLocaleString()}</Text>
              </View>
              <ProgressBar value={c.spent} max={c.budget} color={over ? COLORS.danger : COLORS.warn} height={4} />
            </View>
          );
        })}
      </Card>

      {/* Recent expenses */}
      {(spending || []).length > 0 && (
        <Card>
          <Text style={{ color: COLORS.t2, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Recent expenses</Text>
          {[...(spending || [])].reverse().slice(0, 10).map(e => (
            <View key={e.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
              <View>
                <Text style={{ color: COLORS.t1, fontSize: 12 }}>{e.category}</Text>
                {e.note ? <Text style={{ color: COLORS.t3, fontSize: 10 }}>{e.note}</Text> : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: COLORS.warn, fontSize: 12, fontWeight: '600' }}>₦{e.amount.toLocaleString()}</Text>
                <Text style={{ color: COLORS.t3, fontSize: 9 }}>{e.date}</Text>
              </View>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.t1, marginBottom: 4 },
  catBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  catRow: { paddingVertical: 8 },
});