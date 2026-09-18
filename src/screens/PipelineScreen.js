import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Share, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import { askClaude } from '../utils/ai';
import { Card, Badge, Btn, Input, TabBar } from '../components/UI';
import { daysBetween, today } from '../utils/storage';
import { PIPELINE_STAGES } from '../data/constants';
import { buildKnowledgeContext } from '../utils/knowledge';
import { buildUserContext } from '../utils/userLibrary';

const SOURCES = ['Cold Outreach', 'Referral', 'Funnel', 'Social Media', 'Office Visit', 'Church', 'School', 'Market'];

// What to actually do at each stage
const STAGE_GUIDE = [
  { action: 'Reach out for the first time', hint: 'Do not pitch. Just reconnect and find out what they are doing.' },
  { action: 'Wait for reply, follow up in 2 days', hint: 'If no reply after 2 tries, leave them and move on.' },
  { action: 'Find their need before you invite', hint: 'Ask what they want to change about their situation.' },
  { action: 'Confirm they will attend', hint: 'Call the day before. Send the location. Offer to come with them.' },
  { action: 'Get their honest reaction', hint: 'Ask what they liked and what they are unsure about.' },
  { action: 'Handle their objection directly', hint: 'Do not argue. Ask questions until they answer themselves.' },
  { action: 'Set a deadline and close', hint: 'Give them a specific date. Vague interest dies.' },
  { action: 'Onboard them properly in first 48h', hint: 'Get them their first PV and into a training fast.' },
];

const OBJECTIONS = ['No money', 'No time', 'Its a scam', 'Family says no', 'Tried before, failed', 'Need to think', 'Not interested'];

