import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Linking, Share, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import { Card, Badge, Btn, TabBar } from '../components/UI';
import { askClaude } from '../utils/ai';

export default function OutreachScreen({ prospects, setProspects, data }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(0);
  const [addingContact, setAddingContact] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('');
  const [experience, setExperience] = useState('');
  const [dailyTarget, setDailyTarget] = useState(15);
  const [drafting, setDrafting] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [sentToday, setSentToday] = useState([]);
  const [autoQueue, setAutoQueue] = useState([]);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Build today's queue — pick random prospects who haven't been messaged today
  useEffect(() => {
    if (!prospects || prospects.length === 0) return;
    const available = prospects.filter(p =>
      p.phone && !sentToday.includes(p.id) && p.stage !== 'Joined' && p.stage !== 'Went Cold'
    );
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    setAutoQueue(shuffled.slice(0, Math.max(0, dailyTarget - sentToday.length)));
  }, [prospects, sentToday, dailyTarget]);

  const sendWhatsApp = (phoneNum, message) => {
    const clean = (phoneNum || '').replace(/[^0-9]/g, '');
    const intl = clean.startsWith('0') ? '234' + clean.slice(1) : clean;
    Linking.openURL(`whatsapp://send?phone=${intl}&text=${encodeURIComponent(message)}`)
      .catch(() => Share.share({ message }).catch(() => {}));
  };

  const draftMessage = async (prospect) => {
    setDrafting(prospect.id);
    try {
      const res = await askClaude(
        `You are a Nigerian NeoLife network marketer. Draft a WhatsApp message to this person.

Name: ${prospect.name}
Stage: ${prospect.stage || 'Cold'}
How we met: ${prospect.experience || 'Not specified'}
Last contact: ${prospect.lastContact || 'Never'}
Notes: ${prospect.notes || 'None'}

Rules:
- Sound natural, like a real person texting in Nigeria
- Under 60 words
- No begging, no desperation
- Give them a reason to reply
- If they're cold, be casual and reconnect first
- If they showed interest before, reference it
- Don't use too many emojis
- Match how Nigerians actually text on WhatsApp`,
        { maxTokens: 300 }
      );
      setDrafts(prev => ({ ...prev, [prospect.id]: res.ok ? res.text : 'Could not draft. Try again.' }));
    } catch {
      setDrafts(prev => ({ ...prev, [prospect.id]: 'Connection error.' }));
    }
    setDrafting(null);
  };

  const markSent = (id) => {
    setSentToday(prev => [...prev, id]);
    setProspects(prev => prev.map(p =>
      p.id === id ? { ...p, lastContact: todayStr, contactCount: (p.contactCount || 0) + 1 } : p
    ));
  };

  const addContact = () => {
    if (!name.trim()) return;
    const newP = {
      id: Date.now().toString(),
      name: name.trim(),
      phone: phone.trim(),
      source: source.trim(),
      experience: experience.trim(),
      stage: 'Cold List',
      notes: '',
      added: todayStr,
      lastContact: null,
      contactCount: 0,
    };
    setProspects(prev => [...prev, newP]);
    setName(''); setPhone(''); setSource(''); setExperience('');
    setAddingContact(false);
  };

  const ProspectCard = ({ person, showActions }) => {
    const draft = drafts[person.id];
    const isSent = sentToday.includes(person.id);
    return (
      <Card style={{ padding: 13, opacity: isSent ? 0.5 : 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.t1, fontSize: 14, fontWeight: '600' }}>{person.name}</Text>
            <Text style={{ color: COLORS.t3, fontSize: 10 }}>
              {person.stage || 'Cold'}{person.source ? ` · via ${person.source}` : ''}
              {person.lastContact ? ` · last: ${person.lastContact}` : ' · never contacted'}
            </Text>
            {person.experience ? (
              <Text style={{ color: COLORS.t3, fontSize: 10, fontStyle: 'italic', marginTop: 2 }}>
                "{person.experience}"
              </Text>
            ) : null}
          </View>
          {isSent ? (
            <Badge text="Sent" color={COLORS.success} />
          ) : (
            <Badge text={person.stage || 'Cold'} color={
              person.stage === 'Responded' ? COLORS.success :
              person.stage === 'Interested' ? COLORS.primary :
              COLORS.t3
            } />
          )}
        </View>

        {showActions && !isSent && (
          <View>
            {draft ? (
              <View>
                <View style={{ backgroundColor: COLORS.bg, borderRadius: 10, padding: 10, marginTop: 8, borderLeftWidth: 2, borderLeftColor: COLORS.primary }}>
                  <Text style={{ color: COLORS.t2, fontSize: 12, lineHeight: 18 }}>{draft}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                  <Btn full color={COLORS.success} onPress={() => {
                    sendWhatsApp(person.phone, draft);
                    markSent(person.id);
                  }} style={{ height: 36 }}>
                    Send on WhatsApp
                  </Btn>
                  <Btn outline onPress={() => draftMessage(person)} style={{ height: 36, paddingHorizontal: 12 }}>
                    Redo
                  </Btn>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                <Btn full outline onPress={() => draftMessage(person)} style={{ height: 34 }}>
                  {drafting === person.id ? 'Drafting...' : 'Draft message'}
                </Btn>
                {person.phone && (
                  <Btn outline onPress={() => {
                    sendWhatsApp(person.phone, '');
                    markSent(person.id);
                  }} style={{ height: 34, paddingHorizontal: 12 }}>
                    Quick send
                  </Btn>
                )}
              </View>
            )}
          </View>
        )}
      </Card>
    );
  };

  return (
    <ScrollView style={[st.container, { paddingTop: insets.top + 12 }]} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={st.title}>Virtual Prospecting</Text>
      <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 14 }}>
        {sentToday.length} of {dailyTarget} messages sent today
      </Text>

      {/* Progress bar */}
      <View style={{ height: 6, backgroundColor: COLORS.border, borderRadius: 3, marginBottom: 16, overflow: 'hidden' }}>
        <View style={{
          height: 6, borderRadius: 3,
          backgroundColor: sentToday.length >= dailyTarget ? COLORS.success : COLORS.primary,
          width: `${Math.min(100, (sentToday.length / dailyTarget) * 100)}%`,
        }} />
      </View>

      <TabBar tabs={["Today's Queue", 'All Contacts', 'Add New']} active={tab} onChange={setTab} />

      {/* TODAY'S QUEUE */}
      {tab === 0 && (
        <View>
          {/* Target setter */}
          <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 }}>
            <Text style={{ color: COLORS.t2, fontSize: 12 }}>Daily target</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity onPress={() => setDailyTarget(Math.max(1, dailyTarget - 1))}
                style={st.countBtn}><Text style={st.countText}>−</Text></TouchableOpacity>
              <Text style={{ color: COLORS.t1, fontSize: 18, fontWeight: '700', width: 30, textAlign: 'center' }}>{dailyTarget}</Text>
              <TouchableOpacity onPress={() => setDailyTarget(dailyTarget + 1)}
                style={st.countBtn}><Text style={st.countText}>+</Text></TouchableOpacity>
            </View>
          </Card>

          {sentToday.length >= dailyTarget && (
            <Card style={{ borderLeftWidth: 3, borderLeftColor: COLORS.success, padding: 14 }}>
              <Text style={{ color: COLORS.success, fontSize: 14, fontWeight: '700' }}>Target hit!</Text>
              <Text style={{ color: COLORS.t2, fontSize: 12, marginTop: 4 }}>
                You've sent {sentToday.length} messages today. Keep going or take a break.
              </Text>
            </Card>
          )}

          {autoQueue.length === 0 && sentToday.length < dailyTarget && (
            <Card style={{ alignItems: 'center', padding: 24 }}>
              <Text style={{ color: COLORS.t2, fontSize: 13 }}>No prospects with phone numbers</Text>
              <Text style={{ color: COLORS.t3, fontSize: 11, marginTop: 4 }}>Add contacts to start your daily outreach</Text>
            </Card>
          )}

          {autoQueue.map(p => (
            <ProspectCard key={p.id} person={p} showActions />
          ))}

          {/* Already sent today */}
          {sentToday.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={{ color: COLORS.t3, fontSize: 10, fontWeight: '600', letterSpacing: 1, marginBottom: 8 }}>SENT TODAY</Text>
              {(prospects || []).filter(p => sentToday.includes(p.id)).map(p => (
                <ProspectCard key={p.id} person={p} showActions={false} />
              ))}
            </View>
          )}
        </View>
      )}

      {/* ALL CONTACTS */}
      {tab === 1 && (
        <View>
          {(prospects || []).length === 0 ? (
            <Card style={{ alignItems: 'center', padding: 24 }}>
              <Text style={{ color: COLORS.t2, fontSize: 13 }}>No prospects yet</Text>
            </Card>
          ) : (
            (prospects || []).map(p => <ProspectCard key={p.id} person={p} showActions />)
          )}
        </View>
      )}

      {/* ADD NEW */}
      {tab === 2 && (
        <Card style={{ padding: 16 }}>
          <Text style={{ color: COLORS.t1, fontSize: 15, fontWeight: '700', marginBottom: 14 }}>Log a new prospect</Text>

          <Text style={st.fieldLabel}>Name</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Their name" placeholderTextColor={COLORS.t3} style={st.input} />

          <Text style={st.fieldLabel}>Phone</Text>
          <TextInput value={phone} onChangeText={setPhone} placeholder="WhatsApp number" placeholderTextColor={COLORS.t3} keyboardType="phone-pad" style={st.input} />

          <Text style={st.fieldLabel}>How did you meet?</Text>
          <TextInput value={source} onChangeText={setSource} placeholder="e.g. Instagram, campus, referral" placeholderTextColor={COLORS.t3} style={st.input} />

          <Text style={st.fieldLabel}>Tell the story</Text>
          <TextInput
            value={experience}
            onChangeText={setExperience}
            placeholder="How did the conversation go? What caught their interest? Any objections?"
            placeholderTextColor={COLORS.t3}
            multiline
            numberOfLines={4}
            style={[st.input, { height: 100, textAlignVertical: 'top', paddingTop: 12 }]}
          />

          <Btn full onPress={addContact} style={{ marginTop: 16 }}>
            Add Prospect
          </Btn>
        </Card>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.t1, marginBottom: 2 },
  fieldLabel: { color: COLORS.t2, fontSize: 11, fontWeight: '600', marginTop: 12, marginBottom: 4 },
  input: {
    height: 46, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface, color: COLORS.t1, paddingHorizontal: 12, fontSize: 14,
  },
  countBtn: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  countText: { color: COLORS.t1, fontSize: 18, fontWeight: '600' },
});
