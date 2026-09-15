import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../theme';
import { Card, Badge, Btn, Input } from '../components/UI';
import { today } from '../utils/storage';

export default function AddDownlineScreen({ team, onSave, onCancel }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [direct, setDirect] = useState(null);
  const [sponsor, setSponsor] = useState(null);
  const [status, setStatus] = useState(null);

  const canNext = () => {
    if (step === 1) return name.trim().length > 0;
    if (step === 2) return direct !== null;
    if (step === 3 && !direct) return sponsor !== null;
    if (step === 3 && direct) return status !== null;
    if (step === 4) return status !== null;
    return true;
  };

  const next = () => {
    if (step === 1) setStep(2);
    else if (step === 2) {
      if (direct) setStep(4); // skip sponsor selection
      else setStep(3);
    }
    else if (step === 3) setStep(4);
    else if (step === 4) setStep(5);
  };

  const back = () => {
    if (step === 1) onCancel();
    else if (step === 4 && direct) setStep(2);
    else setStep(step - 1);
  };

  const save = () => {
    onSave({
      id: Date.now(),
      name: name.trim(),
      phone: phone.trim(),
      direct: direct,
      sponsor: direct ? 'You' : sponsor?.name || 'You',
      sponsorId: direct ? null : sponsor?.id,
      status: status,
      pv: 0,
      joined: today(),
      reqs: {},
      lastContact: today(),
    });
  };

  const stepLabels = ['Details', 'Type', direct === false ? 'Sponsor' : null, 'Status', 'Confirm'].filter(Boolean);
  const totalSteps = stepLabels.length;
  const currentIdx = step <= 2 ? step - 1 : direct ? step - 3 : step - 1;

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <TouchableOpacity onPress={back}>
        <Text style={s.back}>{step === 1 ? '✕ Cancel' : '← Back'}</Text>
      </TouchableOpacity>

      <Text style={s.title}>Add Downline</Text>
      <Text style={s.subtitle}>Step {step <= 4 ? Math.min(step, totalSteps) : totalSteps} of {totalSteps}</Text>

      {/* Progress dots */}
      <View style={s.dots}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View key={i} style={[s.dot, i <= currentIdx && s.dotActive]} />
        ))}
      </View>

      {/* STEP 1: Name & Phone */}
      {step === 1 && (
        <Card style={{ marginTop: 20 }}>
          <Text style={s.stepTitle}>Who is this person?</Text>
          <Text style={s.stepDesc}>Enter their name and phone number so you can reach them.</Text>
          <View style={{ marginTop: 16 }}>
            <Text style={s.label}>Full name</Text>
            <Input value={name} onChangeText={setName} placeholder="e.g. Emmanuel" />
            <View style={{ height: 12 }} />
            <Text style={s.label}>Phone number</Text>
            <Input value={phone} onChangeText={setPhone} placeholder="e.g. 08031234567" keyboardType="phone-pad" />
          </View>
        </Card>
      )}

      {/* STEP 2: Direct or Indirect */}
      {step === 2 && (
        <View style={{ marginTop: 20 }}>
          <Text style={s.stepTitle}>Direct or Indirect?</Text>
          <Text style={s.stepDesc}>Direct means you personally recruited them. Indirect means someone in your team recruited them.</Text>

          <TouchableOpacity onPress={() => setDirect(true)} style={[s.typeCard, direct === true && s.typeCardActive]}>
            <View style={s.typeIcon}>
              <Text style={{ fontSize: 24 }}>👤</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.typeTitle, direct === true && { color: COLORS.primary }]}>Direct Leg</Text>
              <Text style={s.typeDesc}>You are their sponsor. They report directly to you.</Text>
            </View>
            {direct === true && <View style={s.checkCircle}><Text style={{ color: COLORS.bg, fontSize: 14 }}>✓</Text></View>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setDirect(false)} style={[s.typeCard, direct === false && s.typeCardActiveAcc]}>
            <View style={s.typeIcon}>
              <Text style={{ fontSize: 24 }}>👥</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.typeTitle, direct === false && { color: COLORS.accent }]}>Indirect</Text>
              <Text style={s.typeDesc}>Someone else in your tree recruited them. You pick their sponsor next.</Text>
            </View>
            {direct === false && <View style={[s.checkCircle, { backgroundColor: COLORS.accent }]}><Text style={{ color: COLORS.bg, fontSize: 14 }}>✓</Text></View>}
          </TouchableOpacity>
        </View>
      )}

      {/* STEP 3: Select Sponsor (only for indirect) */}
      {step === 3 && !direct && (
        <View style={{ marginTop: 20 }}>
          <Text style={s.stepTitle}>Who is their sponsor?</Text>
          <Text style={s.stepDesc}>Select the person in your team who recruited {name}.</Text>

          {team.length === 0 && (
            <Card style={{ marginTop: 16, padding: 24, alignItems: 'center' }}>
              <Text style={{ color: COLORS.t3, fontSize: 13 }}>No team members yet. Add a direct leg first.</Text>
            </Card>
          )}

          <View style={{ marginTop: 12 }}>
            {team.map(m => (
              <TouchableOpacity key={m.id} onPress={() => setSponsor(m)} style={[s.sponsorCard, sponsor?.id === m.id && s.sponsorActive]}>
                <View style={[s.sponsorAvatar, { backgroundColor: sponsor?.id === m.id ? COLORS.primary + '33' : COLORS.border }]}>
                  <Text style={{ color: sponsor?.id === m.id ? COLORS.primary : COLORS.t3, fontWeight: '700', fontSize: 14 }}>{m.name[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.t1, fontSize: 13, fontWeight: '600' }}>{m.name}</Text>
                  <Text style={{ color: COLORS.t3, fontSize: 10 }}>{m.status} · {m.direct ? 'Direct leg' : 'Under ' + m.sponsor}</Text>
                </View>
                {sponsor?.id === m.id && <View style={s.checkCircle}><Text style={{ color: COLORS.bg, fontSize: 14 }}>✓</Text></View>}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* STEP 4: Set Status */}
      {step === 4 && (
        <View style={{ marginTop: 20 }}>
          <Text style={s.stepTitle}>What's their status?</Text>
          <Text style={s.stepDesc}>Where is {name} in their journey right now?</Text>

          {[
            { key: 'Newbie', icon: '🌱', desc: 'Just joined or being onboarded. Learning the basics.' },
            { key: 'Pro', icon: '⚡', desc: 'Knows the business. Has skills. Ready to build.' },
            { key: 'Distributor', icon: '💎', desc: 'Bought in with 100+ PV. Active NeoLife member.' },
          ].map(st => (
            <TouchableOpacity key={st.key} onPress={() => setStatus(st.key)} style={[s.typeCard, status === st.key && s.typeCardActive]}>
              <View style={s.typeIcon}><Text style={{ fontSize: 24 }}>{st.icon}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={[s.typeTitle, status === st.key && { color: COLORS.primary }]}>{st.key}</Text>
                <Text style={s.typeDesc}>{st.desc}</Text>
              </View>
              {status === st.key && <View style={s.checkCircle}><Text style={{ color: COLORS.bg, fontSize: 14 }}>✓</Text></View>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* STEP 5: Confirm */}
      {step === 5 && (
        <View style={{ marginTop: 20 }}>
          <Text style={s.stepTitle}>Confirm & Add</Text>
          <Text style={s.stepDesc}>Review the details before adding to your team tree.</Text>

          <Card glow={COLORS.primary} style={{ marginTop: 16 }}>
            <View style={s.confirmRow}>
              <Text style={s.confirmLabel}>Name</Text>
              <Text style={s.confirmValue}>{name}</Text>
            </View>
            <View style={s.confirmRow}>
              <Text style={s.confirmLabel}>Phone</Text>
              <Text style={s.confirmValue}>{phone || 'Not set'}</Text>
            </View>
            <View style={s.confirmRow}>
              <Text style={s.confirmLabel}>Type</Text>
              <Badge text={direct ? 'Direct Leg' : 'Indirect'} color={direct ? COLORS.primary : COLORS.accent} />
            </View>
            {!direct && (
              <View style={s.confirmRow}>
                <Text style={s.confirmLabel}>Sponsor</Text>
                <Text style={s.confirmValue}>{sponsor?.name || '—'}</Text>
              </View>
            )}
            <View style={[s.confirmRow, { borderBottomWidth: 0 }]}>
              <Text style={s.confirmLabel}>Status</Text>
              <Badge text={status} color={status === 'Distributor' ? COLORS.primary : status === 'Pro' ? COLORS.accent : COLORS.blue} />
            </View>
          </Card>

          <Card style={{ padding: 12, backgroundColor: COLORS.surface }}>
            <Text style={{ color: COLORS.t3, fontSize: 11 }}>
              {name} will be added {direct ? 'as your direct leg' : `under ${sponsor?.name}`} with {status} status.
              They'll appear in your team tree immediately.
            </Text>
          </Card>

          <Btn full onPress={save} style={{ marginTop: 12 }}>Add {name} to team</Btn>
        </View>
      )}

      {/* Next button (steps 1-4) */}
      {step < 5 && (
        <Btn full onPress={next} color={canNext() ? COLORS.primary : COLORS.border} style={{ marginTop: 20 }}>
          {step === 4 ? 'Review' : 'Continue'}
        </Btn>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingTop: 20 },
  back: { color: COLORS.t2, fontSize: 13, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.t1 },
  subtitle: { color: COLORS.t3, fontSize: 11, marginTop: 2, marginBottom: 12 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { height: 4, flex: 1, borderRadius: 2, backgroundColor: COLORS.border },
  dotActive: { backgroundColor: COLORS.primary },
  stepTitle: { fontSize: 18, fontWeight: '700', color: COLORS.t1, marginBottom: 6 },
  stepDesc: { color: COLORS.t3, fontSize: 12, lineHeight: 18 },
  label: { color: COLORS.t2, fontSize: 12, marginBottom: 6 },
  typeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 16, padding: 16, marginTop: 12,
  },
  typeCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '0a' },
  typeCardActiveAcc: { borderColor: COLORS.accent, backgroundColor: COLORS.accent + '0a' },
  typeIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  typeTitle: { fontSize: 15, fontWeight: '700', color: COLORS.t1, marginBottom: 2 },
  typeDesc: { color: COLORS.t3, fontSize: 11, lineHeight: 16 },
  checkCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  sponsorCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, padding: 12, marginBottom: 8,
  },
  sponsorActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '0a' },
  sponsorAvatar: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  confirmRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  confirmLabel: { color: COLORS.t3, fontSize: 12 },
  confirmValue: { color: COLORS.t1, fontSize: 13, fontWeight: '600' },
});