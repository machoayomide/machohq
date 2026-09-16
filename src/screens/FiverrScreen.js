import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import { askClaude } from '../utils/ai';
import { Card, Badge, Btn, Input, TabBar, Ring } from '../components/UI';
import { today } from '../utils/storage';

export default function FiverrScreen({ accounts, setAccounts, gigs, setGigs }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(0);
  const [detail, setDetail] = useState(null);
  const [adding, setAdding] = useState(false);
  const [addingGig, setAddingGig] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState(null);

  const [username, setUsername] = useState('');
  const [country, setCountry] = useState('');
  const [niche, setNiche] = useState('');
  const [email, setEmail] = useState('');
  const [gigTitle, setGigTitle] = useState('');
  const [gigPrice, setGigPrice] = useState('');

  const addAccount = () => {
    if (!username.trim()) return;
    setAccounts(prev => [...prev, {
      id: Date.now(), username: username.trim(), country, niche, email, reviews: 0, added: today()
    }]);
    setUsername(''); setCountry(''); setNiche(''); setEmail(''); setAdding(false);
  };

  const addGig = (accountId) => {
    if (!gigTitle.trim()) return;
    setGigs(prev => [...prev, {
      id: Date.now(), title: gigTitle.trim(), price: gigPrice, accountId: String(accountId),
      impressions: 0, clicks: 0, orders: 0, health: 75, added: today()
    }]);
    setGigTitle(''); setGigPrice(''); setAddingGig(false);
  };

  const auditGig = async (gig) => {
    setAuditing(true); setAuditResult(null);
    const result = await askClaude(`You are a Fiverr gig optimization expert. Search the web for what is currently working on Fiverr in this niche, then audit this gig.

Gig: "${gig.title}"
Price: $${gig.price || 'not set'}
Stats: ${gig.impressions} impressions, ${gig.clicks} clicks, ${gig.orders} orders

Give 3-5 specific changes. For each: what to change, why, and where you found the evidence. Use only current information. Under 250 words.`, { maxTokens: 1000, webSearch: true });

    setAuditResult(result.ok ? result.text : result.error);
    setAuditing(false);
  };

  // Account detail
  if (detail) {
    const acc = accounts.find(a => a.id === detail);
    if (!acc) { setDetail(null); return null; }
    const accGigs = gigs.filter(g => g.accountId === String(acc.id));

    return (
      <ScrollView style={[s.container, { paddingTop: insets.top + 12 }]} contentContainerStyle={{ paddingBottom: 100 }}>
        <TouchableOpacity onPress={() => { setDetail(null); setAuditResult(null); }}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>

        <Card glow={COLORS.blue}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.t1 }}>{acc.username}</Text>
          <Text style={{ color: COLORS.t3, fontSize: 11, marginTop: 2 }}>{acc.country} · {acc.niche} · {acc.reviews} reviews</Text>
          <Text style={{ color: COLORS.t3, fontSize: 10 }}>Added {acc.added}</Text>
        </Card>

        <Text style={s.sectionTitle}>Gigs ({accGigs.length})</Text>
        {accGigs.map(g => (
          <Card key={g.id} style={{ padding: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: COLORS.t1, fontSize: 13, fontWeight: '600', flex: 1 }}>{g.title}</Text>
              <Badge text={g.health >= 70 ? 'Healthy' : g.health >= 40 ? 'Warning' : 'Low'} color={g.health >= 70 ? COLORS.primary : g.health >= 40 ? COLORS.warn : COLORS.danger} />
            </View>
            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 10 }}>
              <View><Text style={{ color: COLORS.t3, fontSize: 9 }}>Impressions</Text><Text style={{ color: COLORS.t1, fontSize: 14, fontWeight: '600' }}>{g.impressions}</Text></View>
              <View><Text style={{ color: COLORS.t3, fontSize: 9 }}>Clicks</Text><Text style={{ color: COLORS.t1, fontSize: 14, fontWeight: '600' }}>{g.clicks}</Text></View>
              <View><Text style={{ color: COLORS.t3, fontSize: 9 }}>Orders</Text><Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '600' }}>{g.orders}</Text></View>
              <View><Text style={{ color: COLORS.t3, fontSize: 9 }}>Price</Text><Text style={{ color: COLORS.t1, fontSize: 14, fontWeight: '600' }}>${g.price || '—'}</Text></View>
            </View>
            <Btn full outline onPress={() => auditGig(g)} style={{ height: 36 }}>
              {auditing ? 'Auditing...' : '🔍 AI Audit this gig'}
            </Btn>
          </Card>
        ))}

        {auditResult && (
          <Card glow={COLORS.primary}>
            <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>AI Audit Result</Text>
            <Text style={{ color: COLORS.t1, fontSize: 12, lineHeight: 20 }}>{auditResult}</Text>
          </Card>
        )}

        {accGigs.length === 0 && (
          <Card style={{ alignItems: 'center', padding: 20 }}>
            <Text style={{ color: COLORS.t3, fontSize: 12 }}>No gigs logged for this account</Text>
          </Card>
        )}

        <Btn full outline onPress={() => setAddingGig(true)}>+ Add gig to {acc.username}</Btn>

        {addingGig && (
          <Card style={{ marginTop: 12, borderColor: COLORS.blue + '44' }}>
            <Input value={gigTitle} onChangeText={setGigTitle} placeholder="Gig title" />
            <View style={{ height: 8 }} />
            <Input value={gigPrice} onChangeText={setGigPrice} placeholder="Starting price ($)" keyboardType="numeric" />
            <View style={{ height: 8 }} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Btn full color={COLORS.blue} onPress={() => addGig(acc.id)}>Save</Btn>
              <Btn full outline onPress={() => setAddingGig(false)}>Cancel</Btn>
            </View>
          </Card>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[s.container, { paddingTop: insets.top + 12 }]} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={s.title}>Fiverr Hub</Text>
      <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 16 }}>
        {accounts.length} accounts · {gigs.length} gigs tracked
      </Text>
      <TabBar tabs={['Accounts', 'Gig Health']} active={tab} onChange={setTab} />

      {tab === 0 && (
        <View>
          <Btn full onPress={() => setAdding(true)} style={{ marginBottom: 12 }}>+ Add account</Btn>

          {adding && (
            <Card style={{ borderColor: COLORS.blue + '44' }}>
              <Input value={username} onChangeText={setUsername} placeholder="Fiverr username" />
              <View style={{ height: 8 }} />
              <Input value={country} onChangeText={setCountry} placeholder="Country" />
              <View style={{ height: 8 }} />
              <Input value={niche} onChangeText={setNiche} placeholder="Niche (e.g. Shopify, AI, Flutter)" />
              <View style={{ height: 8 }} />
              <Input value={email} onChangeText={setEmail} placeholder="Email" />
              <View style={{ height: 8 }} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn full color={COLORS.blue} onPress={addAccount}>Save</Btn>
                <Btn full outline onPress={() => setAdding(false)}>Cancel</Btn>
              </View>
            </Card>
          )}

          {accounts.map(a => {
            const gigCount = gigs.filter(g => g.accountId === String(a.id)).length;
            return (
              <Card key={a.id} onPress={() => setDetail(a.id)} style={{ padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={s.avatar}>
                    <Text style={{ color: COLORS.blue, fontWeight: '700', fontSize: 16 }}>{a.username[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: COLORS.t1, fontSize: 14, fontWeight: '600' }}>{a.username}</Text>
                    <Text style={{ color: COLORS.t3, fontSize: 10 }}>{a.country} · {a.niche} · {gigCount} gigs</Text>
                  </View>
                  <Text style={{ color: COLORS.t3, fontSize: 16 }}>›</Text>
                </View>
              </Card>
            );
          })}

          {accounts.length === 0 && (
            <Card style={{ alignItems: 'center', padding: 32 }}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>💼</Text>
              <Text style={{ color: COLORS.t2, fontSize: 13 }}>Add your first Fiverr account</Text>
              <Text style={{ color: COLORS.t3, fontSize: 11, marginTop: 4 }}>Track all 20+ accounts in one place</Text>
            </Card>
          )}
        </View>
      )}

      {tab === 1 && (
        <View>
          {gigs.length === 0 && (
            <Card style={{ alignItems: 'center', padding: 24 }}>
              <Text style={{ color: COLORS.t3, fontSize: 12 }}>Add gigs to your accounts first</Text>
            </Card>
          )}
          {gigs.sort((a, b) => a.health - b.health).map(g => {
            const acc = accounts.find(a => String(a.id) === g.accountId);
            return (
              <Card key={g.id} style={{ padding: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: COLORS.t1, fontSize: 13, fontWeight: '600' }}>{g.title}</Text>
                    <Text style={{ color: COLORS.t3, fontSize: 10 }}>{acc?.username || 'Unknown'}</Text>
                  </View>
                  <Ring value={g.health} max={100} size={40} strokeWidth={4} color={g.health >= 70 ? COLORS.primary : g.health >= 40 ? COLORS.warn : COLORS.danger}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: g.health >= 70 ? COLORS.primary : g.health >= 40 ? COLORS.warn : COLORS.danger }}>{g.health}</Text>
                  </Ring>
                </View>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <Text style={{ color: COLORS.t3, fontSize: 10 }}>Impr: <Text style={{ color: COLORS.t1 }}>{g.impressions}</Text></Text>
                  <Text style={{ color: COLORS.t3, fontSize: 10 }}>Clicks: <Text style={{ color: COLORS.t1 }}>{g.clicks}</Text></Text>
                  <Text style={{ color: COLORS.t3, fontSize: 10 }}>Orders: <Text style={{ color: COLORS.primary }}>{g.orders}</Text></Text>
                </View>
              </Card>
            );
          })}
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
  avatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: COLORS.blue + '22', alignItems: 'center', justifyContent: 'center' },
});