export default function PipelineScreen({ prospects, setProspects }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(0);
  const [detail, setDetail] = useState(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('Cold Outreach');
  const [stage, setStage] = useState(0);
  const [noteText, setNoteText] = useState('');
  const [experience, setExperience] = useState('');
  const [draft, setDraft] = useState('');
  const [drafting, setDrafting] = useState(false);

  const active = (prospects || []).filter(p => !p.cold && p.stage < 7);
  const joined = (prospects || []).filter(p => p.stage === 7);
  const coldList = (prospects || []).filter(p => p.cold);

  const add = () => {
    if (!name.trim()) return;
    setProspects(prev => [...(prev || []), {
      id: Date.now(), name: name.trim(), phone: phone.trim(), source, stage,
      experience: experience.trim(),
      added: today(), lastContact: today(), notes: [], objection: null, cold: false,
    }]);
    setName(''); setPhone(''); setStage(0); setAdding(false);
  };

  const update = (id, changes) => {
    setProspects(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p));
  };

  const move = (id, dir) => {
    const p = (prospects || []).find(x => x.id === id);
    if (!p) return;
    const next = Math.max(0, Math.min(7, p.stage + dir));
    update(id, { stage: next, lastContact: today(), cold: false });
    setDetail(null); setDraft('');
  };

  const addNote = (id) => {
    if (!noteText.trim()) return;
    const p = (prospects || []).find(x => x.id === id);
    const notes = [...(p.notes || []), { date: today(), text: noteText.trim() }];
    update(id, { notes, lastContact: today() });
    setNoteText('');
  };

  const draftMessage = async (p) => {
    setDrafting(true); setDraft('');
    const stageName = PIPELINE_STAGES[p.stage].name;
    const guide = STAGE_GUIDE[p.stage];
    const days = daysBetween(p.lastContact, today());
    const notesText = (p.notes || []).slice(-3).map(n => n.text).join('; ');

    const topic = p.objection ? `objection ${p.objection} prospecting` : 'prospecting follow up approach';
    let knowledge = buildKnowledgeContext(topic);
    try { knowledge += await buildUserContext(topic); } catch {}

    const result = await askClaude(`Write a WhatsApp message I can send right now. I'm Macho, a NeoLife distributor in Nigeria building toward Director.

PROSPECT: ${p.name}
STAGE: ${stageName}
GOAL AT THIS STAGE: ${guide.action}
LAST CONTACT: ${days} days ago
SOURCE: ${p.source}
${p.objection ? `THEIR OBJECTION: "${p.objection}"` : ''}
${notesText ? `MY NOTES: ${notesText}` : ''}
${knowledge}

Rules:
- Sound like a real Nigerian person texting a friend
- Under 55 words
- One emoji maximum, or none
- Do not pitch products in early stages
- End with something that makes replying easy
- Output only the message, nothing else`, { maxTokens: 400 });

    setDraft(result.ok ? result.text : result.error);
    setDrafting(false);
  };

  const sendWhatsApp = (phoneNum, message) => {
    const clean = (phoneNum || '').replace(/[^0-9]/g, '');
    const intl = clean.startsWith('0') ? '234' + clean.slice(1) : clean;
    Linking.openURL(`whatsapp://send?phone=${intl}&text=${encodeURIComponent(message)}`)
      .catch(() => Share.share({ message }).catch(() => {}));
  };

  const call = (phoneNum) => Linking.openURL(`tel:${phoneNum}`).catch(() => {});

  // ─── DETAIL VIEW ───
  if (detail) {
    const p = (prospects || []).find(x => x.id === detail);
    if (!p) { setDetail(null); return null; }
    const st = PIPELINE_STAGES[p.stage];
    const guide = STAGE_GUIDE[p.stage];
    const days = daysBetween(p.lastContact, today());

    return (
      <ScrollView style={[s.container, { paddingTop: insets.top + 12 }]} contentContainerStyle={{ paddingBottom: 100 }}>
        <TouchableOpacity onPress={() => { setDetail(null); setDraft(''); }}>
          <Text style={s.back}>← Back to pipeline</Text>
        </TouchableOpacity>

        <Card glow={st.color}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.t1 }}>{p.name}</Text>
            <Badge text={st.name} color={st.color} />
          </View>
          <Text style={{ color: COLORS.t3, fontSize: 11 }}>{p.phone || 'No phone'} · {p.source}</Text>
          <Text style={{ color: days >= 7 ? COLORS.danger : days >= 3 ? COLORS.warn : COLORS.primary, fontSize: 11, marginTop: 4 }}>
            {days === 0 ? 'Contacted today' : `${days} days since contact`} · added {p.added}
          </Text>
        </Card>

        {/* What to do now */}
        <Card style={{ borderLeftWidth: 3, borderLeftColor: st.color }}>
          <Text style={{ color: COLORS.t3, fontSize: 10, fontWeight: '600', letterSpacing: 1 }}>WHAT TO DO NOW</Text>
          <Text style={{ color: COLORS.t1, fontSize: 14, fontWeight: '600', marginTop: 4 }}>{guide.action}</Text>
          <Text style={{ color: COLORS.t2, fontSize: 12, marginTop: 4, lineHeight: 18 }}>{guide.hint}</Text>
        </Card>

        {/* Quick actions */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <Btn full outline onPress={() => call(p.phone)}>📞 Call</Btn>
          <Btn full outline onPress={() => update(p.id, { lastContact: today() })}>✓ Contacted</Btn>
        </View>

        {/* AI draft */}
        <Card>
          <Text style={{ color: COLORS.t2, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Message for this stage</Text>
          {draft ? (
            <View>
              <View style={{ backgroundColor: COLORS.bg, borderRadius: 10, padding: 12, borderLeftWidth: 2, borderLeftColor: COLORS.primary }}>
                <Text style={{ color: COLORS.t2, fontSize: 12, lineHeight: 19 }}>{draft}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                <Btn full onPress={() => sendWhatsApp(p.phone, draft)} style={{ height: 38 }}>Send on WhatsApp</Btn>
                <Btn outline onPress={() => draftMessage(p)} style={{ height: 38, paddingHorizontal: 12 }}>Redo</Btn>
              </View>
            </View>
          ) : (
            <Btn full outline onPress={() => draftMessage(p)}>{drafting ? 'Writing...' : 'Draft message with AI'}</Btn>
          )}
        </Card>

        {/* Objection */}
        <Card>
          <Text style={{ color: COLORS.t2, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Their objection</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {OBJECTIONS.map(o => (
              <TouchableOpacity key={o} onPress={() => update(p.id, { objection: p.objection === o ? null : o })}
                style={[s.tag, p.objection === o && { borderColor: COLORS.danger, backgroundColor: COLORS.danger + '22' }]}>
                <Text style={{ color: p.objection === o ? COLORS.danger : COLORS.t3, fontSize: 10 }}>{o}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {p.objection && (
            <Text style={{ color: COLORS.t3, fontSize: 11, marginTop: 8 }}>
              AI will factor this into the next drafted message.
            </Text>
          )}
        </Card>

        {/* Notes */}
        <Card>
          <Text style={{ color: COLORS.t2, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Notes</Text>
          {(p.notes || []).length === 0 && (
            <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 8 }}>Nothing logged yet.</Text>
          )}
          {(p.notes || []).slice().reverse().map((n, i) => (
            <View key={i} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
              <Text style={{ color: COLORS.t2, fontSize: 12 }}>{n.text}</Text>
              <Text style={{ color: COLORS.t3, fontSize: 9, marginTop: 2 }}>{n.date}</Text>
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <View style={{ flex: 1 }}>
              <Input value={noteText} onChangeText={setNoteText} placeholder="What happened?" />
            </View>
            <Btn onPress={() => addNote(p.id)}>Add</Btn>
          </View>
        </Card>

        {/* Stage movement */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {p.stage > 0 && (
            <Btn full outline onPress={() => move(p.id, -1)}>← {PIPELINE_STAGES[p.stage - 1].name}</Btn>
          )}
          {p.stage < 7 && (
            <Btn full onPress={() => move(p.id, 1)}>{PIPELINE_STAGES[p.stage + 1].name} →</Btn>
          )}
        </View>

        {p.cold ? (
          <Btn full color={COLORS.primary} onPress={() => { update(p.id, { cold: false, lastContact: today() }); setDetail(null); }}>
            Reactivate this prospect
          </Btn>
        ) : (
          <Btn full outline onPress={() => { update(p.id, { cold: true }); setDetail(null); }}>
            Move to Went Cold
          </Btn>
        )}
      </ScrollView>
    );
  }

  // ─── LIST VIEW ───
  const renderCard = (p) => {
    const d = daysBetween(p.lastContact, today());
    const st = PIPELINE_STAGES[p.stage];
    return (
      <Card key={p.id} onPress={() => { setDetail(p.id); setDraft(''); }} style={{ marginLeft: 14, padding: 11, marginBottom: 5 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.t1, fontSize: 13, fontWeight: '600' }}>{p.name}</Text>
            <Text style={{ color: COLORS.t3, fontSize: 10 }}>
              {p.source}{p.objection ? ` · "${p.objection}"` : ''}
            </Text>
          </View>
          {d >= 3 && <Badge text={d >= 7 ? 'Overdue' : `${d}d`} color={d >= 7 ? COLORS.danger : COLORS.warn} />}
        </View>
      </Card>
    );
  };

  const needAction = active.filter(p => daysBetween(p.lastContact, today()) >= 3);
  const conversion = (prospects || []).length > 0
    ? Math.round((joined.length / (prospects || []).length) * 100) : 0;

  return (
    <ScrollView style={[s.container, { paddingTop: insets.top + 12 }]} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={s.title}>Prospect Pipeline</Text>
      <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 14 }}>Eight stages · one clear journey</Text>

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
        <Card style={{ flex: 1, padding: 11, marginBottom: 0, alignItems: 'center' }}>
          <Text style={{ fontSize: 21, fontWeight: '700', color: COLORS.t1 }}>{active.length}</Text>
          <Text style={{ color: COLORS.t3, fontSize: 9 }}>Active</Text>
        </Card>
        <Card style={{ flex: 1, padding: 11, marginBottom: 0, alignItems: 'center' }}>
          <Text style={{ fontSize: 21, fontWeight: '700', color: needAction.length > 0 ? COLORS.danger : COLORS.primary }}>{needAction.length}</Text>
          <Text style={{ color: COLORS.t3, fontSize: 9 }}>Need action</Text>
        </Card>
        <Card style={{ flex: 1, padding: 11, marginBottom: 0, alignItems: 'center' }}>
          <Text style={{ fontSize: 21, fontWeight: '700', color: COLORS.primary }}>{conversion}%</Text>
          <Text style={{ color: COLORS.t3, fontSize: 9 }}>Converted</Text>
        </Card>
      </View>

      <TabBar tabs={[`Pipeline (${active.length})`, `Joined (${joined.length})`, `Cold (${coldList.length})`]}
        active={tab} onChange={setTab} />

      {tab === 0 && (
        <View>
          <Btn full onPress={() => setAdding(true)} style={{ marginBottom: 12 }}>+ Add prospect</Btn>

          {adding && (
            <Card style={{ borderColor: COLORS.primary + '44' }}>
              <Input value={name} onChangeText={setName} placeholder="Name" />
              <View style={{ height: 8 }} />
              <Input value={phone} onChangeText={setPhone} placeholder="Phone (0803...)" keyboardType="phone-pad" />
              <View style={{ height: 10 }} />

              <Text style={{ color: COLORS.t2, fontSize: 12, marginBottom: 6 }}>Where did you meet?</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {SOURCES.map(src => (
                  <TouchableOpacity key={src} onPress={() => setSource(src)}
                    style={[s.tag, source === src && { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '22' }]}>
                    <Text style={{ color: source === src ? COLORS.primary : COLORS.t3, fontSize: 10 }}>{src}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ color: COLORS.t2, fontSize: 12, marginBottom: 6 }}>Starting stage</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {PIPELINE_STAGES.slice(0, 7).map((st, i) => (
                  <TouchableOpacity key={i} onPress={() => setStage(i)}
                    style={[s.tag, stage === i && { borderColor: st.color, backgroundColor: st.color + '22' }]}>
                    <Text style={{ color: stage === i ? st.color : COLORS.t3, fontSize: 10 }}>{st.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ color: COLORS.t2, fontSize: 12, marginBottom: 6 }}>How did you meet? Tell the story</Text>
              <TextInput
                value={experience}
                onChangeText={setExperience}
                placeholder="e.g. Met at the barber, talked about side hustles, seemed interested..."
                placeholderTextColor={COLORS.t3}
                multiline
                numberOfLines={3}
                style={{ height: 80, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, color: COLORS.t1, paddingHorizontal: 12, paddingTop: 10, fontSize: 12, textAlignVertical: 'top', marginBottom: 12 }}
              />

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn full onPress={add}>Save</Btn>
                <Btn full outline onPress={() => setAdding(false)}>Cancel</Btn>
              </View>
            </Card>
          )}

          {active.length === 0 && !adding && (
            <Card style={{ alignItems: 'center', padding: 28 }}>
              <Text style={{ fontSize: 28, marginBottom: 8 }}>◎</Text>
              <Text style={{ color: COLORS.t2, fontSize: 13 }}>No prospects yet</Text>
              <Text style={{ color: COLORS.t3, fontSize: 11, marginTop: 4, textAlign: 'center' }}>
                Add the people you already know. Start with the cold list.
              </Text>
            </Card>
          )}

          {PIPELINE_STAGES.slice(0, 7).map((st, si) => {
            const items = active.filter(p => p.stage === si);
            if (items.length === 0) return null;
            return (
              <View key={si} style={{ marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: st.color }} />
                  <Text style={{ color: COLORS.t2, fontSize: 12, fontWeight: '600', flex: 1 }}>{st.name}</Text>
                  <Badge text={String(items.length)} color={st.color} />
                </View>
                {items.map(renderCard)}
              </View>
            );
          })}
        </View>
      )}

      {tab === 1 && (
        <View>
          {joined.length === 0 ? (
            <Card style={{ alignItems: 'center', padding: 28 }}>
              <Text style={{ color: COLORS.t3, fontSize: 12 }}>Nobody has joined yet. Keep working the pipeline.</Text>
            </Card>
          ) : joined.map(p => (
            <Card key={p.id} onPress={() => setDetail(p.id)} style={{ padding: 12, borderLeftWidth: 3, borderLeftColor: '#00cc88' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ color: COLORS.t1, fontSize: 13, fontWeight: '600' }}>{p.name}</Text>
                  <Text style={{ color: COLORS.t3, fontSize: 10 }}>Joined · from {p.source}</Text>
                </View>
                <Badge text="Joined" color="#00cc88" />
              </View>
            </Card>
          ))}
        </View>
      )}

      {tab === 2 && (
        <View>
          <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 12 }}>
            People who stopped responding. Reactivate any time — timing changes everything.
          </Text>
          {coldList.length === 0 ? (
            <Card style={{ alignItems: 'center', padding: 28 }}>
              <Text style={{ color: COLORS.t3, fontSize: 12 }}>Nobody in the cold list.</Text>
            </Card>
          ) : coldList.map(p => (
            <Card key={p.id} onPress={() => setDetail(p.id)} style={{ padding: 12, opacity: 0.75 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ color: COLORS.t2, fontSize: 13 }}>{p.name}</Text>
                  <Text style={{ color: COLORS.t3, fontSize: 10 }}>
                    Was at {PIPELINE_STAGES[p.stage].name} · {daysBetween(p.lastContact, today())}d ago
                  </Text>
                </View>
                <Badge text="Cold" color={COLORS.t3} />
              </View>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.t1, marginBottom: 4 },
  back: { color: COLORS.t2, fontSize: 13, marginBottom: 14 },
  tag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
});
