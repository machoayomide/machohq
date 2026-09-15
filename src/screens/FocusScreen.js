import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { COLORS } from '../theme';
import { Card, Badge, Btn, Ring, TabBar, Input } from '../components/UI';
import { FOCUS_BLOCKS } from '../data/constants';
import { getData, setData, today } from '../utils/storage';
import {
  requestPermissions, scheduleBlockEnd, scheduleMidBlockCheck,
  cancelNotification,
} from '../utils/notifications';

const fmt = (s) => {
  const safe = Math.max(0, Math.floor(s));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const sec = safe % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

// Timer state shape stored in AsyncStorage:
// { blockId, blockName, color, endAt (ms), totalSecs, pausedRemaining, notifIds }
const TIMER_KEY = 'activeTimer';

export default function FocusScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(0);
  const [block, setBlock] = useState(null);
  const [endAt, setEndAt] = useState(null);        // timestamp in ms
  const [pausedRemaining, setPausedRemaining] = useState(null); // secs when paused
  const [totalSecs, setTotalSecs] = useState(0);
  const [secs, setSecs] = useState(0);
  const [notifIds, setNotifIds] = useState([]);
  const [showEnd, setShowEnd] = useState(false);
  const [worked, setWorked] = useState(null);
  const [distraction, setDistraction] = useState('');
  const [excited, setExcited] = useState('');
  const [sessions, setSessions] = useState([]);
  const tickRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  const running = endAt !== null && pausedRemaining === null;

  // ─── Restore timer on mount (survives app kill) ───
  useEffect(() => {
    requestPermissions();
    (async () => {
      const saved = await getData(TIMER_KEY);
      const past = await getData('focusSessions');
      if (past) setSessions(past);

      if (saved && saved.blockId) {
        const blk = FOCUS_BLOCKS.find(b => b.id === saved.blockId) || {
          id: saved.blockId, name: saved.blockName, color: saved.color,
        };
        setBlock(blk);
        setTotalSecs(saved.totalSecs);
        setNotifIds(saved.notifIds || []);

        if (saved.pausedRemaining != null) {
          setPausedRemaining(saved.pausedRemaining);
          setSecs(saved.pausedRemaining);
        } else {
          const remaining = Math.round((saved.endAt - Date.now()) / 1000);
          if (remaining > 0) {
            setEndAt(saved.endAt);
            setSecs(remaining);
          } else {
            // Block finished while app was closed
            setSecs(0);
            setShowEnd(true);
            setData(TIMER_KEY, null);
          }
        }
      }
    })();
  }, []);

  // ─── Tick: recalculates from wall clock, not accumulated counts ───
  const recalc = useCallback(() => {
    if (endAt === null || pausedRemaining !== null) return;
    const remaining = Math.round((endAt - Date.now()) / 1000);
    if (remaining <= 0) {
      setSecs(0);
      clearInterval(tickRef.current);
      setEndAt(null);
      setShowEnd(true);
      deactivateKeepAwake().catch(() => {});
      setData(TIMER_KEY, null);
    } else {
      setSecs(remaining);
    }
  }, [endAt, pausedRemaining]);

  useEffect(() => {
    if (running) {
      recalc();
      tickRef.current = setInterval(recalc, 1000);
    }
    return () => clearInterval(tickRef.current);
  }, [running, recalc]);

  // ─── AppState: recalc the instant you return to the app ───
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (appStateRef.current.match(/inactive|background/) && next === 'active') {
        recalc();
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [recalc]);

  // ─── Start a block ───
  const startBlock = async (b) => {
    const [sh, sm] = b.start.split(':').map(Number);
    const [eh, em] = b.end.split(':').map(Number);
    let dur = ((eh * 60 + em) - (sh * 60 + sm)) * 60;
    if (dur <= 0) dur += 24 * 3600; // overnight block (e.g. 22:00 -> 05:00)

    const end = Date.now() + dur * 1000;
    const endId = await scheduleBlockEnd(b.name, dur);
    const midId = await scheduleMidBlockCheck(b.name, dur / 2);
    const ids = [endId, midId].filter(Boolean);

    setBlock(b);
    setTotalSecs(dur);
    setSecs(dur);
    setEndAt(end);
    setPausedRemaining(null);
    setNotifIds(ids);
    setTab(0);

    activateKeepAwakeAsync().catch(() => {});
    await setData(TIMER_KEY, {
      blockId: b.id, blockName: b.name, color: b.color,
      endAt: end, totalSecs: dur, pausedRemaining: null, notifIds: ids,
      startedAt: Date.now(),
    });
  };

  const pause = async () => {
    const remaining = Math.max(0, Math.round((endAt - Date.now()) / 1000));
    setPausedRemaining(remaining);
    setSecs(remaining);
    setEndAt(null);
    clearInterval(tickRef.current);
    for (const id of notifIds) await cancelNotification(id);
    setNotifIds([]);
    deactivateKeepAwake().catch(() => {});
    await setData(TIMER_KEY, {
      blockId: block.id, blockName: block.name, color: block.color,
      endAt: null, totalSecs, pausedRemaining: remaining, notifIds: [],
    });
  };

  const resume = async () => {
    const end = Date.now() + pausedRemaining * 1000;
    const endId = await scheduleBlockEnd(block.name, pausedRemaining);
    const ids = [endId].filter(Boolean);
    setEndAt(end);
    setPausedRemaining(null);
    setNotifIds(ids);
    activateKeepAwakeAsync().catch(() => {});
    await setData(TIMER_KEY, {
      blockId: block.id, blockName: block.name, color: block.color,
      endAt: end, totalSecs, pausedRemaining: null, notifIds: ids,
    });
  };

  const stop = async () => {
    clearInterval(tickRef.current);
    for (const id of notifIds) await cancelNotification(id);
    setBlock(null); setEndAt(null); setPausedRemaining(null);
    setSecs(0); setNotifIds([]);
    deactivateKeepAwake().catch(() => {});
    await setData(TIMER_KEY, null);
  };

  const submitEnd = async () => {
    const entry = {
      id: Date.now(), date: today(),
      block: block?.name || 'Unknown',
      minutes: Math.round(totalSecs / 60),
      worked, distraction, excited,
    };
    const updated = [...sessions, entry];
    setSessions(updated);
    await setData('focusSessions', updated);

    setShowEnd(false); setBlock(null); setEndAt(null);
    setPausedRemaining(null); setSecs(0);
    setWorked(null); setDistraction(''); setExcited('');
    await setData(TIMER_KEY, null);
  };

  const distractions = ['Phone', 'Social media', 'Visitors', 'Tiredness', 'Food', 'Nothing'];

  // ─── Insights data from real sessions ───
  const todaySessions = sessions.filter(s => s.date === today());
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.minutes || 0), 0);
  const honestCount = sessions.filter(s => s.worked === true).length;
  const honestyRate = sessions.length > 0 ? Math.round((honestCount / sessions.length) * 100) : 0;

  const distractionCounts = {};
  sessions.forEach(s => {
    if (s.distraction && s.distraction !== 'Nothing') {
      distractionCounts[s.distraction] = (distractionCounts[s.distraction] || 0) + 1;
    }
  });
  const topDistractions = Object.entries(distractionCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <ScrollView style={[s.container, { paddingTop: insets.top + 12 }]} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={s.title}>Focus Engine</Text>
      <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 16 }}>
        Runs in background · Notifies when done
      </Text>
      <TabBar tabs={['Timer', 'Schedule', 'Insights']} active={tab} onChange={setTab} />

      {tab === 0 && (
        <View>
          {block && (
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Badge text={`${block.name} Block`} color={block.color} />
            </View>
          )}

          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <Ring value={totalSecs > 0 ? totalSecs - secs : 0} max={totalSecs || 1}
              size={200} strokeWidth={12} color={block?.color || COLORS.primary}>
              <Text style={s.timerText}>{fmt(secs)}</Text>
              <Text style={{ color: COLORS.t3, fontSize: 11 }}>
                {running ? 'remaining' : pausedRemaining !== null ? 'paused' : 'ready'}
              </Text>
            </Ring>
          </View>

          {running && (
            <Card style={{ backgroundColor: COLORS.primary + '11', borderColor: COLORS.primary + '33', padding: 12 }}>
              <Text style={{ color: COLORS.primary, fontSize: 11, textAlign: 'center' }}>
                Timer keeps running if you close the app. You'll get a notification when the block ends.
              </Text>
            </Card>
          )}

          {!block && FOCUS_BLOCKS.map(b => (
            <Card key={b.id} onPress={() => startBlock(b)}
              style={{ padding: 14, borderLeftWidth: 3, borderLeftColor: b.color, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
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
              <Text style={{ color: COLORS.accent, fontSize: 16, fontWeight: '700', marginBottom: 12 }}>
                Block complete — check-in
              </Text>

              <Text style={{ color: COLORS.t2, fontSize: 12, marginBottom: 8 }}>Did you work the full block?</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {[['Yes', true, COLORS.primary], ['No', false, COLORS.danger]].map(([label, val, col]) => (
                  <TouchableOpacity key={label} onPress={() => setWorked(val)}
                    style={[s.choiceBtn, worked === val && { borderColor: col, backgroundColor: col + '22' }]}>
                    <Text style={{ color: worked === val ? col : COLORS.t3, fontSize: 13 }}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ color: COLORS.t2, fontSize: 12, marginBottom: 6 }}>What distracted you?</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {distractions.map(d => (
                  <TouchableOpacity key={d} onPress={() => setDistraction(d)}
                    style={[s.tagBtn, distraction === d && { borderColor: COLORS.warn, backgroundColor: COLORS.warn + '22' }]}>
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
          <Card style={{ backgroundColor: COLORS.warn + '11', borderColor: COLORS.warn + '33' }}>
            <Text style={{ color: COLORS.warn, fontSize: 12, fontWeight: '600' }}>Training Override</Text>
            <Text style={{ color: COLORS.t3, fontSize: 10, marginTop: 2 }}>
              Count long trainings (3h+) as a completed block
            </Text>
          </Card>
        </View>
      )}

      {tab === 2 && (
        <View>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <Card style={{ flex: 1, padding: 12, marginBottom: 0 }}>
              <Text style={{ color: COLORS.t3, fontSize: 10 }}>Total focus hours</Text>
              <Text style={{ fontSize: 24, fontWeight: '700', color: COLORS.t1 }}>
                {(totalMinutes / 60).toFixed(1)}
              </Text>
              <Text style={{ color: COLORS.t3, fontSize: 10 }}>{sessions.length} sessions</Text>
            </Card>
            <Card style={{ flex: 1, padding: 12, marginBottom: 0 }}>
              <Text style={{ color: COLORS.t3, fontSize: 10 }}>Honesty rate</Text>
              <Text style={{ fontSize: 24, fontWeight: '700', color: honestyRate >= 80 ? COLORS.primary : COLORS.warn }}>
                {honestyRate}%
              </Text>
              <Text style={{ color: COLORS.t3, fontSize: 10 }}>worked full block</Text>
            </Card>
          </View>

          <Card>
            <Text style={{ color: COLORS.t2, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Today</Text>
            {todaySessions.length === 0 ? (
              <Text style={{ color: COLORS.t3, fontSize: 12, textAlign: 'center', padding: 12 }}>
                No blocks completed today
              </Text>
            ) : todaySessions.map(ses => (
              <View key={ses.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                <View>
                  <Text style={{ color: COLORS.t1, fontSize: 12 }}>{ses.block}</Text>
                  <Text style={{ color: COLORS.t3, fontSize: 10 }}>
                    {ses.minutes} min {ses.distraction ? `· ${ses.distraction}` : ''}
                  </Text>
                </View>
                <Badge text={ses.worked ? 'Honest' : 'Partial'} color={ses.worked ? COLORS.primary : COLORS.warn} />
              </View>
            ))}
          </Card>

          <Card>
            <Text style={{ color: COLORS.t2, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Top distractions</Text>
            {topDistractions.length === 0 ? (
              <Text style={{ color: COLORS.t3, fontSize: 12, textAlign: 'center', padding: 12 }}>
                No distractions logged yet
              </Text>
            ) : topDistractions.map(([name, count], i) => (
              <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
                <View style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: COLORS.danger + '22', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.danger }}>{i + 1}</Text>
                </View>
                <Text style={{ color: COLORS.t2, fontSize: 12, flex: 1 }}>{name}</Text>
                <Text style={{ color: COLORS.t3, fontSize: 11 }}>{count}x</Text>
              </View>
            ))}
          </Card>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.t1, marginBottom: 4 },
  timerText: { fontSize: 36, fontWeight: '800', color: COLORS.t1, letterSpacing: -1 },
  choiceBtn: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  tagBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
});
