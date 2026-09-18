import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Linking, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import { Card, Badge, Btn, TabBar } from '../components/UI';
import { askClaude } from '../utils/ai';
import { today } from '../utils/storage';
import { scheduleReminder } from '../utils/notifications';

const MSG_TYPES = [
  { key: 'intro', label: 'Introduction', desc: 'First time reaching out' },
  { key: 'reconnect', label: 'Reconnect', desc: 'Haven\'t talked in a while' },
  { key: 'value', label: 'Share value', desc: 'Send something useful first' },
  { key: 'invite', label: 'Invite', desc: 'Invite to a meeting or presentation' },
  { key: 'followup', label: 'Follow up', desc: 'They showed interest before' },
  { key: 'custom', label: 'Custom', desc: 'Write your own prompt' },
];

const SPREAD_OPTIONS = [
  { key: 'manual', label: 'Manual', desc: 'You decide when to send each one', gap: 0 },
  { key: 'fast', label: '3 min gap', desc: 'Quick but safe spacing', gap: 180 },
  { key: 'normal', label: '10 min gap', desc: 'Natural spacing, safer', gap: 600 },
  { key: 'spread', label: 'Across the day', desc: 'Random times from now till 9pm', gap: -1 },
];

export default function OutreachScreen({ prospects, setProspects, data }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(0);

  // Rapid fire state
  const [queue, setQueue] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [draft, setDraft] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [msgType, setMsgType] = useState('intro');
  const [customPrompt, setCustomPrompt] = useState('');
  const [sentToday, setSentToday] = useState([]);
  const [dailyTarget, setDailyTarget] = useState(15);

  // Cooldown
  const [spreadMode, setSpreadMode] = useState('fast');
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef(null);
  const [running, setRunning] = useState(false);

  // Bulk add state
  const [bulkText, setBulkText] = useState('');
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addSource, setAddSource] = useState('');
  const [addStory, setAddStory] = useState('');

  const todayStr = today();

  // Build queue from available prospects
  const buildQueue = () => {
    const available = (prospects || []).filter(p =>
      p.phone && !sentToday.includes(p.id) &&
      p.stage !== 'Joined' && p.stage !== 7
    );
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const q = shuffled.slice(0, Math.max(0, dailyTarget - sentToday.length));
    setQueue(q);
    setCurrentIdx(0);
    setDraft('');
  };

  useEffect(() => { buildQueue(); }, [prospects, sentToday, dailyTarget]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) { clearInterval(cooldownRef.current); return; }
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(cooldownRef.current);
  }, [cooldown > 0]);

  const currentPerson = queue[currentIdx];

  const formatCooldown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
  };

  const formatPhone = (ph) => {
    const clean = (ph || '').replace(/[^0-9+]/g, '');
    if (clean.startsWith('+')) return clean.replace('+', '');
    if (clean.startsWith('0')) return '234' + clean.slice(1);
    return clean;
  };

  const openWhatsApp = (phone, message) => {
    const num = formatPhone(phone);
    const url = `whatsapp://send?phone=${num}&text=${encodeURIComponent(message || '')}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://wa.me/${num}?text=${encodeURIComponent(message || '')}`).catch(() => {
        Alert.alert('WhatsApp not found', 'Install WhatsApp to use outreach.');
      });
    });
  };

  const draftForPerson = async (person) => {
    if (!person) return;
    setDrafting(true);
    setDraft('');

    const typeInfo = MSG_TYPES.find(t => t.key === msgType) || MSG_TYPES[0];
    const prompt = msgType === 'custom' && customPrompt
      ? `Draft a WhatsApp message for this person. ${customPrompt}

Name: ${person.name}
Phone: ${person.phone}
Source: ${person.source || 'Unknown'}
Story: ${person.experience || 'No story logged'}
Stage: ${person.stage || 'Cold'}
Last contact: ${person.lastContact || 'Never'}

Rules: Sound natural like a real Nigerian texting. Under 60 words. No begging. Give them a reason to reply. No too many emojis.`
      : `You are a Nigerian NeoLife network marketer doing WhatsApp cold outreach.
Message type: ${typeInfo.label} — ${typeInfo.desc}

Prospect info:
Name: ${person.name}
How we met: ${person.source || 'Unknown'} — ${person.experience || 'No story'}
Stage: ${person.stage || 'Cold'}
Last contact: ${person.lastContact || 'Never'}
Times contacted: ${person.contactCount || 0}

${msgType === 'intro' ? `This is the first message. Don't pitch. Just reconnect or introduce yourself naturally. Find common ground.` : ''}
${msgType === 'reconnect' ? `You haven't talked in a while. Don't jump straight to business. Ask how they're doing first.` : ''}
${msgType === 'value' ? `Share something useful — a tip, a resource, a success story. Don't ask for anything.` : ''}
${msgType === 'invite' ? `Invite them to see something — a presentation, a meeting, a video. Keep it casual, not desperate.` : ''}
${msgType === 'followup' ? `They showed interest before. Reference that. Push gently toward the next step.` : ''}

Rules:
- Sound like a real person texting in Nigeria, not a bot
- Under 60 words
- No begging or desperation
- Give them a reason to reply
- Don't use more than 1-2 emojis
- Match how Nigerians actually text on WhatsApp
- Use their name`;

    try {
      const res = await askClaude(prompt, { maxTokens: 300 });
      setDraft(res.ok ? res.text.trim() : 'Could not draft. Check your AI key in Settings.');
    } catch {
      setDraft('Connection error. Try again.');
    }
    setDrafting(false);
  };

  const sendAndNext = () => {
    if (!currentPerson || !draft) return;
    openWhatsApp(currentPerson.phone, draft);
    markSent(currentPerson.id);

    const mode = SPREAD_OPTIONS.find(s => s.key === spreadMode) || SPREAD_OPTIONS[1];

    if (spreadMode === 'spread') {
      // Schedule remaining as notifications spread across the day
      scheduleSpreadNotifications();
      setRunning(false);
      setDraft('');
      return;
    }

    // Move to next with cooldown
    setTimeout(() => {
      if (currentIdx + 1 < queue.length) {
        setCurrentIdx(prev => prev + 1);
        setDraft('');
        if (mode.gap > 0) {
          setCooldown(mode.gap);
        }
      } else {
        setRunning(false);
        setDraft('');
      }
    }, 500);
  };

  const scheduleSpreadNotifications = async () => {
    const remaining = queue.slice(currentIdx + 1);
    if (remaining.length === 0) return;

    const now = new Date();
    const endHour = 21; // 9pm
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const endMin = endHour * 60;
    const availableMin = Math.max(0, endMin - nowMin);

    if (availableMin < 10) {
      Alert.alert('Too late', 'Not enough time today to spread messages. Try manual or 3-min gap.');
      return;
    }

    const gap = Math.floor(availableMin / remaining.length);
    for (let i = 0; i < remaining.length; i++) {
      const delaySeconds = (i + 1) * gap * 60;
      await scheduleReminder(
        `Message ${remaining[i].name}`,
        `Time to reach out. Open WhatsApp Outreach.`,
        delaySeconds,
        'outreach'
      );
    }
    Alert.alert('Scheduled', `${remaining.length} reminders spread across today. You'll get a notification for each one.`);
  };

  const markSent = (id) => {
    setSentToday(prev => [...prev, id]);
    setProspects(prev => (prev || []).map(p =>
      p.id === id ? { ...p, lastContact: todayStr, contactCount: (p.contactCount || 0) + 1 } : p
    ));
  };

  const skipAndNext = () => {
    if (currentIdx + 1 < queue.length) {
      setCurrentIdx(prev => prev + 1);
      setDraft('');
    } else {
      setRunning(false);
    }
  };

  // Start rapid fire mode
  const startRapidFire = () => {
    buildQueue();
    setRunning(true);
    setCurrentIdx(0);
    setDraft('');
  };

  // Bulk import numbers
  const bulkImport = () => {
    if (!bulkText.trim()) return;
    const lines = bulkText.split('\n').filter(l => l.trim());
    const newProspects = lines.map((line, i) => {
      // Try to parse "Name - Number" or just "Number"
      const parts = line.split(/[-–—,\t]/).map(s => s.trim());
      let name = '', phone = '';
      if (parts.length >= 2) {
        // Check which part is the number
        if (/\d{7,}/.test(parts[1].replace(/\s/g, ''))) {
          name = parts[0]; phone = parts[1];
        } else {
          name = parts[1]; phone = parts[0];
        }
      } else {
        phone = parts[0].replace(/\s/g, '');
        name = 'Prospect ' + (i + 1);
      }
      return {
        id: Date.now().toString() + i,
        name: name || 'Prospect ' + (i + 1),
        phone: phone.replace(/\s/g, ''),
        source: 'Bulk import',
        experience: '',
        stage: 'Cold List',
        added: todayStr,
        lastContact: null,
        contactCount: 0,
        cold: false,
      };
    });
    setProspects(prev => [...(prev || []), ...newProspects]);
    setBulkText('');
    Alert.alert('Imported', `${newProspects.length} contacts added.`);
  };

  const addSingle = () => {
    if (!addName.trim() && !addPhone.trim()) return;
    const p = {
      id: Date.now().toString(),
      name: addName.trim() || 'Unknown',
      phone: addPhone.trim(),
      source: addSource.trim() || 'Manual',
      experience: addStory.trim(),
      stage: 'Cold List',
      added: todayStr,
      lastContact: null,
      contactCount: 0,
      cold: false,
    };
    setProspects(prev => [...(prev || []), p]);
    setAddName(''); setAddPhone(''); setAddSource(''); setAddStory('');
  };

  const sentPct = Math.min(100, (sentToday.length / dailyTarget) * 100);

  return (
    <ScrollView style={[st.wrap, { paddingTop: insets.top + 8 }]} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={st.title}>WhatsApp Cold Outreach</Text>

      {/* Progress */}
      <View style={st.progressCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ color: COLORS.t2, fontSize: 12 }}>{sentToday.length} sent today</Text>
          <Text style={{ color: COLORS.t1, fontSize: 14, fontWeight: '700' }}>{sentToday.length}/{dailyTarget}</Text>
        </View>
        <View style={{ height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' }}>
          <View style={{ height: 6, borderRadius: 3, width: `${sentPct}%`,
            backgroundColor: sentPct >= 100 ? COLORS.success : COLORS.primary }} />
        </View>
        {sentPct >= 100 && (
          <Text style={{ color: COLORS.success, fontSize: 12, fontWeight: '700', marginTop: 6 }}>Target hit! Keep going or take a break.</Text>
        )}
      </View>

      <TabBar tabs={['Rapid Fire', 'Contacts', 'Add / Import']} active={tab} onChange={setTab} />

      {/* ═══ TAB 0: RAPID FIRE ═══ */}
      {tab === 0 && (
        <View>
          {/* Target + message type */}
          <Card style={{ padding: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ color: COLORS.t2, fontSize: 12 }}>Daily target</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity onPress={() => setDailyTarget(Math.max(1, dailyTarget - 5))} style={st.countBtn}>
                  <Text style={st.countTxt}>−</Text>
                </TouchableOpacity>
                <Text style={{ color: COLORS.t1, fontSize: 18, fontWeight: '700', width: 30, textAlign: 'center' }}>{dailyTarget}</Text>
                <TouchableOpacity onPress={() => setDailyTarget(dailyTarget + 5)} style={st.countBtn}>
                  <Text style={st.countTxt}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={{ color: COLORS.t3, fontSize: 10, fontWeight: '600', letterSpacing: 1, marginBottom: 6 }}>MESSAGE TYPE</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {MSG_TYPES.map(t => (
                <TouchableOpacity key={t.key} onPress={() => setMsgType(t.key)}
                  style={[st.typeTag, msgType === t.key && st.typeActive]}>
                  <Text style={{ color: msgType === t.key ? COLORS.primary : COLORS.t3, fontSize: 10, fontWeight: '600' }}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {msgType === 'custom' && (
              <TextInput value={customPrompt} onChangeText={setCustomPrompt}
                placeholder="Tell the AI what kind of message to write..."
                placeholderTextColor={COLORS.t3} multiline
                style={[st.input, { height: 60, textAlignVertical: 'top', paddingTop: 10, marginTop: 8 }]} />
            )}

            <Text style={{ color: COLORS.t3, fontSize: 10, fontWeight: '600', letterSpacing: 1, marginTop: 12, marginBottom: 6 }}>SPACING (avoid bans)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {SPREAD_OPTIONS.map(s => (
                <TouchableOpacity key={s.key} onPress={() => setSpreadMode(s.key)}
                  style={[st.typeTag, spreadMode === s.key && st.typeActive]}>
                  <Text style={{ color: spreadMode === s.key ? COLORS.primary : COLORS.t3, fontSize: 10, fontWeight: '600' }}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ color: COLORS.t3, fontSize: 10, marginTop: 4 }}>
              {SPREAD_OPTIONS.find(s => s.key === spreadMode)?.desc}
            </Text>
          </Card>

          {/* Start button */}
          {!running && (
            <Btn full onPress={startRapidFire} style={{ marginBottom: 12, height: 52 }}>
              Start Rapid Fire — {queue.length} prospects ready
            </Btn>
          )}

          {/* ═══ RAPID FIRE MODE ═══ */}
          {running && currentPerson && (
            <Card style={{ borderWidth: 1, borderColor: COLORS.primary + '44', padding: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Badge text={`${currentIdx + 1} of ${queue.length}`} color={COLORS.primary} />
                <Text style={{ color: COLORS.t3, fontSize: 10 }}>
                  {sentToday.length} sent · {queue.length - currentIdx} left
                </Text>
              </View>

              {/* Person info */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <View style={st.avatar}>
                  <Text style={{ color: COLORS.primary, fontSize: 18, fontWeight: '700' }}>
                    {(currentPerson.name || '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.t1, fontSize: 16, fontWeight: '700' }}>{currentPerson.name}</Text>
                  <Text style={{ color: COLORS.t3, fontSize: 11 }}>
                    {currentPerson.phone}{currentPerson.source ? ` · ${currentPerson.source}` : ''}
                  </Text>
                  {currentPerson.experience ? (
                    <Text style={{ color: COLORS.t3, fontSize: 10, fontStyle: 'italic', marginTop: 2 }}>
                      "{currentPerson.experience}"
                    </Text>
                  ) : null}
                </View>
              </View>

              {/* Draft or generate */}
              {cooldown > 0 && (
                <View style={{ alignItems: 'center', padding: 16, backgroundColor: COLORS.bg, borderRadius: 12 }}>
                  <Text style={{ color: COLORS.accent, fontSize: 28, fontWeight: '800' }}>{formatCooldown(cooldown)}</Text>
                  <Text style={{ color: COLORS.t3, fontSize: 11, marginTop: 4 }}>Waiting between messages to avoid ban</Text>
                  <Text style={{ color: COLORS.t3, fontSize: 10, marginTop: 2 }}>Next: {currentPerson?.name}</Text>
                </View>
              )}

              {cooldown <= 0 && !draft && !drafting && (
                <Btn full onPress={() => draftForPerson(currentPerson)} style={{ height: 44 }}>
                  Draft message
                </Btn>
              )}

              {drafting && (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: COLORS.primary, fontSize: 13 }}>Drafting...</Text>
                </View>
              )}

              {draft && !drafting && (
                <View>
                  {/* Editable draft */}
                  <TextInput
                    value={draft}
                    onChangeText={setDraft}
                    multiline
                    style={st.draftBox}
                  />

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <TouchableOpacity onPress={sendAndNext} style={st.sendBtn} activeOpacity={0.8}>
                      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Send on WhatsApp</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <TouchableOpacity onPress={() => draftForPerson(currentPerson)} style={st.secBtn}>
                      <Text style={st.secTxt}>Redraft</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={skipAndNext} style={st.secBtn}>
                      <Text style={st.secTxt}>Skip</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { markSent(currentPerson.id); skipAndNext(); }} style={st.secBtn}>
                      <Text style={st.secTxt}>Mark sent</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </Card>
          )}

          {running && !currentPerson && (
            <Card style={{ alignItems: 'center', padding: 24 }}>
              <Text style={{ fontSize: 28 }}>🎉</Text>
              <Text style={{ color: COLORS.success, fontSize: 16, fontWeight: '700', marginTop: 8 }}>Queue complete</Text>
              <Text style={{ color: COLORS.t3, fontSize: 12, marginTop: 4 }}>{sentToday.length} messages sent today</Text>
              <Btn full onPress={() => setRunning(false)} style={{ marginTop: 14 }}>Done</Btn>
            </Card>
          )}

          {/* Already sent */}
          {sentToday.length > 0 && (
            <View style={{ marginTop: 14 }}>
              <Text style={{ color: COLORS.t3, fontSize: 10, fontWeight: '600', letterSpacing: 1, marginBottom: 6 }}>SENT TODAY</Text>
              {(prospects || []).filter(p => sentToday.includes(p.id)).map(p => (
                <Card key={p.id} style={{ padding: 10, opacity: 0.6 }}>
                  <Text style={{ color: COLORS.t1, fontSize: 13 }}>{p.name}</Text>
                  <Text style={{ color: COLORS.t3, fontSize: 10 }}>{p.phone}</Text>
                </Card>
              ))}
            </View>
          )}
        </View>
      )}

      {/* ═══ TAB 1: ALL CONTACTS ═══ */}
      {tab === 1 && (
        <View>
          {(prospects || []).length === 0 ? (
            <Card style={{ alignItems: 'center', padding: 24 }}>
              <Text style={{ color: COLORS.t2, fontSize: 13 }}>No contacts yet</Text>
              <Text style={{ color: COLORS.t3, fontSize: 11, marginTop: 4 }}>Go to "Add / Import" to load numbers</Text>
            </Card>
          ) : (
            (prospects || []).map(p => (
              <Card key={p.id} style={{ padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[st.miniAvatar, sentToday.includes(p.id) && { borderColor: COLORS.success }]}>
                  <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '700' }}>{(p.name || '?')[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.t1, fontSize: 13, fontWeight: '600' }}>{p.name}</Text>
                  <Text style={{ color: COLORS.t3, fontSize: 10 }}>
                    {p.phone}{p.contactCount ? ` · ${p.contactCount}x contacted` : ''}
                    {p.lastContact ? ` · last: ${p.lastContact}` : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => openWhatsApp(p.phone, '')} style={st.waBtn}>
                  <Text style={{ fontSize: 16 }}>📲</Text>
                </TouchableOpacity>
              </Card>
            ))
          )}
        </View>
      )}

      {/* ═══ TAB 2: ADD / IMPORT ═══ */}
      {tab === 2 && (
        <View>
          {/* Single add */}
          <Card style={{ padding: 14 }}>
            <Text style={{ color: COLORS.t1, fontSize: 14, fontWeight: '700', marginBottom: 10 }}>Add one contact</Text>
            <TextInput value={addName} onChangeText={setAddName} placeholder="Name" placeholderTextColor={COLORS.t3} style={st.input} />
            <TextInput value={addPhone} onChangeText={setAddPhone} placeholder="Phone number" placeholderTextColor={COLORS.t3} keyboardType="phone-pad" style={[st.input, { marginTop: 8 }]} />
            <TextInput value={addSource} onChangeText={setAddSource} placeholder="Where you met (Instagram, campus, market)" placeholderTextColor={COLORS.t3} style={[st.input, { marginTop: 8 }]} />
            <TextInput value={addStory} onChangeText={setAddStory} placeholder="Tell the story — how did the conversation go?" placeholderTextColor={COLORS.t3} multiline style={[st.input, { marginTop: 8, height: 70, textAlignVertical: 'top', paddingTop: 10 }]} />
            <Btn full onPress={addSingle} style={{ marginTop: 10 }}>Add</Btn>
          </Card>

          {/* Bulk import */}
          <Card style={{ padding: 14 }}>
            <Text style={{ color: COLORS.t1, fontSize: 14, fontWeight: '700', marginBottom: 4 }}>Bulk import</Text>
            <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 10 }}>
              Paste numbers, one per line. Format: "Name - Number" or just the number.
            </Text>
            <TextInput
              value={bulkText}
              onChangeText={setBulkText}
              placeholder={"Ahmed - 08031234567\nFatima - 08098765432\n07012345678"}
              placeholderTextColor={COLORS.t3}
              multiline
              numberOfLines={8}
              style={[st.input, { height: 140, textAlignVertical: 'top', paddingTop: 10 }]}
            />
            <Btn full onPress={bulkImport} style={{ marginTop: 10 }}>
              Import all
            </Btn>
          </Card>
        </View>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.t1, marginBottom: 6 },
  progressCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: COLORS.border },
  input: {
    height: 44, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface, color: COLORS.t1, paddingHorizontal: 12, fontSize: 13,
  },
  countBtn: {
    width: 30, height: 30, borderRadius: 8, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  countTxt: { color: COLORS.t1, fontSize: 16, fontWeight: '600' },
  typeTag: {
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  typeActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryDim },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.primaryDim, borderWidth: 2, borderColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  miniAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.primaryDim, borderWidth: 1.5, borderColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  draftBox: {
    backgroundColor: COLORS.bg, borderRadius: 12, padding: 14,
    borderLeftWidth: 3, borderLeftColor: COLORS.primary,
    color: COLORS.t1, fontSize: 14, lineHeight: 20, minHeight: 80,
  },
  sendBtn: {
    flex: 1, height: 46, borderRadius: 12,
    backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center',
  },
  secBtn: {
    flex: 1, height: 36, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  secTxt: { color: COLORS.t2, fontSize: 11, fontWeight: '600' },
  waBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#25D366' + '22', alignItems: 'center', justifyContent: 'center',
  },
});
