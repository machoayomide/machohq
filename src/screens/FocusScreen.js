import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, AppState, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { COLORS } from '../theme';
import { Card, Badge, Btn, Ring, TabBar, Input } from '../components/UI';
import { getData, setData, today } from '../utils/storage';
import { requestPermissions, scheduleBlockEnd, scheduleMidBlockCheck, cancelNotification } from '../utils/notifications';

const TIMER_KEY = 'activeTimer';
const BLOCKS_KEY = 'focusBlocks';

const DEFAULT_BLOCKS = [
  { id: 1, name: 'Morning', start: '06:00', end: '09:00', color: COLORS.primary },
  { id: 2, name: 'Midday', start: '09:00', end: '12:00', color: COLORS.accent },
  { id: 3, name: 'Afternoon', start: '14:00', end: '17:00', color: COLORS.blue },
  { id: 4, name: 'Night', start: '20:00', end: '23:00', color: COLORS.warn },
];

const PALETTE = [COLORS.primary, COLORS.accent, COLORS.blue, COLORS.warn, COLORS.danger, '#00cc88'];

const fmt = (s) => {
  const safe = Math.max(0, Math.floor(s));
  return `${String(Math.floor(safe / 3600)).padStart(2, '0')}:${String(Math.floor((safe % 3600) / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
};

const durationOf = (b) => {
  const [sh, sm] = b.start.split(':').map(Number);
  const [eh, em] = b.end.split(':').map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60;
  return mins * 60;
};

const hoursLabel = (b) => {
  const mins = durationOf(b) / 60;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

// Very forgiving time input — accepts 6, 06, 6:30, 0630
const normaliseTime = (raw) => {
  const v = (raw || '').replace(/[^0-9:]/g, '');
  if (!v) return null;
  if (v.includes(':')) {
    const [h, m] = v.split(':');
    const H = Math.min(23, parseInt(h || '0', 10));
    const M = Math.min(59, parseInt(m || '0', 10));
    if (isNaN(H) || isNaN(M)) return null;
    return `${String(H).padStart(2, '0')}:${String(M).padStart(2, '0')}`;
  }
  if (v.length <= 2) {
    const H = Math.min(23, parseInt(v, 10));
    return isNaN(H) ? null : `${String(H).padStart(2, '0')}:00`;
  }
  const H = Math.min(23, parseInt(v.slice(0, v.length - 2), 10));
  const M = Math.min(59, parseInt(v.slice(-2), 10));
  if (isNaN(H) || isNaN(M)) return null;
  return `${String(H).padStart(2, '0')}:${String(M).padStart(2, '0')}`;
};

export default function FocusScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(0);
  const [blocks, setBlocks] = useState(DEFAULT_BLOCKS);
  const [sessions, setSessions] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // timer
  const [block, setBlock] = useState(null);
  const [endAt, setEndAt] = useState(null);
  const [pausedRemaining, setPausedRemaining] = useState(null);
  const [totalSecs, setTotalSecs] = useState(0);
  const [secs, setSecs] = useState(0);
  const [notifIds, setNotifIds] = useState([]);
  const [showEnd, setShowEnd] = useState(false);
  const [worked, setWorked] = useState(null);
  const [distraction, setDistraction] = useState('');
  const [excited, setExcited] = useState('');

  // schedule editing
  const [editing, setEditing] = useState(null);
  const [eName, setEName] = useState('');
  const [eStart, setEStart] = useState('');
  const [eEnd, setEEnd] = useState('');
  const [eColor, setEColor] = useState(COLORS.primary);

  const tickRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const running = endAt !== null && pausedRemaining === null;

  // ─── Load ───
  useEffect(() => {
    requestPermissions();
    (async () => {
      const savedBlocks = await getData(BLOCKS_KEY);
      if (savedBlocks && savedBlocks.length) setBlocks(savedBlocks);
      const past = await getData('focusSessions');
      if (past) setSessions(past);

      const saved = await getData(TIMER_KEY);
      if (saved && saved.blockId) {
        const list = savedBlocks && savedBlocks.length ? savedBlocks : DEFAULT_BLOCKS;
        const blk = list.find(b => b.id === saved.blockId) || { id: saved.blockId, name: saved.blockName, color: saved.color };
        setBlock(blk);
        setTotalSecs(saved.totalSecs);
        setNotifIds(saved.notifIds || []);
        if (saved.pausedRemaining != null) {
          setPausedRemaining(saved.pausedRemaining);
          setSecs(saved.pausedRemaining);
        } else {
          const remaining = Math.round((saved.endAt - Date.now()) / 1000);
          if (remaining > 0) { setEndAt(saved.endAt); setSecs(remaining); }
          else { setSecs(0); setShowEnd(true); setData(TIMER_KEY, null); }
        }
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded) setData(BLOCKS_KEY, blocks); }, [blocks, loaded]);

  // ─── Tick from wall clock ───
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
    } else setSecs(remaining);
  }, [endAt, pausedRemaining]);

  useEffect(() => {
    if (running) { recalc(); tickRef.current = setInterval(recalc, 1000); }
    return () => clearInterval(tickRef.current);
  }, [running, recalc]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (appStateRef.current.match(/inactive|background/) && next === 'active') recalc();
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [recalc]);

  // ─── Completion state, per day ───
  const todaySessions = sessions.filter(s => s.date === today());
  const isDoneToday = (b) => todaySessions.some(s => s.blockId === b.id);
  const sessionFor = (b) => todaySessions.find(s => s.blockId === b.id);
  const completedCount = blocks.filter(isDoneToday).length;

  // ─── Timer controls ───
  const startBlock = async (b) => {
    if (isDoneToday(b)) {
      Alert.alert(
        `${b.name} already done today`,
        'You logged this block earlier. Run it again anyway?',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Run again', onPress: () => reallyStart(b) }]
      );
      return;
    }
    reallyStart(b);
  };

  const reallyStart = async (b) => {
    const dur = durationOf(b);
    const end = Date.now() + dur * 1000;
    const endId = await scheduleBlockEnd(b.name, dur);
    const midId = await scheduleMidBlockCheck(b.name, dur / 2);
    const ids = [endId, midId].filter(Boolean);

    setBlock(b); setTotalSecs(dur); setSecs(dur);
    setEndAt(end); setPausedRemaining(null); setNotifIds(ids); setTab(0);
    activateKeepAwakeAsync().catch(() => {});
    await setData(TIMER_KEY, {
      blockId: b.id, blockName: b.name, color: b.color,
      endAt: end, totalSecs: dur, pausedRemaining: null, notifIds: ids,
    });
  };

  const pause = async () => {
    const remaining = Math.max(0, Math.round((endAt - Date.now()) / 1000));
    setPausedRemaining(remaining); setSecs(remaining); setEndAt(null);
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
    setEndAt(end); setPausedRemaining(null); setNotifIds(ids);
    activateKeepAwakeAsync().catch(() => {});
    await setData(TIMER_KEY, {
      blockId: block.id, blockName: block.name, color: block.color,
      endAt: end, totalSecs, pausedRemaining: null, notifIds: ids,
    });
  };

  const stopWithoutLogging = async () => {
    clearInterval(tickRef.current);
    for (const id of notifIds) await cancelNotification(id);
    setBlock(null); setEndAt(null); setPausedRemaining(null); setSecs(0); setNotifIds([]);
    deactivateKeepAwake().catch(() => {});
    await setData(TIMER_KEY, null);
  };

  // Finish early but still count it
  const finishEarly = () => {
    const done = totalSecs - secs;
    if (done < 60) { stopWithoutLogging(); return; }
    clearInterval(tickRef.current);
    setEndAt(null);
    setShowEnd(true);
    deactivateKeepAwake().catch(() => {});
  };

  const logSession = async () => {
    const minutesDone = Math.max(1, Math.round((totalSecs - secs) / 60));
    const entry = {
      id: Date.now(),
      date: today(),
      blockId: block?.id,
      block: block?.name || 'Unknown',
      minutes: minutesDone,
      planned: Math.round(totalSecs / 60),
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

  // Mark a block done without running the timer
  const markDone = (b) => {
    Alert.alert(
      `Mark ${b.name} as done?`,
      'Use this when you worked the block but did not run the timer.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark done',
          onPress: async () => {
            const entry = {
              id: Date.now(), date: today(), blockId: b.id, block: b.name,
              minutes: Math.round(durationOf(b) / 60), planned: Math.round(durationOf(b) / 60),
              worked: true, distraction: '', excited: '', manual: true,
            };
            const updated = [...sessions, entry];
            setSessions(updated);
            await setData('focusSessions', updated);
          },
        },
      ]
    );
  };

  const undoDone = async (b) => {
    const updated = sessions.filter(s => !(s.date === today() && s.blockId === b.id));
    setSessions(updated);
    await setData('focusSessions', updated);
  };

  // ─── Block editing ───
  const openEdit = (b) => {
    setEditing(b ? b.id : 'new');
    setEName(b?.name || '');
    setEStart(b?.start || '');
    setEEnd(b?.end || '');
    setEColor(b?.color || PALETTE[blocks.length % PALETTE.length]);
  };

  const saveBlock = () => {
    const start = normaliseTime(eStart);
    const end = normaliseTime(eEnd);
    if (!eName.trim()) { Alert.alert('Name it', 'Give the block a name.'); return; }
    if (!start || !end) { Alert.alert('Check the times', 'Enter times like 6, 6:30 or 0630.'); return; }
    if (start === end) { Alert.alert('Same time', 'Start and end cannot match.'); return; }

    if (editing === 'new') {
      setBlocks(prev => [...prev, { id: Date.now(), name: eName.trim(), start, end, color: eColor }]);
    } else {
      setBlocks(prev => prev.map(b => b.id === editing ? { ...b, name: eName.trim(), start, end, color: eColor } : b));
    }
    setEditing(null);
  };

  const deleteBlock = (id) => {
    Alert.alert('Delete this block?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { setBlocks(prev => prev.filter(b => b.id !== id)); setEditing(null); } },
    ]);
  };

  const resetBlocks = () => {
    Alert.alert('Reset to default blocks?', 'Your custom blocks will be replaced.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => setBlocks(DEFAULT_BLOCKS) },
    ]);
  };

  const distractions = ['Phone', 'Social media', 'Visitors', 'Tiredness', 'Food', 'Nothing'];

  // ─── Insights ───
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.minutes || 0), 0);
  const honestCount = sessions.filter(s => s.worked === true).length;
  const honestyRate = sessions.length ? Math.round((honestCount / sessions.length) * 100) : 0;
  const distractionCounts = {};
  sessions.forEach(s => {
    if (s.distraction && s.distraction !== 'Nothing') {
      distractionCounts[s.distraction] = (distractionCounts[s.distraction] || 0) + 1;
    }
  });
  const topDistractions = Object.entries(distractionCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <ScrollView style={[s.container, { paddingTop: 12 }]} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={s.title}>Focus Engine</Text>
      <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 12 }}>
        {completedCount > 0
          ? `${completedCount} of ${blocks.length} blocks done today`
          : 'Runs in background · notifies when done'}
      </Text>

      <TabBar tabs={['Timer', 'Schedule', 'Insights']} active={tab} onChange={setTab} />

      {/* ─── TIMER ─── */}
      {tab === 0 && (
        <View>
          {block && (
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Badge text={`${block.name} Block`} color={block.color} />
            </View>
          )}

          <View style={{ alignItems: 'center', marginBottom: 18 }}>
            <Ring value={totalSecs > 0 ? totalSecs - secs : 0} max={totalSecs || 1}
              size={200} strokeWidth={12} color={block?.color || COLORS.primary}>
              <Text style={s.timerText}>{fmt(secs)}</Text>
              <Text style={{ color: COLORS.t3, fontSize: 11 }}>
                {running ? 'remaining' : pausedRemaining !== null ? 'paused' : 'ready'}
              </Text>
            </Ring>
          </View>

          {running && (
            <Card style={{ backgroundColor: COLORS.primary + '11', borderColor: COLORS.primary + '33', padding: 11 }}>
              <Text style={{ color: COLORS.primary, fontSize: 11, textAlign: 'center' }}>
                Keeps running if you close the app. You will get a notification when it ends.
              </Text>
            </Card>
          )}

          {!block && blocks.map(b => {
            const done = isDoneToday(b);
            const ses = sessionFor(b);
            return (
              <Card key={b.id} style={{ padding: 13, borderLeftWidth: 3, borderLeftColor: done ? COLORS.primary : b.color, opacity: done ? 0.75 : 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ color: COLORS.t1, fontSize: 14, fontWeight: '600' }}>{b.name} Block</Text>
                      {done && <Badge text="Done" color={COLORS.primary} />}
                    </View>
                    <Text style={{ color: COLORS.t3, fontSize: 11, marginTop: 2 }}>
                      {b.start} — {b.end} · {hoursLabel(b)}
                      {done && ses ? ` · logged ${ses.minutes}m` : ''}
                    </Text>
                  </View>
                  {done ? (
                    <TouchableOpacity onPress={() => undoDone(b)}>
                      <Text style={{ color: COLORS.t3, fontSize: 11 }}>Undo</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <TouchableOpacity onPress={() => markDone(b)}>
                        <Text style={{ color: COLORS.t3, fontSize: 11 }}>Mark done</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => startBlock(b)}
                        style={{ backgroundColor: b.color, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 9 }}>
                        <Text style={{ color: COLORS.bg, fontSize: 11, fontWeight: '700' }}>Start</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </Card>
            );
          })}

          {!block && completedCount === blocks.length && blocks.length > 0 && (
            <Card glow={COLORS.primary} style={{ alignItems: 'center', padding: 22 }}>
              <Text style={{ fontSize: 26, marginBottom: 6 }}>✓</Text>
              <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '700' }}>All blocks done today</Text>
              <Text style={{ color: COLORS.t3, fontSize: 11, marginTop: 4, textAlign: 'center' }}>
                Resets at midnight. Rest or go beyond.
              </Text>
            </Card>
          )}

          {block && !showEnd && (
            <View>
              {running ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Btn full color={COLORS.danger} onPress={pause}>Pause</Btn>
                  <Btn outline onPress={finishEarly} style={{ paddingHorizontal: 18 }}>Finish</Btn>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Btn full onPress={resume}>Resume</Btn>
                  <Btn outline onPress={finishEarly} style={{ paddingHorizontal: 18 }}>Finish</Btn>
                  <Btn outline onPress={stopWithoutLogging} style={{ paddingHorizontal: 14 }}>Discard</Btn>
                </View>
              )}
            </View>
          )}

          {showEnd && (
            <Card glow={COLORS.accent} style={{ marginTop: 14 }}>
              <Text style={{ color: COLORS.accent, fontSize: 16, fontWeight: '700', marginBottom: 4 }}>
                {block?.name} block finished
              </Text>
              <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 14 }}>
                {Math.round((totalSecs - secs) / 60)} minutes of {Math.round(totalSecs / 60)} planned
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

              <Btn full color={COLORS.accent} onPress={logSession} style={{ marginTop: 14 }}>
                Log this block
              </Btn>
            </Card>
          )}
        </View>
      )}

      {/* ─── SCHEDULE ─── */}
      {tab === 1 && (
        <View>
          <Text style={{ color: COLORS.t2, fontSize: 12, marginBottom: 12 }}>
            Your blocks, your times. Tap one to edit it.
          </Text>

          {blocks.map(b => (
            <Card key={b.id} style={{ padding: 13, borderLeftWidth: 3, borderLeftColor: b.color }}>
              <TouchableOpacity onPress={() => openEdit(b)}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ color: COLORS.t1, fontSize: 14, fontWeight: '600' }}>{b.name}</Text>
                      {isDoneToday(b) && <Badge text="Done today" color={COLORS.primary} />}
                    </View>
                    <Text style={{ color: COLORS.t3, fontSize: 11, marginTop: 2 }}>
                      {b.start} — {b.end} · {hoursLabel(b)}
                    </Text>
                  </View>
                  <Text style={{ color: COLORS.t3, fontSize: 11 }}>Edit</Text>
                </View>
              </TouchableOpacity>

              {editing === b.id && (
                <View style={s.editBox}>
                  <Text style={s.label}>Name</Text>
                  <Input value={eName} onChangeText={setEName} placeholder="e.g. Early morning" />
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.label}>Start</Text>
                      <Input value={eStart} onChangeText={setEStart} placeholder="06:00" keyboardType="numbers-and-punctuation" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.label}>End</Text>
                      <Input value={eEnd} onChangeText={setEEnd} placeholder="09:00" keyboardType="numbers-and-punctuation" />
                    </View>
                  </View>
                  <Text style={{ color: COLORS.t3, fontSize: 10, marginTop: 6 }}>
                    Type 6, 6:30 or 0630 — all work. Overnight blocks like 22:00 to 05:00 are fine.
                  </Text>

                  <Text style={[s.label, { marginTop: 12 }]}>Colour</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {PALETTE.map(c => (
                      <TouchableOpacity key={c} onPress={() => setEColor(c)}
                        style={[s.swatch, { backgroundColor: c }, eColor === c && s.swatchActive]} />
                    ))}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                    <Btn full onPress={saveBlock}>Save</Btn>
                    <Btn outline onPress={() => setEditing(null)} style={{ paddingHorizontal: 16 }}>Cancel</Btn>
                    <Btn outline onPress={() => deleteBlock(b.id)} style={{ paddingHorizontal: 14 }}>Delete</Btn>
                  </View>
                </View>
              )}
            </Card>
          ))}

          {editing === 'new' && (
            <Card style={{ borderColor: COLORS.primary + '44' }}>
              <Text style={{ color: COLORS.t1, fontSize: 14, fontWeight: '600', marginBottom: 10 }}>New block</Text>
              <Text style={s.label}>Name</Text>
              <Input value={eName} onChangeText={setEName} placeholder="e.g. Late night" />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Start</Text>
                  <Input value={eStart} onChangeText={setEStart} placeholder="00:00" keyboardType="numbers-and-punctuation" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>End</Text>
                  <Input value={eEnd} onChangeText={setEEnd} placeholder="05:00" keyboardType="numbers-and-punctuation" />
                </View>
              </View>
              <Text style={[s.label, { marginTop: 12 }]}>Colour</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {PALETTE.map(c => (
                  <TouchableOpacity key={c} onPress={() => setEColor(c)}
                    style={[s.swatch, { backgroundColor: c }, eColor === c && s.swatchActive]} />
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                <Btn full onPress={saveBlock}>Add block</Btn>
                <Btn outline onPress={() => setEditing(null)} style={{ paddingHorizontal: 16 }}>Cancel</Btn>
              </View>
            </Card>
          )}

          {editing !== 'new' && (
            <Btn full outline onPress={() => openEdit(null)}>+ Add a block</Btn>
          )}

          <TouchableOpacity onPress={resetBlocks} style={{ marginTop: 14, alignItems: 'center' }}>
            <Text style={{ color: COLORS.t3, fontSize: 11 }}>Reset to default blocks</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── INSIGHTS ─── */}
      {tab === 2 && (
        <View>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <Card style={{ flex: 1, padding: 12, marginBottom: 0 }}>
              <Text style={{ color: COLORS.t3, fontSize: 10 }}>Focus hours</Text>
              <Text style={{ fontSize: 24, fontWeight: '700', color: COLORS.t1 }}>{(totalMinutes / 60).toFixed(1)}</Text>
              <Text style={{ color: COLORS.t3, fontSize: 10 }}>{sessions.length} blocks logged</Text>
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
                No blocks logged today
              </Text>
            ) : todaySessions.map(ses => (
              <View key={ses.id} style={s.sesRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.t1, fontSize: 12 }}>{ses.block}</Text>
                  <Text style={{ color: COLORS.t3, fontSize: 10 }}>
                    {ses.minutes}m of {ses.planned}m{ses.manual ? ' · marked manually' : ''}
                    {ses.distraction ? ` · ${ses.distraction}` : ''}
                  </Text>
                </View>
                <Badge text={ses.worked ? 'Full' : 'Partial'} color={ses.worked ? COLORS.primary : COLORS.warn} />
              </View>
            ))}
          </Card>

          <Card>
            <Text style={{ color: COLORS.t2, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Top distractions</Text>
            {topDistractions.length === 0 ? (
              <Text style={{ color: COLORS.t3, fontSize: 12, textAlign: 'center', padding: 12 }}>
                Nothing logged yet
              </Text>
            ) : topDistractions.map(([name, count], i) => (
              <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 6 }}>
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
  title: { fontSize: 20, fontWeight: '700', color: COLORS.t1, marginBottom: 2 },
  timerText: { fontSize: 36, fontWeight: '800', color: COLORS.t1, letterSpacing: -1 },
  label: { color: COLORS.t2, fontSize: 11, marginBottom: 5 },
  choiceBtn: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  tagBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  editBox: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border },
  swatch: { width: 32, height: 32, borderRadius: 10, borderWidth: 2, borderColor: 'transparent' },
  swatchActive: { borderColor: COLORS.t1 },
  sesRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
});
