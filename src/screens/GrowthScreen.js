import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import { Card, Badge, ProgressBar, Btn, Input, TabBar } from '../components/UI';
import { today } from '../utils/storage';
import { EARNING_FEES, NAIRA_RATE } from '../data/constants';

export default function GrowthScreen({ earnings, setEarnings, books, setBooks }) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState(0);
  const [addingE, setAddingE] = useState(false);
  const [addingB, setAddingB] = useState(false);
  const [bookDetail, setBookDetail] = useState(null);
  const [amt, setAmt] = useState('');
  const [plat, setPlat] = useState('Fiverr');
  const [bTitle, setBTitle] = useState('');
  const [bPages, setBPages] = useState('');

  const totalNet = earnings.reduce((s, e) => s + e.net, 0);
  const currentBook = books.find(b => b.started && !b.completed);

  const addEarning = () => {
    const g = parseFloat(amt);
    if (!g) return;
    const fee = g * EARNING_FEES[plat];
    setEarnings(prev => [...prev, { id: Date.now(), gross: g, fee, net: g - fee, platform: plat, date: today(), naira: Math.round((g - fee) * NAIRA_RATE) }]);
    setAmt(''); setAddingE(false);
  };

  const addBook = () => {
    if (!bTitle.trim() || !bPages) return;
    setBooks(prev => [...prev, { id: Date.now(), title: bTitle.trim(), totalPages: parseInt(bPages), currentPage: 0, started: null, completed: false }]);
    setBTitle(''); setBPages(''); setAddingB(false);
  };

  if (bookDetail) {
    const bk = books.find(b => b.id === bookDetail);
    if (!bk) { setBookDetail(null); return null; }
    return (
      <ScrollView style={[s.container, { paddingTop: 12 }]} contentContainerStyle={{ paddingBottom: 100 }}>
        <TouchableOpacity onPress={() => setBookDetail(null)}><Text style={s.back}>← Back</Text></TouchableOpacity>
        <Card glow={COLORS.accent}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.t1 }}>{bk.title}</Text>
          <Text style={{ color: COLORS.t3, fontSize: 11, marginTop: 4 }}>{bk.currentPage} / {bk.totalPages} pages ({Math.round((bk.currentPage / bk.totalPages) * 100)}%)</Text>
          <ProgressBar value={bk.currentPage} max={bk.totalPages} color={COLORS.accent} height={6} />
        </Card>
        <Card>
          <Text style={s.sectionTitle}>Log reading</Text>
          <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 8 }}>Target: page {Math.min(bk.totalPages, bk.currentPage + 15)}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[5, 10, 15, 25].map(n => (
              <Btn key={n} outline full onPress={() => setBooks(prev => prev.map(b => b.id === bk.id ? { ...b, currentPage: Math.min(b.totalPages, b.currentPage + n), started: b.started || today(), completed: b.currentPage + n >= b.totalPages } : b))}>+{n}</Btn>
            ))}
          </View>
        </Card>
        {bk.completed && <Card glow={COLORS.primary}><Text style={{ textAlign: 'center', color: COLORS.primary, fontWeight: '600' }}>🎉 Completed!</Text></Card>}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[s.container, { paddingTop: 12 }]} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={s.title}>Growth Hub</Text>
      <TabBar tabs={['Money', 'Books']} active={mode} onChange={setMode} />

      {mode === 0 && (
        <View>
          <Card glow={COLORS.primary}>
            <Text style={{ color: COLORS.t3, fontSize: 10 }}>Net freelance income</Text>
            <Text style={{ fontSize: 28, fontWeight: '800', color: COLORS.t1 }}>${totalNet.toFixed(2)}</Text>
            <Text style={{ color: COLORS.t3, fontSize: 11 }}>₦{Math.round(totalNet * NAIRA_RATE).toLocaleString()}</Text>
          </Card>
          <Btn full onPress={() => setAddingE(true)} style={{ marginBottom: 12 }}>+ Log income</Btn>
          {addingE && (
            <Card style={{ borderColor: COLORS.primary + '44' }}>
              <Input value={amt} onChangeText={setAmt} placeholder="Amount USD" keyboardType="numeric" />
              <View style={{ height: 8 }} />
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                {['Fiverr', 'Upwork', 'Direct'].map(p => (
                  <TouchableOpacity key={p} onPress={() => setPlat(p)} style={[s.platBtn, plat === p && s.platActive]}>
                    <Text style={{ color: plat === p ? COLORS.primary : COLORS.t3, fontSize: 10 }}>{p} ({Math.round(EARNING_FEES[p] * 100)}%)</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {amt ? <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 8 }}>Net: ${(parseFloat(amt || 0) * (1 - EARNING_FEES[plat])).toFixed(2)}</Text> : null}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn full onPress={addEarning}>Save</Btn>
                <Btn full outline onPress={() => setAddingE(false)}>Cancel</Btn>
              </View>
            </Card>
          )}
          {earnings.slice().reverse().slice(0, 5).map(e => (
            <Card key={e.id} style={{ padding: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ color: COLORS.t1, fontSize: 14, fontWeight: '600' }}>${e.net.toFixed(2)}</Text>
                  <Text style={{ color: COLORS.t3, fontSize: 10 }}>{e.platform} · {e.date}</Text>
                </View>
                <Text style={{ color: COLORS.primary, fontSize: 12 }}>₦{e.naira?.toLocaleString()}</Text>
              </View>
            </Card>
          ))}
        </View>
      )}

      {mode === 1 && (
        <View>
          {currentBook && (
            <Card glow={COLORS.accent} onPress={() => setBookDetail(currentBook.id)}>
              <Text style={{ color: COLORS.t3, fontSize: 10 }}>CURRENT BOOK</Text>
              <Text style={{ color: COLORS.t1, fontSize: 14, fontWeight: '600' }}>{currentBook.title}</Text>
              <Text style={{ color: COLORS.t3, fontSize: 10, marginTop: 4 }}>{currentBook.currentPage} / {currentBook.totalPages}</Text>
              <ProgressBar value={currentBook.currentPage} max={currentBook.totalPages} color={COLORS.accent} height={6} />
            </Card>
          )}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <Card style={{ flex: 1, padding: 12, marginBottom: 0 }}>
              <Text style={{ color: COLORS.t3, fontSize: 10 }}>Pages today</Text>
              <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.t1 }}>0 / 15</Text>
            </Card>
            <Card style={{ flex: 1, padding: 12, marginBottom: 0 }}>
              <Text style={{ color: COLORS.t3, fontSize: 10 }}>Streak</Text>
              <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.primary }}>0 days</Text>
            </Card>
          </View>
          <Card>
            <Text style={s.sectionTitle}>Bookshelf</Text>
            {books.map(bk => (
              <TouchableOpacity key={bk.id} onPress={() => setBookDetail(bk.id)} style={s.bookRow}>
                <View style={[s.bookIcon, { backgroundColor: bk.completed ? COLORS.primary + '22' : COLORS.accent + '22' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: bk.completed ? COLORS.primary : COLORS.accent }}>{bk.title[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.t1, fontSize: 12 }}>{bk.title}</Text>
                  <Text style={{ color: COLORS.t3, fontSize: 10 }}>{bk.completed ? 'Completed ✓' : bk.started ? Math.round((bk.currentPage / bk.totalPages) * 100) + '%' : bk.totalPages + ' pages'}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {books.length === 0 && <Text style={s.empty}>Register your first book</Text>}
          </Card>
          <Btn full outline onPress={() => setAddingB(true)}>+ Register a book</Btn>
          {addingB && (
            <Card style={{ marginTop: 12, borderColor: COLORS.accent + '44' }}>
              <Input value={bTitle} onChangeText={setBTitle} placeholder="Book title" />
              <View style={{ height: 8 }} />
              <Input value={bPages} onChangeText={setBPages} placeholder="Total pages" keyboardType="numeric" />
              <View style={{ height: 8 }} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn full color={COLORS.accent} onPress={addBook}>Save</Btn>
                <Btn full outline onPress={() => setAddingB(false)}>Cancel</Btn>
              </View>
            </Card>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.t1, marginBottom: 4 },
  back: { color: COLORS.t2, fontSize: 13, marginBottom: 16 },
  sectionTitle: { color: COLORS.t2, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  platBtn: { flex: 1, height: 36, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  platActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '22' },
  bookRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  bookIcon: { width: 28, height: 36, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  empty: { color: COLORS.t3, fontSize: 12, textAlign: 'center', padding: 16 },
});