import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import { Card, Badge, ProgressBar, Ring, Btn, Input, TabBar } from '../components/UI';
import { daysBetween, today } from '../utils/storage';
import { CHALLENGE, NEWBIE_REQS, SVB_TIERS, getTier, REORDER_DAYS } from '../data/constants';
import AddDownlineScreen from './AddDownlineScreen';

export default function NeoLifeScreen({ team, setTeam, data, setData }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(0);
  const [detail, setDetail] = useState(null);
  const [adding, setAdding] = useState(false);
  const [pvInput, setPvInput] = useState('');
  const [memberPV, setMemberPV] = useState('');
  const [editingPV, setEditingPV] = useState(false);
  const [correctPV, setCorrectPV] = useState('');

  const qpv = data?.qpv || 0;
  const daysLeft = daysBetween(today(), CHALLENGE.end);
  const tier = getTier(qpv);
  const nextTier = SVB_TIERS.find(t => t.min > qpv);

  const totalTeamPV = (team || []).reduce((s, m) => s + m.pv, 0);
  const directs = (team || []).filter(m => m.direct);
  const statusCount = {
    Newbie: (team || []).filter(m => m.status === 'Newbie').length,
    Pro: (team || []).filter(m => m.status === 'Pro').length,
    Distributor: (team || []).filter(m => m.status === 'Distributor').length,
  };

  // Days left in current cycle
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const cycleDaysLeft = lastDay - now.getDate();

  const handleSaveDownline = (member) => {
    setTeam(prev => [...prev, member]);
    setAdding(false);
  };

  const updateMember = (id, changes) => setTeam(prev => prev.map(m => m.id === id ? { ...m, ...changes } : m));
  const toggleReq = (id, reqId) => setTeam(prev => prev.map(m =>
    m.id === id ? { ...m, reqs: { ...m.reqs, [reqId]: !m.reqs?.[reqId] } } : m));

  const readiness = (m) => {
    const done = NEWBIE_REQS.filter(r => m.reqs?.[r.id]).length;
    return Math.round((done / NEWBIE_REQS.length) * 100);
  };

  // Add PV to a member — also adds the same amount to your QPV
  const logPV = (id, amount) => {
    const m = (team || []).find(x => x.id === id);
    if (!m || !amount || amount <= 0) return;
    updateMember(id, {
      pv: m.pv + amount,
      lastOrder: today(),
      lastContact: today(),
      pvLog: [...(m.pvLog || []), { date: today(), amount }],
    });
    setData(d => ({ ...d, qpv: (d?.qpv || 0) + amount }));
  };

  // Correct a member's PV to an exact figure — adjusts your QPV by the difference
  const setExactPV = (id, exact) => {
    const m = (team || []).find(x => x.id === id);
    if (!m || exact < 0) return;
    const diff = exact - m.pv;
    updateMember(id, {
      pv: exact,
      lastOrder: exact > m.pv ? today() : m.lastOrder,
      pvLog: [...(m.pvLog || []), { date: today(), amount: diff, corrected: true }],
    });
    setData(d => ({ ...d, qpv: Math.max(0, (d?.qpv || 0) + diff) }));
  };

  const sendWhatsApp = (phone, msg) => {
    const clean = (phone || '').replace(/[^0-9]/g, '');
    const intl = clean.startsWith('0') ? '234' + clean.slice(1) : clean;
    Linking.openURL(`whatsapp://send?phone=${intl}&text=${encodeURIComponent(msg || '')}`)
      .catch(() => Share.share({ message: msg || '' }).catch(() => {}));
  };

  // ─── ADD DOWNLINE FLOW ───
  if (adding) {
    return <AddDownlineScreen team={team} onSave={handleSaveDownline} onCancel={() => setAdding(false)} />;
  }

  // ─── MEMBER DETAIL ───
  if (detail) {
    const m = (team || []).find(x => x.id === detail);
    if (!m) { setDetail(null); return null; }
    const pct = readiness(m);
    const daysSince = daysBetween(m.lastContact || m.joined, today());
    const daysSinceOrder = m.lastOrder ? daysBetween(m.lastOrder, today()) : null;
    const dueReorder = daysSinceOrder !== null && daysSinceOrder >= REORDER_DAYS - 5;
    const indirects = (team || []).filter(x => x.sponsorId === m.id);

    return (
      <ScrollView style={[s.container, { paddingTop: insets.top + 12 }]} contentContainerStyle={{ paddingBottom: 100 }}>
        <TouchableOpacity onPress={() => setDetail(null)}><Text style={s.back}>← Back to team</Text></TouchableOpacity>

        <Card glow={m.status === 'Distributor' ? COLORS.primary : COLORS.accent}>
          <View style={s.row}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.t1 }}>{m.name}</Text>
            <Badge text={m.status} color={m.status === 'Distributor' ? COLORS.primary : m.status === 'Pro' ? COLORS.accent : COLORS.blue} />
          </View>
          <Text style={{ color: COLORS.t3, fontSize: 11 }}>
            {m.phone || 'No phone'} · {m.direct ? 'Direct leg' : 'Under ' + m.sponsor}
          </Text>
          <Text style={{ color: COLORS.t3, fontSize: 11 }}>Joined {m.joined}</Text>
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
            <View>
              <Text style={{ color: COLORS.t3, fontSize: 9 }}>PV this month</Text>
              <Text style={{ color: m.pv >= 250 ? COLORS.primary : m.pv > 0 ? COLORS.warn : COLORS.danger, fontSize: 18, fontWeight: '700' }}>{m.pv}</Text>
            </View>
            <View>
              <Text style={{ color: COLORS.t3, fontSize: 9 }}>Last contact</Text>
              <Text style={{ color: daysSince >= 7 ? COLORS.danger : COLORS.t1, fontSize: 18, fontWeight: '700' }}>{daysSince}d</Text>
            </View>
            {indirects.length > 0 && (
              <View>
                <Text style={{ color: COLORS.t3, fontSize: 9 }}>Their team</Text>
                <Text style={{ color: COLORS.t1, fontSize: 18, fontWeight: '700' }}>{indirects.length}</Text>
              </View>
            )}
          </View>
        </Card>

        {dueReorder && (
          <Card style={{ borderLeftWidth: 3, borderLeftColor: COLORS.warn }}>
            <Text style={{ color: COLORS.warn, fontSize: 10, fontWeight: '600', letterSpacing: 1 }}>REORDER DUE</Text>
            <Text style={{ color: COLORS.t1, fontSize: 13, marginTop: 4 }}>
              Last order was {daysSinceOrder} days ago. Their supply is finishing.
            </Text>
            <Btn full color={COLORS.warn} onPress={() => sendWhatsApp(m.phone, `Hi ${m.name}, hope you're doing well. Your last order was about a month ago — should be finishing around now. Want me to help you reorder before the cycle closes?`)} style={{ marginTop: 10 }}>
              Send reorder message
            </Btn>
          </Card>
        )}

        <Card>
          <View style={s.row}>
            <Text style={s.sectionTitle}>Log PV</Text>
            <TouchableOpacity onPress={() => { setEditingPV(!editingPV); setCorrectPV(String(m.pv)); }}>
              <Text style={{ color: COLORS.t3, fontSize: 11 }}>{editingPV ? 'Cancel' : 'Correct total'}</Text>
            </TouchableOpacity>
          </View>

          {editingPV ? (
            <View>
              <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 6 }}>
                Set their exact PV for this month. Your QPV adjusts by the difference.
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Input value={correctPV} onChangeText={setCorrectPV} placeholder="Exact PV" keyboardType="numeric" />
                </View>
                <Btn onPress={() => {
                  const v = parseFloat(correctPV);
                  if (!isNaN(v) && v >= 0) { setExactPV(m.id, v); setCorrectPV(''); setEditingPV(false); }
                }}>Set</Btn>
              </View>
              {correctPV !== '' && !isNaN(parseFloat(correctPV)) && (
                <Text style={{ color: parseFloat(correctPV) >= m.pv ? COLORS.primary : COLORS.warn, fontSize: 11, marginTop: 6 }}>
                  {parseFloat(correctPV) >= m.pv
                    ? `QPV goes up by ${(parseFloat(correctPV) - m.pv).toFixed(0)}`
                    : `QPV drops by ${(m.pv - parseFloat(correctPV)).toFixed(0)}`}
                </Text>
              )}
            </View>
          ) : (
            <View>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                <View style={{ flex: 1 }}>
                  <Input value={memberPV} onChangeText={setMemberPV} placeholder="Enter PV (e.g. 272)" keyboardType="numeric" />
                </View>
                <Btn onPress={() => {
                  const v = parseFloat(memberPV);
                  if (!isNaN(v) && v > 0) { logPV(m.id, v); setMemberPV(''); }
                }}>Add</Btn>
              </View>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                {[50, 100, 250].map(v => (
                  <Btn key={v} outline full onPress={() => logPV(m.id, v)} style={{ height: 34 }}>+{v}</Btn>
                ))}
              </View>
              <Text style={{ color: COLORS.t3, fontSize: 10 }}>
                Adds to their PV and your QPV together. Current: {m.pv} PV
              </Text>
            </View>
          )}

          {(m.pvLog || []).length > 0 && (
            <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border }}>
              <Text style={{ color: COLORS.t3, fontSize: 10, fontWeight: '600', letterSpacing: 1, marginBottom: 6 }}>PV HISTORY</Text>
              {(m.pvLog || []).slice(-6).reverse().map((entry, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                  <Text style={{ color: COLORS.t3, fontSize: 11 }}>
                    {entry.date}{entry.corrected ? ' · corrected' : ''}
                  </Text>
                  <Text style={{ color: entry.amount >= 0 ? COLORS.primary : COLORS.warn, fontSize: 11, fontWeight: '600' }}>
                    {entry.amount >= 0 ? '+' : ''}{entry.amount} PV
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        <Card>
          <View style={s.row}>
            <Text style={s.sectionTitle}>
              {m.status === 'Newbie' ? 'Newbie → Pro' : m.status === 'Pro' ? 'Pro → Distributor' : 'Distributor goals'}
            </Text>
            <Badge text={pct + '%'} color={pct >= 80 ? COLORS.primary : pct >= 40 ? COLORS.warn : COLORS.danger} />
          </View>
          <ProgressBar value={NEWBIE_REQS.filter(r => m.reqs?.[r.id]).length} max={NEWBIE_REQS.length} height={6} />
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
            <Btn full color={COLORS.accent} onPress={() => updateMember(m.id, { status: 'Pro', reqs: {} })} style={{ marginTop: 12 }}>
              Promote to Pro
            </Btn>
          )}
          {m.status === 'Pro' && m.pv >= 100 && (
            <Btn full color={COLORS.primary} onPress={() => updateMember(m.id, { status: 'Distributor' })} style={{ marginTop: 12 }}>
              Promote to Distributor
            </Btn>
          )}
        </Card>

        {indirects.length > 0 && (
          <Card>
            <Text style={s.sectionTitle}>Their downlines</Text>
            {indirects.map(x => (
              <TouchableOpacity key={x.id} onPress={() => setDetail(x.id)} style={s.pvRow}>
                <View style={[s.pvDot, { backgroundColor: x.pv >= 250 ? COLORS.primary : COLORS.danger }]} />
                <Text style={{ color: COLORS.t1, fontSize: 12, flex: 1 }}>{x.name}</Text>
                <Text style={{ color: COLORS.t3, fontSize: 11 }}>{x.status} · {x.pv} PV</Text>
              </TouchableOpacity>
            ))}
          </Card>
        )}

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn full outline onPress={() => Linking.openURL(`tel:${m.phone}`).catch(() => {})}>📞 Call</Btn>
          <Btn full outline onPress={() => sendWhatsApp(m.phone, '')}>💬 WhatsApp</Btn>
          <Btn full outline onPress={() => { updateMember(m.id, { lastContact: today() }); setDetail(null); }}>✓ Contacted</Btn>
        </View>
      </ScrollView>
    );
  }

  // ─── MAIN ───
  return (
    <ScrollView style={[s.container, { paddingTop: insets.top + 12 }]} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={s.title}>NeoLife Center</Text>
      <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 14 }}>
        {tier.rank} · {tier.svb}% SVB tier
      </Text>
      <TabBar tabs={['Status', 'Team', 'PV']} active={tab} onChange={setTab} />

      {/* ─── STATUS TAB ─── */}
      {tab === 0 && (
        <View>
          <Card glow={COLORS.accent}>
            <Text style={s.label}>DIRECTOR CHALLENGE</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={{ fontSize: 30, fontWeight: '800', color: COLORS.t1 }}>{daysLeft}</Text>
              <Text style={{ color: COLORS.t2, fontSize: 12 }}>days left</Text>
            </View>
            <ProgressBar value={qpv} max={750} height={6} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              <Text style={{ color: COLORS.t3, fontSize: 10 }}>{qpv} / 750 QPV this month</Text>
              <Text style={{ color: COLORS.warn, fontSize: 10 }}>{cycleDaysLeft} days in cycle</Text>
            </View>
          </Card>

          {/* Current tier */}
          <Card>
            <Text style={s.sectionTitle}>Where you stand</Text>
            {SVB_TIERS.map((t, i) => {
              const isCurrent = t.rank === tier.rank;
              const reached = qpv >= t.min;
              return (
                <View key={i} style={[s.tierRow, isCurrent && { backgroundColor: COLORS.primary + '11', borderRadius: 8 }]}>
                  <View style={[s.tierDot, { backgroundColor: reached ? COLORS.primary : COLORS.border }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: reached ? COLORS.t1 : COLORS.t3, fontSize: 12, fontWeight: isCurrent ? '700' : '400' }}>
                      {t.rank}
                    </Text>
                    <Text style={{ color: COLORS.t3, fontSize: 9 }}>
                      {t.min.toLocaleString()}{t.max === Infinity ? '+' : `–${t.max.toLocaleString()}`} QPV
                    </Text>
                  </View>
                  <Text style={{ color: reached ? COLORS.primary : COLORS.t3, fontSize: 13, fontWeight: '700' }}>{t.svb}%</Text>
                </View>
              );
            })}
            {nextTier && (
              <View style={{ marginTop: 10, padding: 10, backgroundColor: COLORS.bg, borderRadius: 8 }}>
                <Text style={{ color: COLORS.t2, fontSize: 11 }}>
                  {nextTier.min - qpv} QPV more to reach {nextTier.rank} ({nextTier.svb}% SVB)
                </Text>
              </View>
            )}
          </Card>

          {/* Direct legs */}
          <Card>
            <View style={s.row}>
              <Text style={s.sectionTitle}>Direct legs</Text>
              <Badge text={`${directs.length} active`} color={directs.length >= 3 ? COLORS.primary : COLORS.warn} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              {directs.map(m => (
                <TouchableOpacity key={m.id} onPress={() => setDetail(m.id)}
                  style={[s.legCircle, { borderColor: m.pv >= 250 ? COLORS.primary : m.pv > 0 ? COLORS.warn : COLORS.danger, backgroundColor: (m.pv >= 250 ? COLORS.primary : m.pv > 0 ? COLORS.warn : COLORS.danger) + '22' }]}>
                  <Text style={{ color: m.pv >= 250 ? COLORS.primary : m.pv > 0 ? COLORS.warn : COLORS.danger, fontWeight: '700', fontSize: 14 }}>
                    {m.name[0].toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
              {Array.from({ length: Math.max(0, 3 - directs.length) }).map((_, i) => (
                <View key={'e' + i} style={s.legEmpty}><Text style={{ color: COLORS.t3, fontSize: 18 }}>+</Text></View>
              ))}
            </View>
            <Text style={{ color: COLORS.t3, fontSize: 10, marginTop: 8 }}>
              Teal = 250+ PV · Gold = partial · Red = zero PV
            </Text>
          </Card>

          {/* Status coverage */}
          <Card>
            <Text style={s.sectionTitle}>Status coverage</Text>
            <Text style={{ color: COLORS.t3, fontSize: 10, marginBottom: 8 }}>
              Director needs someone at every level below you.
            </Text>
            {['Newbie', 'Pro', 'Distributor'].map(st => (
              <View key={st} style={s.coverRow}>
                <Text style={{ color: COLORS.t2, fontSize: 12, flex: 1 }}>{st}</Text>
                <Badge text={statusCount[st] > 0 ? `${statusCount[st]} covered` : 'Empty'}
                  color={statusCount[st] > 0 ? COLORS.primary : COLORS.danger} />
              </View>
            ))}
          </Card>

          {/* Add QPV */}
          <Card>
            <Text style={s.sectionTitle}>Your personal PV</Text>
            <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 8 }}>
              Products you bought yourself. Team PV is logged per person under the Team tab.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Input value={pvInput} onChangeText={setPvInput} placeholder="Enter PV (e.g. 136)" keyboardType="numeric" />
              </View>
              <Btn onPress={() => {
                const v = parseFloat(pvInput);
                if (!isNaN(v) && v > 0) { setData(d => ({ ...d, qpv: (d?.qpv || 0) + v })); setPvInput(''); }
              }}>Add</Btn>
            </View>
          </Card>

          <Card>
            <Text style={s.sectionTitle}>Correct your QPV total</Text>
            <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 8 }}>
              If the app total does not match your back office, set the real figure here.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Input value={correctPV} onChangeText={setCorrectPV} placeholder={`Current: ${qpv}`} keyboardType="numeric" />
              </View>
              <Btn outline onPress={() => {
                const v = parseFloat(correctPV);
                if (!isNaN(v) && v >= 0) { setData(d => ({ ...d, qpv: v })); setCorrectPV(''); }
              }}>Set</Btn>
            </View>
          </Card>
        </View>
      )}

      {/* ─── TEAM TAB ─── */}
      {tab === 1 && (
        <View>
          <Card glow={COLORS.primary} style={{ alignItems: 'center', padding: 14 }}>
            <View style={s.youNode}><Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.bg }}>M</Text></View>
            <Text style={{ color: COLORS.t1, fontSize: 13, fontWeight: '600' }}>Macho (You)</Text>
            <Text style={{ color: COLORS.t3, fontSize: 10 }}>{tier.rank} · {qpv} QPV</Text>
          </Card>

          {/* Readiness summary */}
          {(team || []).length > 0 && (
            <Card style={{ borderLeftWidth: 3, borderLeftColor: COLORS.accent }}>
              <Text style={{ color: COLORS.t3, fontSize: 10, fontWeight: '600', letterSpacing: 1 }}>WHO TO COACH THIS WEEK</Text>
              {(() => {
                const ready = (team || []).filter(m => m.status === 'Newbie' && readiness(m) >= 60)
                  .sort((a, b) => readiness(b) - readiness(a));
                if (ready.length === 0) {
                  return <Text style={{ color: COLORS.t2, fontSize: 12, marginTop: 6 }}>
                    Nobody is close to promotion yet. Focus on business basics training.
                  </Text>;
                }
                return ready.slice(0, 3).map(m => (
                  <TouchableOpacity key={m.id} onPress={() => setDetail(m.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 }}>
                    <Text style={{ color: COLORS.t1, fontSize: 12, flex: 1 }}>{m.name}</Text>
                    <View style={{ width: 60 }}><ProgressBar value={readiness(m)} max={100} color={COLORS.accent} height={4} /></View>
                    <Text style={{ color: COLORS.accent, fontSize: 11, fontWeight: '600' }}>{readiness(m)}%</Text>
                  </TouchableOpacity>
                ));
              })()}
            </Card>
          )}

          <View style={s.treeLine}>
            {directs.map(m => {
              const ds = daysBetween(m.lastContact || m.joined, today());
              const indirects = (team || []).filter(x => x.sponsorId === m.id);
              return (
                <View key={m.id}>
                  <Card onPress={() => setDetail(m.id)}
                    style={{ padding: 12, borderTopWidth: 3, borderTopColor: m.pv >= 250 ? COLORS.primary : m.pv > 0 ? COLORS.warn : COLORS.danger }}>
                    <View style={s.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: COLORS.t1, fontSize: 13, fontWeight: '600' }}>{m.name}</Text>
                        <Text style={{ color: COLORS.t3, fontSize: 10 }}>
                          {m.status} · {m.pv} PV{indirects.length > 0 ? ` · ${indirects.length} below` : ''}
                        </Text>
                      </View>
                      <Badge text={ds >= 7 ? 'Cold' : ds >= 3 ? 'Warm' : 'Active'}
                        color={ds >= 7 ? COLORS.danger : ds >= 3 ? COLORS.warn : COLORS.primary} />
                    </View>
                  </Card>
                  {indirects.length > 0 && (
                    <View style={{ borderLeftWidth: 2, borderLeftColor: COLORS.border, marginLeft: 14, paddingLeft: 12 }}>
                      {indirects.map(x => (
                        <Card key={x.id} onPress={() => setDetail(x.id)} style={{ padding: 10, marginBottom: 6 }}>
                          <Text style={{ color: COLORS.t1, fontSize: 12 }}>{x.name}</Text>
                          <Text style={{ color: COLORS.t3, fontSize: 10 }}>{x.status} · {x.pv} PV</Text>
                        </Card>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {(team || []).length === 0 && (
            <Card style={{ alignItems: 'center', padding: 28 }}>
              <Text style={{ fontSize: 28, marginBottom: 8 }}>◈</Text>
              <Text style={{ color: COLORS.t2, fontSize: 13 }}>No team members yet</Text>
              <Text style={{ color: COLORS.t3, fontSize: 11, marginTop: 4, textAlign: 'center' }}>
                Add your first direct leg to start building.
              </Text>
            </Card>
          )}

          <Btn full onPress={() => setAdding(true)} style={{ marginTop: 8 }}>+ Add downline</Btn>
        </View>
      )}

      {/* ─── PV TAB ─── */}
      {tab === 2 && (
        <View>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <Ring value={qpv} max={750} size={160}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: COLORS.t1 }}>{qpv}</Text>
              <Text style={{ color: COLORS.t3, fontSize: 10 }}>/ 750 QPV</Text>
            </Ring>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            <Card style={{ flex: 1, padding: 11, marginBottom: 0, alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.t1 }}>{totalTeamPV}</Text>
              <Text style={{ color: COLORS.t3, fontSize: 9 }}>Team PV</Text>
            </Card>
            <Card style={{ flex: 1, padding: 11, marginBottom: 0, alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.warn }}>{cycleDaysLeft}</Text>
              <Text style={{ color: COLORS.t3, fontSize: 9 }}>Days in cycle</Text>
            </Card>
            <Card style={{ flex: 1, padding: 11, marginBottom: 0, alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.danger }}>
                {cycleDaysLeft > 0 ? Math.ceil(Math.max(0, 750 - qpv) / cycleDaysLeft) : 0}
              </Text>
              <Text style={{ color: COLORS.t3, fontSize: 9 }}>PV/day needed</Text>
            </Card>
          </View>

          <Card>
            <Text style={s.sectionTitle}>Team PV breakdown</Text>
            {(team || []).length === 0 && (
              <Text style={{ color: COLORS.t3, fontSize: 12, textAlign: 'center', padding: 16 }}>
                Add team members to track their PV
              </Text>
            )}
            {(team || []).sort((a, b) => a.pv - b.pv).map(m => {
              const daysSinceOrder = m.lastOrder ? daysBetween(m.lastOrder, today()) : null;
              const dueReorder = daysSinceOrder !== null && daysSinceOrder >= REORDER_DAYS - 5;
              return (
                <TouchableOpacity key={m.id} onPress={() => setDetail(m.id)} style={s.pvRow}>
                  <View style={[s.pvDot, { backgroundColor: m.pv >= 250 ? COLORS.primary : m.pv > 0 ? COLORS.warn : COLORS.danger }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: COLORS.t1, fontSize: 12 }}>{m.name}</Text>
                    {dueReorder && <Text style={{ color: COLORS.warn, fontSize: 9 }}>Reorder due</Text>}
                  </View>
                  <Text style={{ color: m.pv >= 250 ? COLORS.primary : m.pv > 0 ? COLORS.warn : COLORS.danger, fontSize: 13, fontWeight: '600' }}>
                    {m.pv} PV
                  </Text>
                </TouchableOpacity>
              );
            })}
          </Card>

          {(team || []).filter(m => m.pv === 0).length > 0 && (
            <Card style={{ borderLeftWidth: 3, borderLeftColor: COLORS.danger }}>
              <Text style={{ color: COLORS.danger, fontSize: 12, fontWeight: '600' }}>
                {(team || []).filter(m => m.pv === 0).length} members at zero PV
              </Text>
              <Text style={{ color: COLORS.t3, fontSize: 11, marginTop: 4 }}>
                {cycleDaysLeft} days left in this cycle. Open the Attack Plan on HQ for drafted messages.
              </Text>
            </Card>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.t1, marginBottom: 2 },
  back: { color: COLORS.t2, fontSize: 13, marginBottom: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { color: COLORS.accent, fontSize: 10, fontWeight: '600', letterSpacing: 1, marginBottom: 6 },
  sectionTitle: { color: COLORS.t2, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, paddingHorizontal: 6 },
  tierDot: { width: 8, height: 8, borderRadius: 4 },
  coverRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  legCircle: { width: 42, height: 42, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  legEmpty: { width: 42, height: 42, borderRadius: 14, borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  youNode: { width: 46, height: 46, borderRadius: 15, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  treeLine: { borderLeftWidth: 2, borderLeftColor: COLORS.border, marginLeft: 22, paddingLeft: 16, marginTop: 4 },
  pvRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pvDot: { width: 8, height: 8, borderRadius: 4 },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  reqBox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: COLORS.t3, alignItems: 'center', justifyContent: 'center' },
  reqBoxDone: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
});
