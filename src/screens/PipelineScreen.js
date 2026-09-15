import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import { Card, Badge, Btn, Input } from '../components/UI';
import { daysBetween, today } from '../utils/storage';
import { PIPELINE_STAGES } from '../data/constants';

export default function PipelineScreen({ prospects, setProspects }) {
  const insets = useSafeAreaInsets();
  const [detail, setDetail] = useState(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [stage, setStage] = useState(0);

  const add = () => {
    if (!name.trim()) return;
    setProspects(prev => [...prev, { id: Date.now(), name: name.trim(), phone, stage, source: 'Cold Outreach', added: today(), lastContact: today() }]);
    setName(''); setPhone(''); setAdding(false);
  };

  const move = (id, dir) => {
    setProspects(prev => prev.map(p => p.id === id ? { ...p, stage: Math.max(0, Math.min(7, p.stage + dir)), lastContact: today() } : p));
    setDetail(null);
  };

  const overdue = prospects.filter(p => daysBetween(p.lastContact, today()) >= 3).length;

  if (detail) {
    const p = prospects.find(x => x.id === detail);
    if (!p) { setDetail(null); return null; }
    const st = PIPELINE_STAGES[p.stage];
    const days = daysBetween(p.lastContact, today());
    return (
      <ScrollView style={[s.container, { paddingTop: insets.top + 12 }]} contentContainerStyle={{ paddingBottom: 100 }}>
        <TouchableOpacity onPress={() => setDetail(null)}><Text style={s.back}>← Back</Text></TouchableOpacity>
        <Card glow={st.color}>
          <View style={s.row}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.t1 }}>{p.name}</Text>
            <Badge text={st.name} color={st.color} />
          </View>
          <Text style={{ color: COLORS.t3, fontSize: 11 }}>{p.phone || 'No phone'} · Added {p.added}</Text>
          <Text style={{ color: days >= 7 ? COLORS.danger : COLORS.primary, fontSize: 11, marginTop: 4 }}>
            {days === 0 ? 'Contacted today' : `${days} days since contact`}
          </Text>
        </Card>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {p.stage > 0 && <Btn outline full onPress={() => move(p.id, -1)}>← {PIPELINE_STAGES[p.stage - 1].name}</Btn>}
          {p.stage < 7 && <Btn full onPress={() => move(p.id, 1)}>{PIPELINE_STAGES[p.stage + 1].name} →</Btn>}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn outline full onPress={() => { setProspects(prev => prev.map(x => x.id === p.id ? { ...x, lastContact: today() } : x)); setDetail(null); }}>✓ Contacted</Btn>
          <Btn outline full>💬 WhatsApp</Btn>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[s.container, { paddingTop: insets.top + 12 }]} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={s.title}>Prospect Pipeline</Text>
      <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 12 }}>Eight clear stages</Text>

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
        <Card style={{ flex: 1, padding: 12, marginBottom: 0, alignItems: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.t1 }}>{prospects.length}</Text>
          <Text style={{ color: COLORS.t3, fontSize: 10 }}>Active</Text>
        </Card>
        <Card style={{ flex: 1, padding: 12, marginBottom: 0, alignItems: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: overdue > 0 ? COLORS.danger : COLORS.primary }}>{overdue}</Text>
          <Text style={{ color: COLORS.t3, fontSize: 10 }}>Overdue</Text>
        </Card>
      </View>

      <Btn full onPress={() => setAdding(true)} style={{ marginBottom: 12 }}>+ Add prospect</Btn>

      {adding && (
        <Card style={{ borderColor: COLORS.primary + '44' }}>
          <Input value={name} onChangeText={setName} placeholder="Name" />
          <View style={{ height: 8 }} />
          <Input value={phone} onChangeText={setPhone} placeholder="Phone" keyboardType="phone-pad" />
          <View style={{ height: 8 }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn full onPress={add}>Save</Btn>
            <Btn full outline onPress={() => setAdding(false)}>Cancel</Btn>
          </View>
        </Card>
      )}

      {PIPELINE_STAGES.map((st, si) => {
        const items = prospects.filter(p => p.stage === si);
        return (
          <View key={si} style={{ marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: st.color }} />
              <Text style={{ color: COLORS.t2, fontSize: 12, fontWeight: '600' }}>{st.name}</Text>
              <Badge text={String(items.length)} color={st.color} />
            </View>
            {items.map(p => {
              const d = daysBetween(p.lastContact, today());
              return (
                <Card key={p.id} onPress={() => setDetail(p.id)} style={{ marginLeft: 16, padding: 10, marginBottom: 4 }}>
                  <View style={s.row}>
                    <View>
                      <Text style={{ color: COLORS.t1, fontSize: 12, fontWeight: '600' }}>{p.name}</Text>
                      <Text style={{ color: COLORS.t3, fontSize: 10 }}>{p.phone}</Text>
                    </View>
                    {d >= 3 && <Badge text={d >= 7 ? 'Overdue' : d + 'd'} color={d >= 7 ? COLORS.danger : COLORS.warn} />}
                  </View>
                </Card>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.t1, marginBottom: 4 },
  back: { color: COLORS.t2, fontSize: 13, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 },
});