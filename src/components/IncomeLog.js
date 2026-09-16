import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '../theme';
import { Card, Badge, Btn, Input } from './UI';
import {
  monthKey, prevMonthKey, incomeForMonth, earningStreak,
  SKILL_SUGGESTIONS, SKILL_LEVELS, skillLevel,
} from '../data/constants';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function labelFor(mk) {
  const [y, m] = mk.split('-');
  return `${MONTH_NAMES[parseInt(m) - 1]} ${y.slice(2)}`;
}

function lastMonths(n) {
  const out = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    out.push(d.toISOString().slice(0, 7));
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

/**
 * Monthly income log for one team member.
 * Earning is per month, like PV — August does not count for September.
 */
export function IncomeLog({ member, onUpdate }) {
  const thisMk = monthKey();
  const [editing, setEditing] = useState(null);   // month key being edited
  const [amount, setAmount] = useState('');
  const [skill, setSkill] = useState('');
  const [note, setNote] = useState('');

  const months = lastMonths(6);
  const streak = earningStreak(member);

  const openEdit = (mk) => {
    const rec = incomeForMonth(member, mk);
    setEditing(mk);
    setAmount(rec?.amount ? String(rec.amount) : '');
    setSkill(rec?.skill || '');
    setNote(rec?.note || '');
  };

  const save = (earned) => {
    const income = { ...(member.income || {}) };
    if (earned === false) {
      income[editing] = { earned: false, updated: new Date().toISOString() };
    } else {
      income[editing] = {
        earned: true,
        amount: amount ? parseFloat(amount) : null,
        skill: skill.trim() || null,
        note: note.trim() || null,
        updated: new Date().toISOString(),
      };
    }
    onUpdate({ income });
    setEditing(null);
    setAmount(''); setSkill(''); setNote('');
  };

  const clear = () => {
    const income = { ...(member.income || {}) };
    delete income[editing];
    onUpdate({ income });
    setEditing(null);
  };

  return (
    <Card>
      <View style={s.headRow}>
        <Text style={s.sectionTitle}>Income by month</Text>
        {streak > 1 && <Badge text={`${streak} months running`} color={COLORS.primary} />}
      </View>
      <Text style={{ color: COLORS.t3, fontSize: 10, marginBottom: 10 }}>
        Earning is monthly, same as PV. Tap any month to log it.
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
        <View style={{ flexDirection: 'row', gap: 7 }}>
          {months.map(mk => {
            const rec = incomeForMonth(member, mk);
            const isNow = mk === thisMk;
            const state = !rec ? 'unknown' : rec.earned ? 'earned' : 'none';
            const color = state === 'earned' ? COLORS.primary : state === 'none' ? COLORS.danger : COLORS.border;
            return (
              <TouchableOpacity key={mk} onPress={() => openEdit(mk)}
                style={[s.monthChip, {
                  borderColor: isNow ? COLORS.t2 : color,
                  backgroundColor: state === 'unknown' ? COLORS.bg : color + '22',
                  borderWidth: isNow ? 2 : 1,
                }]}>
                <Text style={{ color: state === 'unknown' ? COLORS.t3 : color, fontSize: 11, fontWeight: '700' }}>
                  {labelFor(mk)}
                </Text>
                <Text style={{ color: COLORS.t3, fontSize: 9, marginTop: 2 }}>
                  {state === 'unknown' ? 'not asked'
                    : state === 'none' ? 'nothing'
                    : rec.amount ? `₦${(rec.amount / 1000).toFixed(0)}k` : 'earned'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {editing && (
        <View style={s.editBox}>
          <Text style={{ color: COLORS.t1, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>
            {labelFor(editing)} — did {member.name} make money online?
          </Text>

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <Btn full color={COLORS.primary} onPress={() => save(true)}>Yes</Btn>
            <Btn full color={COLORS.danger} onPress={() => save(false)}>No</Btn>
          </View>

          <Text style={{ color: COLORS.t3, fontSize: 10, marginBottom: 8 }}>
            If yes, add detail below first — all optional, tap Yes when done.
          </Text>

          <Text style={s.label}>How much (₦)</Text>
          <Input value={amount} onChangeText={setAmount} placeholder="Leave blank if you do not know" keyboardType="numeric" />

          <View style={{ height: 10 }} />
          <Text style={s.label}>Which skill earned it</Text>
          <Input value={skill} onChangeText={setSkill} placeholder="Type any skill" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
            {(member.skills || []).map(sk => (
              <TouchableOpacity key={sk} onPress={() => setSkill(sk)}
                style={[s.miniTag, skill === sk && { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '22' }]}>
                <Text style={{ color: skill === sk ? COLORS.primary : COLORS.t3, fontSize: 10 }}>{sk}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 10 }} />
          <Text style={s.label}>Note</Text>
          <Input value={note} onChangeText={setNote} placeholder="e.g. two Fiverr orders" />

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <Btn full outline onPress={() => setEditing(null)}>Cancel</Btn>
            {incomeForMonth(member, editing) && (
              <Btn outline onPress={clear} style={{ paddingHorizontal: 16 }}>Clear</Btn>
            )}
          </View>
        </View>
      )}

      {!editing && (() => {
        const rec = incomeForMonth(member, thisMk);
        const prev = incomeForMonth(member, prevMonthKey());
        if (!rec && prev?.earned) {
          return (
            <View style={[s.alertBox, { borderLeftColor: COLORS.warn }]}>
              <Text style={{ color: COLORS.warn, fontSize: 11, lineHeight: 17 }}>
                Earned last month but nothing logged for this one. Ask {member.name} how this month
                is going.
              </Text>
            </View>
          );
        }
        if (rec && !rec.earned && prev?.earned) {
          return (
            <View style={[s.alertBox, { borderLeftColor: COLORS.danger }]}>
              <Text style={{ color: COLORS.danger, fontSize: 11, lineHeight: 17 }}>
                Slipped. Earned last month, nothing this month. This is the moment to step in,
                before they lose momentum entirely.
              </Text>
            </View>
          );
        }
        return null;
      })()}
    </Card>
  );
}

/**
 * Skill capability editor — free text with suggestions.
 */
export function SkillEditor({ member, onUpdate }) {
  const [input, setInput] = useState('');
  const skills = member.skills || [];
  const level = skillLevel(member.skillLevel || 'none');

  const add = (name) => {
    const clean = (name || '').trim();
    if (!clean || skills.includes(clean)) { setInput(''); return; }
    onUpdate({ skills: [...skills, clean] });
    setInput('');
  };

  const remove = (name) => onUpdate({ skills: skills.filter(s => s !== name) });

  const unused = SKILL_SUGGESTIONS.filter(s => !skills.includes(s)).slice(0, 12);

  return (
    <Card>
      <Text style={s.sectionTitle}>Skills</Text>
      <Text style={{ color: COLORS.t3, fontSize: 10, marginBottom: 10 }}>
        What can they actually do? Type anything — this list is not fixed.
      </Text>

      {skills.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {skills.map(sk => (
            <TouchableOpacity key={sk} onPress={() => remove(sk)} style={s.activeTag}>
              <Text style={{ color: COLORS.primary, fontSize: 11 }}>{sk}</Text>
              <Text style={{ color: COLORS.t3, fontSize: 11, marginLeft: 6 }}>×</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Input value={input} onChangeText={setInput} placeholder="e.g. 2D art, AI video" />
        </View>
        <Btn onPress={() => add(input)}>Add</Btn>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
        {unused.map(sk => (
          <TouchableOpacity key={sk} onPress={() => add(sk)} style={s.miniTag}>
            <Text style={{ color: COLORS.t3, fontSize: 10 }}>+ {sk}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: 14 }} />
      <Text style={s.label}>Can they deliver paid work?</Text>
      <View style={{ flexDirection: 'row', gap: 5, marginTop: 6 }}>
        {SKILL_LEVELS.map(l => {
          const active = (member.skillLevel || 'none') === l.id;
          return (
            <TouchableOpacity key={l.id} onPress={() => onUpdate({ skillLevel: l.id })}
              style={[s.levelBtn, active && { borderColor: l.color, backgroundColor: l.color + '22' }]}>
              <Text style={{ color: active ? l.color : COLORS.t3, fontSize: 10, fontWeight: active ? '700' : '400' }}>
                {l.short}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={{ color: level.color, fontSize: 10, marginTop: 8 }}>{level.desc}</Text>
    </Card>
  );
}

const s = StyleSheet.create({
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  sectionTitle: { color: COLORS.t2, fontSize: 13, fontWeight: '600' },
  label: { color: COLORS.t2, fontSize: 11, marginBottom: 5 },
  monthChip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, alignItems: 'center', minWidth: 74 },
  editBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  alertBox: { marginTop: 10, padding: 10, backgroundColor: COLORS.bg, borderRadius: 8, borderLeftWidth: 2 },
  activeTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary, backgroundColor: COLORS.primary + '18' },
  miniTag: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7, borderWidth: 1, borderColor: COLORS.border },
  levelBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
});