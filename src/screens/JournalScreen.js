import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import { Card, Btn, Badge } from '../components/UI';
import { today } from '../utils/storage';

export function JournalModal({ visible, onClose, onSave }) {
  const [right, setRight] = useState('');
  const [wrong, setWrong] = useState('');
  const [diff, setDiff] = useState('');

  const save = () => {
    onSave({ id: Date.now(), date: today(), right, wrong, diff });
    setRight(''); setWrong(''); setDiff('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.overlay}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>No Excuses Journal</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: COLORS.t3, fontSize: 20 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 20 }}>Quick reflection — be honest with yourself</Text>

          <Text style={s.label}>What went right today?</Text>
          <TextInput value={right} onChangeText={setRight} placeholder="Wins, progress, good decisions..."
            placeholderTextColor={COLORS.t3} multiline style={s.textarea} />

          <Text style={s.label}>What went wrong?</Text>
          <TextInput value={wrong} onChangeText={setWrong} placeholder="Mistakes, missed targets, laziness..."
            placeholderTextColor={COLORS.t3} multiline style={s.textarea} />

          <Text style={s.label}>What will you do differently tomorrow?</Text>
          <TextInput value={diff} onChangeText={setDiff} placeholder="Specific changes, commitments..."
            placeholderTextColor={COLORS.t3} multiline style={s.textarea} />

          <Btn full color={COLORS.accent} onPress={save} style={{ marginTop: 8 }}>Save entry</Btn>
        </View>
      </View>
    </Modal>
  );
}

export default function JournalScreen({ entries, setEntries }) {
  const insets = useSafeAreaInsets();
  const [showModal, setShowModal] = useState(false);

  const addEntry = (entry) => {
    setEntries(prev => [...(prev || []), entry]);
  };

  const sorted = [...(entries || [])].reverse();

  return (
    <ScrollView style={[s.container, { paddingTop: insets.top + 12 }]} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={s.title}>No Excuses Journal</Text>
      <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 16 }}>Honest daily reflection — own your results</Text>

      <Btn full color={COLORS.accent} onPress={() => setShowModal(true)} style={{ marginBottom: 16 }}>
        + Write today's entry
      </Btn>

      <JournalModal visible={showModal} onClose={() => setShowModal(false)} onSave={addEntry} />

      {sorted.length === 0 && (
        <Card style={{ alignItems: 'center', padding: 32 }}>
          <Text style={{ fontSize: 28, marginBottom: 8 }}>📓</Text>
          <Text style={{ color: COLORS.t2, fontSize: 13 }}>No entries yet</Text>
          <Text style={{ color: COLORS.t3, fontSize: 11, marginTop: 4 }}>Start your first journal entry tonight</Text>
        </Card>
      )}

      {sorted.map(e => (
        <Card key={e.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ color: COLORS.t1, fontSize: 14, fontWeight: '600' }}>{e.date}</Text>
            <Badge text="Completed" color={COLORS.primary} />
          </View>

          {e.right ? (
            <View style={s.entrySection}>
              <Text style={s.entryLabel}>What went right</Text>
              <Text style={s.entryText}>{e.right}</Text>
            </View>
          ) : null}

          {e.wrong ? (
            <View style={s.entrySection}>
              <Text style={[s.entryLabel, { color: COLORS.danger }]}>What went wrong</Text>
              <Text style={s.entryText}>{e.wrong}</Text>
            </View>
          ) : null}

          {e.diff ? (
            <View style={s.entrySection}>
              <Text style={[s.entryLabel, { color: COLORS.accent }]}>Tomorrow's plan</Text>
              <Text style={s.entryText}>{e.diff}</Text>
            </View>
          ) : null}
        </Card>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.t1, marginBottom: 4 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { color: COLORS.accent, fontSize: 18, fontWeight: '700' },
  label: { color: COLORS.t2, fontSize: 12, marginBottom: 6, marginTop: 12 },
  textarea: {
    width: '100%', minHeight: 70, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface, color: COLORS.t1, padding: 12, fontSize: 13,
    textAlignVertical: 'top',
  },
  entrySection: { marginBottom: 10, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: COLORS.border },
  entryLabel: { color: COLORS.primary, fontSize: 10, fontWeight: '600', marginBottom: 2 },
  entryText: { color: COLORS.t2, fontSize: 12, lineHeight: 18 },
});