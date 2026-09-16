import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import { Card, Badge, ProgressBar, Btn, Input, TabBar } from '../components/UI';
import { today, getData, setData } from '../utils/storage';
import { CURRENCIES, currencyByCode, PLATFORM_FEES } from '../data/constants';

export default function GrowthScreen({ earnings, setEarnings, books, setBooks }) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState(0);
  const [addingE, setAddingE] = useState(false);
  const [addingB, setAddingB] = useState(false);
  const [bookDetail, setBookDetail] = useState(null);
  const [showRates, setShowRates] = useState(false);

  const [amt, setAmt] = useState('');
  const [curr, setCurr] = useState('USD');
  const [plat, setPlat] = useState('Fiverr');
  const [client, setClient] = useState('');
  const [rates, setRates] = useState({});

  const [bTitle, setBTitle] = useState('');
  const [bPages, setBPages] = useState('');
  const [logPage, setLogPage] = useState('');

  useEffect(() => {
    getData('fxRates').then(r => {
      if (r) setRates(r);
      else {
        const def = {};
        CURRENCIES.forEach(c => { def[c.code] = c.defaultRate; });
        setRates(def);
        setData('fxRates', def);
      }
    });
  }, []);

  const rateFor = (code) => rates[code] ?? currencyByCode(code).defaultRate;

  const addEarning = () => {
    const gross = parseFloat(amt);
    if (!gross || gross <= 0) return;
    const feePct = PLATFORM_FEES[plat] ?? 0;
    const fee = gross * feePct;
    const net = gross - fee;
    const naira = Math.round(net * rateFor(curr));
    setEarnings(prev => [...(prev || []), {
      id: Date.now(), gross, fee, net, currency: curr, platform: plat,
      client: client.trim() || plat, date: today(), naira, rate: rateFor(curr),
    }]);
    setAmt(''); setClient(''); setAddingE(false);
  };

  const updateRate = (code, value) => {
    const v = parseFloat(value);
    if (isNaN(v) || v <= 0) return;
    const next = { ...rates, [code]: v };
    setRates(next);
    setData('fxRates', next);
  };

  // Totals are in Naira because that is the only common denominator
  const totalNaira = (earnings || []).reduce((s, e) => s + (e.naira || 0), 0);
  const thisMonth = (earnings || []).filter(e => e.date.slice(0, 7) === today().slice(0, 7));
  const monthNaira = thisMonth.reduce((s, e) => s + (e.naira || 0), 0);

  // Breakdown per currency
  const byCurrency = {};
  (earnings || []).forEach(e => {
    const c = e.currency || 'USD';
    byCurrency[c] = (byCurrency[c] || 0) + e.net;
  });

  const currentBook = (books || []).find(b => b.started && !b.completed);

  const addBook = () => {
    if (!bTitle.trim() || !bPages) return;
    setBooks(prev => [...(prev || []), {
      id: Date.now(), title: bTitle.trim(), totalPages: parseInt(bPages),
      currentPage: 0, started: null, completed: false,
    }]);
    setBTitle(''); setBPages(''); setAddingB(false);
  };

  const advanceBook = (id, pages) => {
    setBooks(prev => prev.map(b => b.id === id ? {
      ...b,
      currentPage: Math.min(b.totalPages, b.currentPage + pages),
      started: b.started || today(),
      completed: b.currentPage + pages >= b.totalPages,
      lastRead: today(),
    } : b));
  };

  // ─── BOOK DETAIL ───
  if (bookDetail) {
    const bk = (books || []).find(b => b.id === bookDetail);
    if (!bk) { setBookDetail(null); return null; }
    const pct = Math.round((bk.currentPage / bk.totalPages) * 100);
    return (
      <ScrollView style={[s.container, { paddingTop: 12 }]} contentContainerStyle={{ paddingBottom: 100 }}>
        <TouchableOpacity onPress={() => setBookDetail(null)}><Text style={s.back}>← Back</Text></TouchableOpacity>
        <Card glow={COLORS.accent}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.t1 }}>{bk.title}</Text>
          <Text style={{ color: COLORS.t3, fontSize: 11, marginTop: 4 }}>
            Page {bk.currentPage} of {bk.totalPages} · {pct}%
          </Text>
          <ProgressBar value={bk.currentPage} max={bk.totalPages} color={COLORS.accent} height={6} />
        </Card>
        <Card>
          <Text style={s.sectionTitle}>Log today's reading</Text>
          <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 10 }}>
            Target: reach page {Math.min(bk.totalPages, bk.currentPage + 15)}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            <View style={{ flex: 1 }}>
              <Input value={logPage} onChangeText={setLogPage} placeholder="Page you reached" keyboardType="numeric" />
            </View>
            <Btn onPress={() => {
              const v = parseInt(logPage);
              if (v > bk.currentPage) {
                advanceBook(bk.id, v - bk.currentPage);
                setLogPage('');
              }
            }}>Set</Btn>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[5, 10, 15, 25].map(n => (
              <Btn key={n} outline full onPress={() => advanceBook(bk.id, n)} style={{ height: 34 }}>+{n}</Btn>
            ))}
          </View>
        </Card>
        {bk.completed && (
          <Card glow={COLORS.primary} style={{ alignItems: 'center', padding: 20 }}>
            <Text style={{ fontSize: 26 }}>🎉</Text>
            <Text style={{ color: COLORS.primary, fontWeight: '600', marginTop: 6 }}>Book completed</Text>
          </Card>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[s.container, { paddingTop: 12 }]} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={s.title}>Earnings & Reading</Text>
      <TabBar tabs={['Income', 'Books']} active={mode} onChange={setMode} />

      {/* ─── INCOME ─── */}
      {mode === 0 && (
        <View>
          <Card glow={COLORS.primary}>
            <Text style={{ color: COLORS.t3, fontSize: 10 }}>TOTAL EARNED (all currencies)</Text>
            <Text style={{ fontSize: 28, fontWeight: '800', color: COLORS.t1 }}>
              ₦{totalNaira.toLocaleString()}
            </Text>
            <Text style={{ color: COLORS.t3, fontSize: 11, marginTop: 2 }}>
              ₦{monthNaira.toLocaleString()} this month
            </Text>
            {Object.keys(byCurrency).length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {Object.entries(byCurrency).map(([code, val]) => (
                  <View key={code} style={s.currPill}>
                    <Text style={{ color: COLORS.t2, fontSize: 11 }}>
                      {currencyByCode(code).symbol}{val.toFixed(2)} {code}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Card>

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <Btn full onPress={() => setAddingE(true)}>+ Log income</Btn>
            <Btn outline onPress={() => setShowRates(!showRates)}>Rates</Btn>
          </View>

          {/* Exchange rates editor */}
          {showRates && (
            <Card style={{ borderColor: COLORS.warn + '44' }}>
              <Text style={s.sectionTitle}>Exchange rates to Naira</Text>
              <Text style={{ color: COLORS.t3, fontSize: 10, marginBottom: 10 }}>
                Update these as the market moves. Past entries keep the rate they were saved at.
              </Text>
              {CURRENCIES.filter(c => c.code !== 'NGN').map(c => (
                <View key={c.code} style={s.rateRow}>
                  <Text style={{ color: COLORS.t2, fontSize: 12, width: 56 }}>{c.symbol} {c.code}</Text>
                  <View style={{ flex: 1 }}>
                    <Input
                      value={String(rates[c.code] ?? c.defaultRate)}
                      onChangeText={(v) => updateRate(c.code, v)}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              ))}
            </Card>
          )}

          {addingE && (
            <Card style={{ borderColor: COLORS.primary + '44' }}>
              <Text style={{ color: COLORS.t2, fontSize: 12, marginBottom: 6 }}>Currency</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {CURRENCIES.map(c => (
                  <TouchableOpacity key={c.code} onPress={() => setCurr(c.code)}
                    style={[s.tag, curr === c.code && { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '22' }]}>
                    <Text style={{ color: curr === c.code ? COLORS.primary : COLORS.t3, fontSize: 11 }}>
                      {c.symbol} {c.code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input value={amt} onChangeText={setAmt}
                placeholder={`Amount in ${curr}`} keyboardType="numeric" />
              <View style={{ height: 10 }} />

              <Text style={{ color: COLORS.t2, fontSize: 12, marginBottom: 6 }}>Platform</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                {['Fiverr', 'Upwork', 'Direct', 'Other'].map(p => (
                  <TouchableOpacity key={p} onPress={() => setPlat(p)}
                    style={[s.tag, { flex: 1, alignItems: 'center' }, plat === p && { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '22' }]}>
                    <Text style={{ color: plat === p ? COLORS.primary : COLORS.t3, fontSize: 10 }}>
                      {p} {Math.round((PLATFORM_FEES[p] ?? 0) * 100)}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input value={client} onChangeText={setClient} placeholder="Client or project (optional)" />

              {amt && !isNaN(parseFloat(amt)) && (
                <View style={{ marginTop: 10, padding: 10, backgroundColor: COLORS.bg, borderRadius: 8 }}>
                  <Text style={{ color: COLORS.t3, fontSize: 11 }}>
                    Fee: {currencyByCode(curr).symbol}{(parseFloat(amt) * (PLATFORM_FEES[plat] ?? 0)).toFixed(2)}
                  </Text>
                  <Text style={{ color: COLORS.t1, fontSize: 13, fontWeight: '600', marginTop: 2 }}>
                    Net: {currencyByCode(curr).symbol}{(parseFloat(amt) * (1 - (PLATFORM_FEES[plat] ?? 0))).toFixed(2)}
                  </Text>
                  <Text style={{ color: COLORS.primary, fontSize: 12, marginTop: 2 }}>
                    ₦{Math.round(parseFloat(amt) * (1 - (PLATFORM_FEES[plat] ?? 0)) * rateFor(curr)).toLocaleString()} at ₦{rateFor(curr)}/{curr}
                  </Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <Btn full onPress={addEarning}>Save</Btn>
                <Btn full outline onPress={() => setAddingE(false)}>Cancel</Btn>
              </View>
            </Card>
          )}

          {(earnings || []).slice().reverse().slice(0, 12).map(e => (
            <Card key={e.id} style={{ padding: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.t1, fontSize: 15, fontWeight: '600' }}>
                    {currencyByCode(e.currency || 'USD').symbol}{e.net.toFixed(2)}
                    <Text style={{ color: COLORS.t3, fontSize: 11 }}> {e.currency || 'USD'}</Text>
                  </Text>
                  <Text style={{ color: COLORS.t3, fontSize: 10 }}>
                    {e.client} · {e.platform} · {e.date}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: COLORS.primary, fontSize: 13 }}>₦{(e.naira || 0).toLocaleString()}</Text>
                  {e.fee > 0 && (
                    <Text style={{ color: COLORS.danger, fontSize: 9 }}>
                      −{currencyByCode(e.currency || 'USD').symbol}{e.fee.toFixed(2)} fee
                    </Text>
                  )}
                </View>
              </View>
            </Card>
          ))}

          {(earnings || []).length === 0 && !addingE && (
            <Card style={{ alignItems: 'center', padding: 26 }}>
              <Text style={{ fontSize: 26, marginBottom: 8 }}>📈</Text>
              <Text style={{ color: COLORS.t2, fontSize: 13 }}>No income logged yet</Text>
              <Text style={{ color: COLORS.t3, fontSize: 11, marginTop: 4 }}>
                Log in any currency — totals convert to Naira
              </Text>
            </Card>
          )}
        </View>
      )}

      {/* ─── BOOKS ─── */}
      {mode === 1 && (
        <View>
          {currentBook && (
            <Card glow={COLORS.accent} onPress={() => setBookDetail(currentBook.id)}>
              <Text style={{ color: COLORS.t3, fontSize: 10 }}>CURRENTLY READING</Text>
              <Text style={{ color: COLORS.t1, fontSize: 15, fontWeight: '600', marginTop: 2 }}>
                {currentBook.title}
              </Text>
              <Text style={{ color: COLORS.t3, fontSize: 10, marginTop: 4 }}>
                Page {currentBook.currentPage} of {currentBook.totalPages}
              </Text>
              <ProgressBar value={currentBook.currentPage} max={currentBook.totalPages} color={COLORS.accent} height={6} />
            </Card>
          )}

          <Card>
            <Text style={s.sectionTitle}>Bookshelf</Text>
            {(books || []).map(bk => (
              <TouchableOpacity key={bk.id} onPress={() => setBookDetail(bk.id)} style={s.bookRow}>
                <View style={[s.bookIcon, { backgroundColor: bk.completed ? COLORS.primary + '22' : COLORS.accent + '22' }]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: bk.completed ? COLORS.primary : COLORS.accent }}>
                    {bk.title[0]}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.t1, fontSize: 12 }}>{bk.title}</Text>
                  <Text style={{ color: COLORS.t3, fontSize: 10 }}>
                    {bk.completed ? 'Completed ✓'
                      : bk.started ? `${Math.round((bk.currentPage / bk.totalPages) * 100)}% · page ${bk.currentPage}`
                      : `Not started · ${bk.totalPages} pages`}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            {(books || []).length === 0 && (
              <Text style={{ color: COLORS.t3, fontSize: 12, textAlign: 'center', padding: 16 }}>
                Register your first book
              </Text>
            )}
          </Card>

          <Btn full outline onPress={() => setAddingB(true)}>+ Register a book</Btn>

          {addingB && (
            <Card style={{ marginTop: 12, borderColor: COLORS.accent + '44' }}>
              <Input value={bTitle} onChangeText={setBTitle} placeholder="Book title" />
              <View style={{ height: 8 }} />
              <Input value={bPages} onChangeText={setBPages} placeholder="Total pages" keyboardType="numeric" />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
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
  title: { fontSize: 20, fontWeight: '700', color: COLORS.t1, marginBottom: 8 },
  back: { color: COLORS.t2, fontSize: 13, marginBottom: 14 },
  sectionTitle: { color: COLORS.t2, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  currPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: COLORS.bg },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  bookRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  bookIcon: { width: 30, height: 38, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
});
