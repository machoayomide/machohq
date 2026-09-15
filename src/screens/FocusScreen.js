import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../theme';
import { Card, Badge, Btn, Ring, TabBar, Input } from '../components/UI';
import { FOCUS_BLOCKS } from '../data/constants';

const fmt = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

export default function FocusScreen() {
  const [tab, setTab] = useState(0);
  const [running, setRunning] = useState(false);
  const [block, setBlock] = useState(null);
  const [secs, setSecs] = useState(0);
  const [totalSecs, setTotalSecs] = useState(0);
  const [showEnd, setShowEnd] = useState(false);
  const [worked, setWorked] = useState(null);
  const [distraction, setDistraction] = useState('');
  const [excited, setExcited] = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    if (running && secs > 0) {
      timerRef.current = setInterval(() => {
        setSecs(s => {
          if (s <= 1) {
            clearInterval(timerRef.current);
            setRunning(false);
            setShowEnd(true);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [running]);

  const startBlock = (b) => {
    const [sh, sm] = b.start.split(':').map(Number);
    const [eh, em] = b.end.split(':').map(Number);
    const dur = ((eh * 60 + em) - (sh * 60 + sm)) * 60;
    setBlock(b);
    setTotalSecs(dur);
    setSecs(dur);
    setRunning(true);
    setTab(0);
  };

  const pause = () => { setRunning(false); clearInterval(timerRef.current); };
  const resume = () => setRunning(true);
  const stop = () => { setRunning(false); clearInterval(timerRef.current); setSecs(0); setBlock(null); };

  const submitEnd = () => {
    setShowEnd(false);
    setBlock(null);
    setSecs(0);
    setWorked(null);
    setDistraction('');
    setExcited('');
  };

  const distractions = ['Phone', 'Social media', 'Visitors', 'Tiredness', 'Food', 'Nothing'];

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={s.title}>Focus Engine</Text>
      <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 16 }}>Deep work blocks · Verified timer</Text>
      <TabBar tabs={['Timer', 'Schedule', 'Insights']} active={tab} onChange={setTab} />

      {tab === 0 && (
        <View>
          {block && (
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Badge text={block.name + ' Block'} color={block.color} />
            </View>
          )}

          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <Ring value={totalSecs > 0 ? totalSecs - secs : 0} max={totalSecs || 1} size={200} strokeWidth={12} color={block?.color || COLORS.primary}>
              <Text style={s.timerText}>{fmt(secs)}</Text>
              <Text style={{ color: COLORS.t3, fontSize: 11 }}>
                {running ? 'remaining' : secs > 0 ? 'paused' : 'ready'}
              </Text>
            </Ring>
          </View>

          {!block && FOCUS_BLOCKS.map(b => (
            <Card key={b.id} onPress={() => startBlock(b)} style={{ padding: 14, borderLeftWidth: 3, borderLeftColor: b.color, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: COLORS.t1, fontSize: 14, fontWeight: '600' }}>{b.name} Block</Text>
                <Text style={{ color: COLORS.t3, fontSize: 11 }}>{b.start} — {b.end}</Text>
              </View>
              <View style={{ backgroundColor: b.color, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 }}>
                <Text style={{ color: COLORS.bg, fontSize: 11, fontWeight: '600' }}>Start</Text>
              </View>
            </Card>
          ))}

          {block && !showEnd && (
            <View>
              {running ? (
                <Btn full color={COLORS.danger} onPress={pause}>Pause Timer</Btn>
              ) : (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Btn full onPress={resume}>Resume</Btn>
                  <Btn full outline onPress={stop}>Stop</Btn>
                </View>
              )}
            </View>
          )}

          {showEnd && (
            <Card glow={COLORS.accent} style={{ marginTop: 16 }}>
              <Text style={{ color: COLORS.accent, fontSize: 16, fontWeight: '700', marginBottom: 12 }}>Block complete — check-in</Text>

              <Text style={{ color: COLORS.t2, fontSize: 12, marginBottom: 8 }}>Did you work the full block?</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {[['Yes', true, COLORS.primary], ['No', false, COLORS.danger]].map(([label, val, col]) => (
                  <TouchableOpacity key={label} onPress={() => setWorked(val)} style={[s.choiceBtn, worked === val && { borderColor: col, backgroundColor: col + '22' }]}>
                    <Text style={{ color: worked === val ? col : COLORS.t3, fontSize: 13 }}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ color: COLORS.t2, fontSize: 12, marginBottom: 6 }}>What distracted you?</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {distractions.map(d => (
                  <TouchableOpacity key={d} onPress={() => setDistraction(d)} style={[s.tagBtn, distraction === d && { borderColor: COLORS.warn, backgroundColor: COLORS.warn + '22' }]}>
                    <Text style={{ color: distraction === d ? COLORS.warn : COLORS.t3, fontSize: 11 }}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ color: COLORS.t2, fontSize: 12, marginBottom: 6 }}>What excited you?</Text>
              <Input value={excited} onChangeText={setExcited} placeholder="Something that motivated you..." />

              <Btn full color={COLORS.accent} onPress={submitEnd} style={{ marginTop: 16 }}>Submit & close</Btn>
            </Card>
          )}
        </View>
      )}

      {tab === 1 && (
        <View>
          <Text style={{ color: COLORS.t2, fontSize: 12, marginBottom: 12 }}>Tap any block to start it</Text>
          {FOCUS_BLOCKS.map(b => (
            <Card key={b.id} style={{ padding: 14, borderLeftWidth: 3, borderLeftColor: b.color, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: COLORS.t1, fontSize: 14, fontWeight: '600' }}>{b.name} Block</Text>
                <Text style={{ color: COLORS.t3, fontSize: 11 }}>{b.start} — {b.end}</Text>
              </View>
              <Btn outline onPress={() => startBlock(b)} style={{ height: 32, paddingHorizontal: 12 }}>Start</Btn>
            </Card>
          ))}

          <Card style={{ borderStyle: 'dashed', borderColor: COLORS.primary + '44', alignItems: 'center', padding: 12 }}>
            <Text style={{ color: COLORS.primary, fontSize: 12 }}>+ Add custom block</Text>
          </Card>

          <Card style={{ backgroundColor: COLORS.warn + '11', borderColor: COLORS.warn + '33' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: COLORS.warn, fontSize: 12, fontWeight: '600' }}>Training Override</Text>
                <Text style={{ color: COLORS.t3, fontSize: 10 }}>Count long trainings (3h+) as blocks</Text>
              </View>
              <View style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: COLORS.border, justifyContent: 'center', paddingLeft: 3 }}>
                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.t3 }} />
              </View>
            </View>
          </Card>
        </View>
      )}

      {tab === 2 && (
        <View>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <Card style={{ flex: 1, padding: 12, marginBottom: 0 }}>
              <Text style={{ color: COLORS.t3, fontSize: 10 }}>Total focus hours</Text>
              <Text style={{ fontSize: 24, fontWeight: '700', color: COLORS.t1 }}>47.5</Text>
              <Text style={{ color: COLORS.t3, fontSize: 10 }}>this month</Text>
            </Card>
            <Card style={{ flex: 1, padding: 12, marginBottom: 0 }}>
              <Text style={{ color: COLORS.t3, fontSize: 10 }}>Honesty rate</Text>
              <Text style={{ fontSize: 24, fontWeight: '700', color: COLORS.primary }}>89%</Text>
              <Text style={{ color: COLORS.t3, fontSize: 10 }}>checked in honestly</Text>
            </Card>
          </View>

          <Card>
            <Text style={{ color: COLORS.t2, fontSize: 13, fontWeight: '600', marginBottom: 12 }}>Weekly energy</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 100 }}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => {
                const v = [75, 82, 60, 90, 45, 88, 70][i];
                return (
                  <View key={d} style={{ flex: 1, alignItems: 'center' }}>
                    <View style={{ height: v, width: '100%', backgroundColor: v >= 80 ? COLORS.primary : v >= 60 ? COLORS.warn : COLORS.danger, borderRadius: 4, marginBottom: 4 }} />
                    <Text style={{ color: COLORS.t3, fontSize: 9 }}>{d}</Text>
                  </View>
                );
              })}
            </View>
          </Card>

          <Card>
            <Text style={{ color: COLORS.t2, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Top distractions</Text>
            {[
              { name: 'Phone', count: 8, color: COLORS.danger },
              { name: 'Social media', count: 5, color: COLORS.warn },
              { name: 'Tiredness', count: 3, color: COLORS.blue },
            ].map((d, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
                <View style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: d.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: d.color }}>{i + 1}</Text>
                </View>
                <Text style={{ color: COLORS.t2, fontSize: 12, flex: 1 }}>{d.name}</Text>
                <Text style={{ color: COLORS.t3, fontSize: 11 }}>{d.count}x</Text>
              </View>
            ))}
          </Card>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingTop: 20 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.t1, marginBottom: 4 },
  timerText: { fontSize: 38, fontWeight: '800', color: COLORS.t1, fontFamily: 'monospace', letterSpacing: -1 },
  choiceBtn: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  tagBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
});