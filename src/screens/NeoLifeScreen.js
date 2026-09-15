import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import { Card, Badge, ProgressBar, Ring, Btn, Input, TabBar } from '../components/UI';
import { daysBetween, today } from '../utils/storage';
import { CHALLENGE, NEWBIE_REQS } from '../data/constants';

export default function NeoLifeScreen({ team, setTeam, data, setData }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(0);
  const [detail, setDetail] = useState(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('Newbie');
  const [pvInput, setPvInput] = useState('');

  const daysLeft = daysBetween(today(), CHALLENGE.end);
  const totalPV = team.reduce((s, m) => s + m.pv, 0);

  const addMember = () => {
    if (!name.trim()) return;
    setTeam(prev => [...prev, { id: Date.now(), name: name.trim(), phone, status, direct: true, sponsor: 'You', pv: 0, joined: today(), reqs: {}, lastContact: today() }]);
    setName(''); setPhone(''); setAdding(false);
  };

  const toggleReq = (id, reqId) => {
    setTeam(prev => prev.map(m => m.id === id ? { ...m, reqs: { ...m.reqs, [reqId]: !m.reqs?.[reqId] } } : m));
  };

  const updateMember = (id, updates) => {
    setTeam(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  // Member detail view
  if (detail) {
    const m = team.find(x => x.id === detail);
    if (!m) { setDetail(null); return null; }
    const reqsDone = NEWBIE_REQS.filter(r => m.reqs?.[r.id]).length;
    const pct = Math.round((reqsDone / NEWBIE_REQS.length) * 100);
    const daysSince = daysBetween(m.lastContact || m.joined, today());

    return (
      <ScrollView style={[s.container, { paddingTop: insets.top + 12 }]} contentContainerStyle={{ paddingBottom: 100 }}>
        <TouchableOpacity onPress={() => setDetail(null)}><Text style={s.back}>← Back</Text></TouchableOpacity>

        <Card glow={COLORS.accent}>
          <View style={s.row}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.t1 }}>{m.name}</Text>
            <Badge text={m.status} color={m.status === 'Distributor' ? COLORS.primary : COLORS.accent} />
          </View>
          <Text style={s.sub}>{m.phone || 'No phone'} · {m.direct ? 'Direct leg' : 'Under ' + m.sponsor}</Text>
          <Text style={{ color: COLORS.t2, fontSize: 12, marginTop: 4 }}>
            PV: <Text style={{ color: m.pv >= 250 ? COLORS.primary : COLORS.danger, fontWeight: '700' }}>{m.pv}</Text>
          </Text>
          <Text style={{ color: daysSince >= 7 ? COLORS.danger : COLORS.primary, fontSize: 11, marginTop: 2 }}>
            {daysSince === 0 ? 'Contacted today' : `${daysSince}d since contact`}
          </Text>
        </Card>

        <Card>
          <Text style={s.sectionTitle}>Quick PV</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[50, 100, 250].map(v => (
              <Btn key={v} outline full onPress={() => updateMember(m.id, { pv: m.pv + v })}>+{v}</Btn>
            ))}
          </View>
        </Card>

        <Card>
          <View style={s.row}>
            <Text style={s.sectionTitle}>{m.status === 'Newbie' ? 'Newbie → Pro' : 'Progress'}</Text>
            <Badge text={pct + '%'} color={pct >= 80 ? COLORS.primary : COLORS.danger} />
          </View>
          <ProgressBar value={reqsDone} max={NEWBIE_REQS.length} height={6} />
          <View style={{ marginTop: 10 }}>
            {NEWBIE_REQS.map(r => (
              <TouchableOpacity key={r.id} onPress={() => toggleReq(m.id, r.id)} style={s.reqRow}>
                <View style={[s.reqBox, m.reqs?.[r.id] && s.reqBoxDone]}>
                  {m.reqs?.[r.id] && <Text style={{ color: COLORS.bg, fontSize: 11 }}>✓</Text>}
                </View>
                <Text style={{ color: COLORS.t2, fontSize: 12 }}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {pct === 100 && m.status === 'Newbie' && (
            <Btn full color={COLORS.accent} onPress={() => updateMember(m.id, { status: 'Pro', reqs: {} })} style={{ marginTop: 12 }}>Promote to Pro</Btn>
          )}
        </Card>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn outline full onPress={() => { updateMember(m.id, { lastContact: today() }); setDetail(null); }}>✓ Contacted</Btn>
          <Btn outline full>💬 WhatsApp</Btn>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[s.container, { paddingTop: insets.top + 12 }]} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={s.title}>NeoLife Center</Text>
      <TabBar tabs={['Overview', 'Team', 'PV']} active={tab} onChange={setTab} />

      {tab === 0 && (
        <View>
          <Card glow={COLORS.accent}>
            <Text style={s.challengeLabel}>DIRECTOR CHALLENGE</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={{ fontSize: 32, fontWeight: '800', color: COLORS.t1 }}>{daysLeft}</Text>
              <Text style={{ color: COLORS.t2, fontSize: 12 }}>days left</Text>
            </View>
            <ProgressBar value={data.qpv} max={750} height={6} />
            <Text style={{ color: COLORS.t3, fontSize: 10, marginTop: 4 }}>{data.qpv} / 750 QPV</Text>
          </Card>

          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <Card style={{ flex: 1, padding: 12, marginBottom: 0 }}>
              <Text style={{ color: COLORS.t3, fontSize: 10 }}>Team</Text>
              <Text style={{ fontSize: 24, fontWeight: '700', color: COLORS.t1 }}>{team.length}</Text>
            </Card>
            <Card style={{ flex: 1, padding: 12, marginBottom: 0 }}>
              <Text style={{ color: COLORS.t3, fontSize: 10 }}>Total PV</Text>
              <Text style={{ fontSize: 24, fontWeight: '700', color: COLORS.primary }}>{totalPV}</Text>
            </Card>
          </View>

          <Card>
            <Text style={s.sectionTitle}>Add QPV</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[50, 100, 250].map(v => (
                <Btn key={v} outline full onPress={() => setData(d => ({ ...d, qpv: d.qpv + v }))} >+{v}</Btn>
              ))}
            </View>
          </Card>

          <Card>
            <Text style={s.sectionTitle}>6-Month Plan</Text>
            {CHALLENGE.months.map((m, i) => (
              <View key={i} style={[s.planRow, i < 5 && { borderBottomWidth: 1, borderBottomColor: COLORS.border }]}>
                <Text style={{ color: COLORS.t1, fontSize: 12 }}>{m.name} — {m.focus}</Text>
                <Text style={{ color: i === 0 ? COLORS.primary : COLORS.t3, fontSize: 12, fontWeight: '600' }}>{m.target.toLocaleString()}</Text>
              </View>
            ))}
          </Card>
        </View>
      )}

      {tab === 1 && (
        <View>
          <Card glow={COLORS.primary} style={{ alignItems: 'center', padding: 12 }}>
            <View style={s.youNode}><Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.bg }}>M</Text></View>
            <Text style={{ color: COLORS.t1, fontSize: 13, fontWeight: '600' }}>Macho (You)</Text>
            <Text style={{ color: COLORS.t3, fontSize: 10 }}>Senior Manager</Text>
          </Card>

          <View style={s.treeLine}>
            {team.filter(m => m.direct).map(m => {
              const ds = daysBetween(m.lastContact || m.joined, today());
              return (
                <Card key={m.id} onPress={() => setDetail(m.id)} style={{ padding: 12, borderTopWidth: 3, borderTopColor: m.pv >= 250 ? COLORS.primary : m.pv > 0 ? COLORS.warn : COLORS.danger }}>
                  <View style={s.row}>
                    <View>
                      <Text style={{ color: COLORS.t1, fontSize: 13, fontWeight: '600' }}>{m.name}</Text>
                      <Text style={{ color: COLORS.t3, fontSize: 10 }}>{m.status} · {m.pv} PV</Text>
                    </View>
                    <Badge text={ds >= 7 ? 'Cold' : 'Active'} color={ds >= 7 ? COLORS.danger : COLORS.primary} />
                  </View>
                </Card>
              );
            })}
          </View>

          <Btn full onPress={() => setAdding(true)} style={{ marginTop: 8 }}>+ Add downline</Btn>

          {adding && (
            <Card style={{ marginTop: 12, borderColor: COLORS.primary + '44' }}>
              <Input value={name} onChangeText={setName} placeholder="Name" />
              <View style={{ height: 8 }} />
              <Input value={phone} onChangeText={setPhone} placeholder="Phone" />
              <View style={{ height: 8 }} />
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                {['Newbie', 'Pro', 'Distributor'].map(st => (
                  <TouchableOpacity key={st} onPress={() => setStatus(st)} style={[s.statusBtn, status === st && s.statusActive]}>
                    <Text style={{ color: status === st ? COLORS.primary : COLORS.t3, fontSize: 11 }}>{st}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn full onPress={addMember}>Save</Btn>
                <Btn full outline onPress={() => setAdding(false)}>Cancel</Btn>
              </View>
            </Card>
          )}
        </View>
      )}

      {tab === 2 && (
        <View>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <Ring value={data.qpv} max={750}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: COLORS.t1 }}>{data.qpv}</Text>
              <Text style={{ color: COLORS.t3, fontSize: 10 }}>/ 750 QPV</Text>
            </Ring>
          </View>
          <Card>
            <Text style={s.sectionTitle}>Team PV</Text>
            {team.map(m => (
              <TouchableOpacity key={m.id} onPress={() => setDetail(m.id)} style={s.pvRow}>
                <View style={[s.pvDot, { backgroundColor: m.pv >= 250 ? COLORS.primary : COLORS.danger }]} />
                <Text style={{ color: COLORS.t1, fontSize: 12, flex: 1 }}>{m.name}</Text>
                <Text style={{ color: m.pv >= 250 ? COLORS.primary : COLORS.danger, fontSize: 13, fontWeight: '600' }}>{m.pv}</Text>
              </TouchableOpacity>
            ))}
            {team.length === 0 && <Text style={s.empty}>Add team members first</Text>}
          </Card>
          {team.filter(m => m.pv === 0).length > 0 && (
            <Card style={{ borderColor: COLORS.danger + '44' }}>
              <Text style={{ color: COLORS.danger, fontSize: 12, fontWeight: '600' }}>⚠ {team.filter(m => m.pv === 0).length} members at zero PV — follow up today</Text>
            </Card>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.t1, marginBottom: 4 },
  back: { color: COLORS.t2, fontSize: 13, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sub: { color: COLORS.t3, fontSize: 11 },
  sectionTitle: { color: COLORS.t2, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  challengeLabel: { color: COLORS.accent, fontSize: 10, fontWeight: '600', letterSpacing: 1, marginBottom: 6 },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  youNode: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  treeLine: { borderLeftWidth: 2, borderLeftColor: COLORS.border, marginLeft: 24, paddingLeft: 16 },
  statusBtn: { flex: 1, height: 36, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  statusActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '22' },
  pvRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pvDot: { width: 8, height: 8, borderRadius: 4 },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  reqBox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: COLORS.t3, alignItems: 'center', justifyContent: 'center' },
  reqBoxDone: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  empty: { color: COLORS.t3, fontSize: 12, textAlign: 'center', padding: 16 },
});