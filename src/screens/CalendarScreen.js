import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../theme';
import { Card, Badge } from '../components/UI';
import { getData, today, daysBetween } from '../utils/storage';
import { CHALLENGE, PIPELINE_STAGES, monthKey } from '../data/constants';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function CalendarScreen({ team, prospects, books }) {
  const [cursor, setCursor] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [selected, setSelected] = useState(today());

  useEffect(() => { getData('tasks').then(t => setTasks(t || [])); }, []);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cycleEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  const dateStr = (d) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  // Build events for the visible month
  const eventsFor = (ds) => {
    const out = [];

    tasks.filter(t => t.due === ds && t.status !== 'done').forEach(t => {
      out.push({ kind: 'task', color: COLORS.blue, label: t.title, sub: t.area });
    });

    (prospects || []).filter(p => p.stage < 7).forEach(p => {
      const dueDate = new Date(p.lastContact);
      dueDate.setDate(dueDate.getDate() + 3);
      if (dueDate.toISOString().slice(0, 10) === ds) {
        out.push({ kind: 'followup', color: COLORS.accent, label: `Follow up ${p.name}`, sub: PIPELINE_STAGES[p.stage].name });
      }
    });

    (team || []).forEach(m => {
      if (!m.lastOrder) return;
      const re = new Date(m.lastOrder);
      re.setDate(re.getDate() + 25);
      if (re.toISOString().slice(0, 10) === ds) {
        out.push({ kind: 'reorder', color: COLORS.warn, label: `${m.name} reorder due`, sub: 'supply finishing' });
      }
    });

    if (ds === cycleEnd) {
      out.push({ kind: 'cycle', color: COLORS.danger, label: 'PV cycle closes', sub: 'orders must be in' });
    }

    CHALLENGE.months.forEach((mo, i) => {
      const mDate = new Date(2026, 8 + i, 1);
      const endOfM = new Date(mDate.getFullYear(), mDate.getMonth() + 1, 0);
      if (endOfM.toISOString().slice(0, 10) === ds) {
        out.push({ kind: 'milestone', color: COLORS.primary, label: `${mo.name} target: ${mo.target.toLocaleString()} QPV`, sub: mo.focus });
      }
    });

    return out;
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedEvents = eventsFor(selected);
  const daysToDirector = daysBetween(today(), CHALLENGE.end);

  const shift = (delta) => {
    const next = new Date(cursor);
    next.setMonth(next.getMonth() + delta);
    setCursor(next);
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={s.title}>Calendar</Text>
      <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 14 }}>
        {daysToDirector} days to Director
      </Text>

      <Card>
        <View style={s.monthHeader}>
          <TouchableOpacity onPress={() => shift(-1)} style={s.navBtn}>
            <Text style={{ color: COLORS.t2, fontSize: 18 }}>‹</Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: COLORS.t1, fontSize: 16, fontWeight: '700' }}>{MONTHS[month]}</Text>
            <Text style={{ color: COLORS.t3, fontSize: 11 }}>{year}</Text>
          </View>
          <TouchableOpacity onPress={() => shift(1)} style={s.navBtn}>
            <Text style={{ color: COLORS.t2, fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={s.weekRow}>
          {DAYS.map((d, i) => (
            <Text key={i} style={s.dayLabel}>{d}</Text>
          ))}
        </View>

        <View style={s.grid}>
          {cells.map((d, i) => {
            if (d === null) return <View key={'e' + i} style={s.cell} />;
            const ds = dateStr(d);
            const evts = eventsFor(ds);
            const isToday = ds === today();
            const isSelected = ds === selected;
            return (
              <TouchableOpacity key={ds} onPress={() => setSelected(ds)}
                style={[s.cell, isSelected && s.cellSelected, isToday && s.cellToday]}>
                <Text style={{
                  color: isSelected ? COLORS.bg : isToday ? COLORS.primary : COLORS.t1,
                  fontSize: 13,
                  fontWeight: isToday || isSelected ? '700' : '400',
                }}>
                  {d}
                </Text>
                <View style={s.dots}>
                  {evts.slice(0, 3).map((e, j) => (
                    <View key={j} style={[s.dot, { backgroundColor: e.color }]} />
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      {/* Selected day */}
      <Card>
        <Text style={{ color: COLORS.t1, fontSize: 15, fontWeight: '700' }}>
          {new Date(selected).toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>
        <Text style={{ color: COLORS.t3, fontSize: 11, marginTop: 2, marginBottom: 10 }}>
          {selectedEvents.length === 0 ? 'Nothing scheduled' : `${selectedEvents.length} item${selectedEvents.length > 1 ? 's' : ''}`}
        </Text>

        {selectedEvents.map((e, i) => (
          <View key={i} style={[s.eventRow, { borderLeftColor: e.color }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.t1, fontSize: 13 }}>{e.label}</Text>
              <Text style={{ color: COLORS.t3, fontSize: 10, marginTop: 1 }}>{e.sub}</Text>
            </View>
          </View>
        ))}

        {selectedEvents.length === 0 && (
          <Text style={{ color: COLORS.t3, fontSize: 12, paddingVertical: 12, textAlign: 'center' }}>
            Free day. Add a task or use it to prospect.
          </Text>
        )}
      </Card>

      {/* Legend */}
      <Card style={{ backgroundColor: COLORS.surface }}>
        <Text style={{ color: COLORS.t3, fontSize: 10, fontWeight: '600', letterSpacing: 1, marginBottom: 8 }}>
          WHAT THE DOTS MEAN
        </Text>
        {[
          [COLORS.blue, 'Task due'],
          [COLORS.accent, 'Prospect follow-up due'],
          [COLORS.warn, 'Downline reorder due'],
          [COLORS.danger, 'PV cycle closes'],
          [COLORS.primary, 'Director milestone'],
        ].map(([c, label], i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 4 }}>
            <View style={[s.dot, { backgroundColor: c, width: 7, height: 7, borderRadius: 4 }]} />
            <Text style={{ color: COLORS.t3, fontSize: 11 }}>{label}</Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.t1, marginBottom: 2 },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  navBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  dayLabel: { flex: 1, textAlign: 'center', color: COLORS.t3, fontSize: 10, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  cellToday: { borderWidth: 1, borderColor: COLORS.primary },
  cellSelected: { backgroundColor: COLORS.primary },
  dots: { flexDirection: 'row', gap: 2, marginTop: 3, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  eventRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingLeft: 11, borderLeftWidth: 3, marginBottom: 6, backgroundColor: COLORS.bg, borderRadius: 8 },
});