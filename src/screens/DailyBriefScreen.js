import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import { Card, Badge, Btn, ProgressBar } from '../components/UI';
import { today, daysBetween } from '../utils/storage';
import { CHALLENGE, PIPELINE_STAGES } from '../data/constants';
import { buildKnowledgeContext } from '../utils/knowledge';

export default function DailyBriefScreen({ team, prospects, data, books, onBack }) {
  const insets = useSafeAreaInsets();
  const [drafts, setDrafts] = useState({});
  const [loadingFor, setLoadingFor] = useState(null);

  const daysLeft = daysBetween(today(), CHALLENGE.end);
  const monthTarget = 750;
  const qpvGap = Math.max(0, monthTarget - (data?.qpv || 0));

  // Days left in the current month cycle
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysInMonth = lastDay - now.getDate();
  const dailyPVNeeded = daysInMonth > 0 ? (qpvGap / daysInMonth).toFixed(1) : qpvGap;

  // ─── Who needs attention ───
  const zeroPV = (team || []).filter(m => m.pv === 0);
  const partialPV = (team || []).filter(m => m.pv > 0 && m.pv < 250);
  const coldTeam = (team || []).filter(m => daysBetween(m.lastContact || m.joined, today()) >= 7);
  const overdueProspects = (prospects || [])
    .filter(p => daysBetween(p.lastContact, today()) >= 3 && p.stage < 7)
    .sort((a, b) => daysBetween(b.lastContact, today()) - daysBetween(a.lastContact, today()));

  const currentBook = (books || []).find(b => b.started && !b.completed);

  // ─── AI message drafting ───
  const draftMessage = async (person, type) => {
    const key = `${type}-${person.id}`;
    setLoadingFor(key);

    let situation = '';
    if (type === 'pv-zero') {
      situation = `${person.name} is a ${person.status} on my NeoLife team. They have done ZERO PV this month. ${daysInMonth} days left in the cycle. Last contacted ${daysBetween(person.lastContact || person.joined, today())} days ago.`;
    } else if (type === 'pv-partial') {
      situation = `${person.name} is a ${person.status} on my team. They've done ${person.pv} PV out of 250 needed. ${daysInMonth} days left in the cycle.`;
    } else if (type === 'cold-team') {
      situation = `${person.name} is a ${person.status} on my team. I haven't spoken to them in ${daysBetween(person.lastContact || person.joined, today())} days. Relationship is going cold.`;
    } else if (type === 'prospect') {
      const stage = PIPELINE_STAGES[person.stage];
      situation = `${person.name} is a prospect at the "${stage.name}" stage of my pipeline. Last contacted ${daysBetween(person.lastContact, today())} days ago. I need to move them to the next stage.`;
    }

    const knowledge = buildKnowledgeContext(
      type === 'prospect' ? 'prospecting follow up objection' : 'team coaching motivation retention'
    );

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 400,
          messages: [{
            role: 'user',
            content: `Write a short WhatsApp message I can send right now. I'm Macho, a NeoLife Senior Manager in Nigeria working toward Director.

SITUATION: ${situation}
${knowledge}

Rules:
- Sound like a real Nigerian person texting, not a corporate script
- Under 60 words
- No emoji spam, one at most
- Don't beg or guilt them
- Give them a reason to reply
- Just the message text, nothing else`
          }]
        })
      });
      const json = await res.json();
      const text = json.content?.filter(b => b.type === 'text').map(b => b.text).join('').trim() || 'Could not draft. Try again.';
      setDrafts(prev => ({ ...prev, [key]: text }));
    } catch {
      setDrafts(prev => ({ ...prev, [key]: 'Connection error. Check your network.' }));
    }
    setLoadingFor(null);
  };

  const sendWhatsApp = (phone, message) => {
    const clean = (phone || '').replace(/[^0-9]/g, '');
    const intl = clean.startsWith('0') ? '234' + clean.slice(1) : clean;
    const url = `whatsapp://send?phone=${intl}&text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      Share.share({ message }).catch(() => {});
    });
  };

  const ActionPerson = ({ person, type, label, labelColor, subtitle }) => {
    const key = `${type}-${person.id}`;
    const draft = drafts[key];
    const isLoading = loadingFor === key;

    return (
      <Card style={{ padding: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.t1, fontSize: 13, fontWeight: '600' }}>{person.name}</Text>
            <Text style={{ color: COLORS.t3, fontSize: 10 }}>{subtitle}</Text>
          </View>
          <Badge text={label} color={labelColor} />
        </View>

        {draft ? (
          <View>
            <View style={{ backgroundColor: COLORS.bg, borderRadius: 10, padding: 10, marginTop: 6, borderLeftWidth: 2, borderLeftColor: COLORS.primary }}>
              <Text style={{ color: COLORS.t2, fontSize: 12, lineHeight: 18 }}>{draft}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
              <Btn full color={COLORS.primary} onPress={() => sendWhatsApp(person.phone, draft)} style={{ height: 36 }}>
                Send on WhatsApp
              </Btn>
              <Btn outline onPress={() => draftMessage(person, type)} style={{ height: 36, paddingHorizontal: 12 }}>
                Redo
              </Btn>
            </View>
          </View>
        ) : (
          <Btn full outline onPress={() => draftMessage(person, type)} style={{ height: 34, marginTop: 4 }}>
            {isLoading ? 'Writing...' : 'Draft message'}
          </Btn>
        )}
      </Card>
    );
  };

  const totalActions = zeroPV.length + partialPV.length + coldTeam.length + overdueProspects.length;

  return (
    <ScrollView style={[s.container, { paddingTop: insets.top + 12 }]} contentContainerStyle={{ paddingBottom: 100 }}>
      {onBack && (
        <TouchableOpacity onPress={onBack}>
          <Text style={{ color: COLORS.t2, fontSize: 13, marginBottom: 12 }}>← Back</Text>
        </TouchableOpacity>
      )}

      <Text style={s.title}>Today's Attack Plan</Text>
      <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 16 }}>
        {totalActions === 0 ? 'Nothing urgent — go find new prospects' : `${totalActions} people need you today`}
      </Text>

      {/* PV pressure */}
      <Card glow={qpvGap > 0 ? COLORS.warn : COLORS.primary}>
        <Text style={{ color: COLORS.accent, fontSize: 10, fontWeight: '600', letterSpacing: 1, marginBottom: 6 }}>
          DIRECTOR CHALLENGE · {daysLeft} DAYS LEFT
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Text style={{ fontSize: 30, fontWeight: '800', color: COLORS.t1 }}>{qpvGap}</Text>
          <Text style={{ color: COLORS.t2, fontSize: 13 }}>QPV to close this month</Text>
        </View>
        <ProgressBar value={data?.qpv || 0} max={monthTarget} height={6} color={COLORS.primary} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={{ color: COLORS.t3, fontSize: 11 }}>{daysInMonth} days left in cycle</Text>
          <Text style={{ color: COLORS.danger, fontSize: 11, fontWeight: '600' }}>{dailyPVNeeded} PV/day needed</Text>
        </View>
      </Card>

      {/* Zero PV — highest urgency */}
      {zeroPV.length > 0 && (
        <View style={{ marginBottom: 8 }}>
          <View style={s.sectionHeader}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.danger }} />
            <Text style={s.sectionTitle}>Zero PV this month</Text>
            <Badge text={String(zeroPV.length)} color={COLORS.danger} />
          </View>
          {zeroPV.map(m => (
            <ActionPerson key={m.id} person={m} type="pv-zero" label="0 PV" labelColor={COLORS.danger}
              subtitle={`${m.status} · last contact ${daysBetween(m.lastContact || m.joined, today())}d ago`} />
          ))}
        </View>
      )}

      {/* Partial PV */}
      {partialPV.length > 0 && (
        <View style={{ marginBottom: 8 }}>
          <View style={s.sectionHeader}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.warn }} />
            <Text style={s.sectionTitle}>Short of 250 PV</Text>
            <Badge text={String(partialPV.length)} color={COLORS.warn} />
          </View>
          {partialPV.map(m => (
            <ActionPerson key={m.id} person={m} type="pv-partial" label={`${m.pv} PV`} labelColor={COLORS.warn}
              subtitle={`${m.status} · needs ${250 - m.pv} more`} />
          ))}
        </View>
      )}

      {/* Overdue prospects */}
      {overdueProspects.length > 0 && (
        <View style={{ marginBottom: 8 }}>
          <View style={s.sectionHeader}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent }} />
            <Text style={s.sectionTitle}>Prospects going cold</Text>
            <Badge text={String(overdueProspects.length)} color={COLORS.accent} />
          </View>
          {overdueProspects.slice(0, 6).map(p => (
            <ActionPerson key={p.id} person={p} type="prospect"
              label={`${daysBetween(p.lastContact, today())}d`} labelColor={COLORS.accent}
              subtitle={PIPELINE_STAGES[p.stage].name} />
          ))}
        </View>
      )}

      {/* Cold team members */}
      {coldTeam.length > 0 && (
        <View style={{ marginBottom: 8 }}>
          <View style={s.sectionHeader}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.blue }} />
            <Text style={s.sectionTitle}>Team going quiet</Text>
            <Badge text={String(coldTeam.length)} color={COLORS.blue} />
          </View>
          {coldTeam.map(m => (
            <ActionPerson key={m.id} person={m} type="cold-team"
              label={`${daysBetween(m.lastContact || m.joined, today())}d`} labelColor={COLORS.blue}
              subtitle={`${m.status} · ${m.pv} PV`} />
          ))}
        </View>
      )}

      {/* Reading */}
      {currentBook && (
        <Card style={{ borderLeftWidth: 3, borderLeftColor: COLORS.accent }}>
          <Text style={{ color: COLORS.t3, fontSize: 10, fontWeight: '600', letterSpacing: 1 }}>TODAY'S READING</Text>
          <Text style={{ color: COLORS.t1, fontSize: 14, fontWeight: '600', marginTop: 4 }}>{currentBook.title}</Text>
          <Text style={{ color: COLORS.t2, fontSize: 12, marginTop: 2 }}>
            Read to page {Math.min(currentBook.totalPages, currentBook.currentPage + 15)} — you're on {currentBook.currentPage}
          </Text>
          <ProgressBar value={currentBook.currentPage} max={currentBook.totalPages} color={COLORS.accent} height={5} />
        </Card>
      )}

      {totalActions === 0 && (
        <Card style={{ alignItems: 'center', padding: 28 }}>
          <Text style={{ fontSize: 30, marginBottom: 8 }}>✓</Text>
          <Text style={{ color: COLORS.t1, fontSize: 14, fontWeight: '600' }}>Everyone's covered</Text>
          <Text style={{ color: COLORS.t3, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
            No overdue follow-ups. Best use of today is adding new prospects to the pipeline.
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.t1, marginBottom: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, marginTop: 4 },
  sectionTitle: { color: COLORS.t2, fontSize: 13, fontWeight: '600', flex: 1 },
});