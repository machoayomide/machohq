import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { COLORS } from '../theme';
import { Card, Badge, ProgressBar, Btn, Input, TabBar } from '../components/UI';
import { getData, setData, today, daysBetween } from '../utils/storage';

const STATUSES = [
  { id: 'todo', label: 'To do', color: COLORS.t3 },
  { id: 'doing', label: 'Doing', color: COLORS.accent },
  { id: 'done', label: 'Done', color: COLORS.primary },
];

const AREAS = [
  { id: 'neolife', label: 'NeoLife', color: COLORS.primary },
  { id: 'freelance', label: 'Freelance', color: COLORS.blue },
  { id: 'personal', label: 'Personal', color: COLORS.accent },
  { id: 'school', label: 'School', color: COLORS.warn },
];

const areaOf = (id) => AREAS.find(a => a.id === id) || AREAS[2];

export default function TasksScreen({ team, prospects }) {
  const [tab, setTab] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [area, setArea] = useState('neolife');
  const [due, setDue] = useState('');
  const [linkTo, setLinkTo] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getData('tasks').then(t => { setTasks(t || []); setLoaded(true); });
  }, []);

  useEffect(() => {
    if (loaded) setData('tasks', tasks);
  }, [tasks, loaded]);

  const addTask = () => {
    if (!title.trim()) return;
    setTasks(prev => [...prev, {
      id: Date.now(),
      title: title.trim(),
      area,
      status: 'todo',
      due: due.trim() || today(),
      created: today(),
      linkedTo: linkTo,
      repeats: false,
    }]);
    setTitle(''); setDue(''); setLinkTo(null); setAdding(false);
  };

  const cycleStatus = (id) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const idx = STATUSES.findIndex(s => s.id === t.status);
      const next = STATUSES[(idx + 1) % STATUSES.length].id;
      return { ...t, status: next, completedOn: next === 'done' ? today() : null };
    }));
  };

  const removeTask = (id) => {
    Alert.alert('Delete task?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setTasks(prev => prev.filter(t => t.id !== id)) },
    ]);
  };

  const setDueDate = (id, offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, due: d.toISOString().slice(0, 10) } : t));
  };

  const todays = tasks.filter(t => t.due <= today() && t.status !== 'done');
  const doneToday = tasks.filter(t => t.status === 'done' && t.completedOn === today());
  const upcoming = tasks.filter(t => t.due > today() && t.status !== 'done')
    .sort((a, b) => a.due.localeCompare(b.due));
  const overdue = tasks.filter(t => t.due < today() && t.status !== 'done');

  // People you can link a task to
  const linkables = [
    ...(team || []).map(m => ({ id: 'team-' + m.id, name: m.name, kind: 'Team' })),
    ...(prospects || []).filter(p => p.stage < 7).map(p => ({ id: 'pros-' + p.id, name: p.name, kind: 'Prospect' })),
  ];

  const TaskRow = ({ t }) => {
    const st = STATUSES.find(s => s.id === t.status) || STATUSES[0];
    const ar = areaOf(t.area);
    const isOverdue = t.due < today() && t.status !== 'done';
    const linked = linkables.find(l => l.id === t.linkedTo);

    return (
      <Card style={{ padding: 12, borderLeftWidth: 3, borderLeftColor: ar.color }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
          <TouchableOpacity onPress={() => cycleStatus(t.id)}
            style={[s.statusDot, {
              borderColor: st.color,
              backgroundColor: t.status === 'done' ? COLORS.primary : t.status === 'doing' ? COLORS.accent + '44' : 'transparent',
            }]}>
            {t.status === 'done' && <Text style={{ color: COLORS.bg, fontSize: 12, fontWeight: '700' }}>✓</Text>}
            {t.status === 'doing' && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent }} />}
          </TouchableOpacity>

          <TouchableOpacity style={{ flex: 1 }} onPress={() => cycleStatus(t.id)} onLongPress={() => removeTask(t.id)}>
            <Text style={{
              color: t.status === 'done' ? COLORS.t3 : COLORS.t1,
              fontSize: 13,
              textDecorationLine: t.status === 'done' ? 'line-through' : 'none',
            }}>
              {t.title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
              <Text style={{ color: ar.color, fontSize: 9 }}>{ar.label}</Text>
              {linked && <Text style={{ color: COLORS.t3, fontSize: 9 }}>· {linked.name}</Text>}
              {isOverdue && <Text style={{ color: COLORS.danger, fontSize: 9 }}>· {daysBetween(t.due, today())}d late</Text>}
              {!isOverdue && t.due > today() && (
                <Text style={{ color: COLORS.t3, fontSize: 9 }}>· in {daysBetween(today(), t.due)}d</Text>
              )}
            </View>
          </TouchableOpacity>

          {t.status !== 'done' && (
            <TouchableOpacity onPress={() => setDueDate(t.id, 1)}>
              <Text style={{ color: COLORS.t3, fontSize: 10 }}>→ tomorrow</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={s.title}>Tasks</Text>
      <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 14 }}>
        {todays.length === 0 && overdue.length === 0
          ? 'Nothing due today'
          : `${todays.length} due today${overdue.length ? `, ${overdue.length} overdue` : ''}`}
      </Text>

      {/* Progress */}
      {(todays.length > 0 || doneToday.length > 0) && (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ color: COLORS.t2, fontSize: 12 }}>Today</Text>
            <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '600' }}>
              {doneToday.length} of {doneToday.length + todays.length} done
            </Text>
          </View>
          <ProgressBar value={doneToday.length} max={doneToday.length + todays.length || 1} height={6} />
        </Card>
      )}

      <Btn full onPress={() => setAdding(!adding)} style={{ marginBottom: 12 }}>
        {adding ? 'Cancel' : '+ Add task'}
      </Btn>

      {adding && (
        <Card style={{ borderColor: COLORS.primary + '44' }}>
          <Input value={title} onChangeText={setTitle} placeholder="What needs doing?" />

          <View style={{ height: 12 }} />
          <Text style={s.label}>Area</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {AREAS.map(a => (
              <TouchableOpacity key={a.id} onPress={() => setArea(a.id)}
                style={[s.areaBtn, area === a.id && { borderColor: a.color, backgroundColor: a.color + '22' }]}>
                <Text style={{ color: area === a.id ? a.color : COLORS.t3, fontSize: 10 }}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 12 }} />
          <Text style={s.label}>When</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[['Today', 0], ['Tomorrow', 1], ['In 3 days', 3], ['Next week', 7]].map(([label, off]) => {
              const d = new Date(); d.setDate(d.getDate() + off);
              const val = d.toISOString().slice(0, 10);
              const active = (due || today()) === val;
              return (
                <TouchableOpacity key={label} onPress={() => setDue(val)}
                  style={[s.areaBtn, active && { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '22' }]}>
                  <Text style={{ color: active ? COLORS.primary : COLORS.t3, fontSize: 10 }}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {linkables.length > 0 && (
            <>
              <View style={{ height: 12 }} />
              <Text style={s.label}>About someone? (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {linkables.slice(0, 20).map(l => (
                    <TouchableOpacity key={l.id} onPress={() => setLinkTo(linkTo === l.id ? null : l.id)}
                      style={[s.linkTag, linkTo === l.id && { borderColor: COLORS.accent, backgroundColor: COLORS.accent + '22' }]}>
                      <Text style={{ color: linkTo === l.id ? COLORS.accent : COLORS.t3, fontSize: 10 }}>{l.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          <Btn full onPress={addTask} style={{ marginTop: 14 }}>Add task</Btn>
        </Card>
      )}

      <TabBar tabs={['Today', 'Upcoming', 'Done']} active={tab} onChange={setTab} />

      {tab === 0 && (
        <View>
          {overdue.length > 0 && (
            <>
              <Text style={s.groupLabel}>Overdue</Text>
              {overdue.map(t => <TaskRow key={t.id} t={t} />)}
            </>
          )}
          {todays.filter(t => t.due === today()).length > 0 && (
            <>
              <Text style={s.groupLabel}>Due today</Text>
              {todays.filter(t => t.due === today()).map(t => <TaskRow key={t.id} t={t} />)}
            </>
          )}
          {doneToday.length > 0 && (
            <>
              <Text style={s.groupLabel}>Done today</Text>
              {doneToday.map(t => <TaskRow key={t.id} t={t} />)}
            </>
          )}
          {todays.length === 0 && doneToday.length === 0 && (
            <Card style={{ alignItems: 'center', padding: 26 }}>
              <Text style={{ fontSize: 26, marginBottom: 8 }}>✓</Text>
              <Text style={{ color: COLORS.t2, fontSize: 13 }}>Nothing due today</Text>
              <Text style={{ color: COLORS.t3, fontSize: 11, marginTop: 4 }}>
                Add what you actually need to do
              </Text>
            </Card>
          )}
        </View>
      )}

      {tab === 1 && (
        <View>
          {upcoming.length === 0 ? (
            <Card style={{ alignItems: 'center', padding: 26 }}>
              <Text style={{ color: COLORS.t3, fontSize: 12 }}>Nothing scheduled ahead</Text>
            </Card>
          ) : (
            (() => {
              const groups = {};
              upcoming.forEach(t => { (groups[t.due] = groups[t.due] || []).push(t); });
              return Object.entries(groups).map(([date, items]) => (
                <View key={date}>
                  <Text style={s.groupLabel}>
                    {new Date(date).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </Text>
                  {items.map(t => <TaskRow key={t.id} t={t} />)}
                </View>
              ));
            })()
          )}
        </View>
      )}

      {tab === 2 && (
        <View>
          {tasks.filter(t => t.status === 'done').length === 0 ? (
            <Card style={{ alignItems: 'center', padding: 26 }}>
              <Text style={{ color: COLORS.t3, fontSize: 12 }}>Nothing finished yet</Text>
            </Card>
          ) : (
            <>
              <Card>
                <Text style={{ color: COLORS.t3, fontSize: 10 }}>COMPLETED</Text>
                <Text style={{ fontSize: 28, fontWeight: '800', color: COLORS.primary }}>
                  {tasks.filter(t => t.status === 'done').length}
                </Text>
              </Card>
              {tasks.filter(t => t.status === 'done').slice(-30).reverse().map(t => <TaskRow key={t.id} t={t} />)}
            </>
          )}
        </View>
      )}

      <Card style={{ backgroundColor: COLORS.surface, marginTop: 8 }}>
        <Text style={{ color: COLORS.t3, fontSize: 10, lineHeight: 16 }}>
          Tap the circle to move a task through To do → Doing → Done. Long press a task to delete
          it. Tasks linked to a person show their name, so you know who it is about.
        </Text>
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.t1, marginBottom: 2 },
  label: { color: COLORS.t2, fontSize: 11, marginBottom: 6 },
  groupLabel: { color: COLORS.t3, fontSize: 10, fontWeight: '600', letterSpacing: 1, marginTop: 10, marginBottom: 6 },
  statusDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  areaBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  linkTag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
});