import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Share, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import { Card, Badge, Btn, Input } from '../components/UI';
import { getData, setData, removeData } from '../utils/storage';
import { requestPermissions, cancelAll, scheduleDaily } from '../utils/notifications';
import { getBookCount, listBooks } from '../utils/knowledge';

export default function SettingsScreen({ team, prospects, earnings, spending, books, accounts, gigs, journal, data, onBack }) {
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState(null);
  const [newPin, setNewPin] = useState('');
  const [notifsOn, setNotifsOn] = useState(true);
  const [showBooks, setShowBooks] = useState(false);

  useEffect(() => {
    getData('notifsEnabled').then(v => { if (v !== null) setNotifsOn(v); });
  }, []);

  const toggleNotifs = async (val) => {
    setNotifsOn(val);
    await setData('notifsEnabled', val);
    if (val) {
      const ok = await requestPermissions();
      if (ok) {
        await scheduleDaily('Morning attack plan', 'Check who needs you today.', 7, 0);
        await scheduleDaily('Midday PV check', 'How many people have you contacted?', 13, 0);
        await scheduleDaily('Reading time', '15 pages. Pick up the book.', 20, 30);
        await scheduleDaily('No Excuses Journal', 'What went right today?', 22, 0);
      }
    } else {
      await cancelAll();
    }
  };

  const changePin = async () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      Alert.alert('Invalid PIN', 'PIN must be exactly 4 digits.');
      return;
    }
    await setData('pin', newPin);
    setNewPin('');
    setSection(null);
    Alert.alert('PIN updated', 'Your new PIN takes effect next time you open the app.');
  };

  const exportData = async () => {
    const payload = {
      exported: new Date().toISOString(),
      appData: data, team, prospects, earnings, spending, books, accounts, gigs, journal,
    };
    try {
      await Share.share({
        message: JSON.stringify(payload, null, 2),
        title: 'MachoHQ Backup',
      });
    } catch {}
  };

  const resetAll = () => {
    Alert.alert(
      'Erase everything?',
      'This deletes your team, prospects, earnings, books, and all history. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase',
          style: 'destructive',
          onPress: async () => {
            const keys = ['appData', 'team', 'prospects', 'earnings', 'spending', 'books',
              'fiverrAccounts', 'fiverrGigs', 'journal', 'focusSessions', 'activeTimer',
              'dailyRemindersSet'];
            for (const k of keys) await removeData(k);
            await cancelAll();
            Alert.alert('Erased', 'Close and reopen the app.');
          },
        },
      ]
    );
  };

  const stats = [
    { label: 'Team members', value: (team || []).length },
    { label: 'Prospects', value: (prospects || []).length },
    { label: 'Fiverr accounts', value: (accounts || []).length },
    { label: 'Gigs tracked', value: (gigs || []).length },
    { label: 'Books registered', value: (books || []).length },
    { label: 'Journal entries', value: (journal || []).length },
    { label: 'Earnings logged', value: (earnings || []).length },
    { label: 'Expenses logged', value: (spending || []).length },
  ];

  const Row = ({ icon, label, sub, onPress, right }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.7 : 1} style={s.row}>
      <View style={s.rowIcon}><Text style={{ fontSize: 16 }}>{icon}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: COLORS.t1, fontSize: 13 }}>{label}</Text>
        {sub ? <Text style={{ color: COLORS.t3, fontSize: 10, marginTop: 1 }}>{sub}</Text> : null}
      </View>
      {right || (onPress ? <Text style={{ color: COLORS.t3, fontSize: 16 }}>›</Text> : null)}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={[s.container, { paddingTop: 12 }]} contentContainerStyle={{ paddingBottom: 100 }}>
      {onBack && (
        <TouchableOpacity onPress={onBack}>
          <Text style={{ color: COLORS.t2, fontSize: 13, marginBottom: 12 }}>← Back</Text>
        </TouchableOpacity>
      )}
      <Text style={s.title}>Settings</Text>
      <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 16 }}>MachoHQ v1.6 · Machotech</Text>

      {/* Security */}
      <Text style={s.sectionLabel}>SECURITY</Text>
      <Card style={{ padding: 4 }}>
        <Row icon="🔒" label="Change PIN" sub="4-digit unlock code"
          onPress={() => setSection(section === 'pin' ? null : 'pin')} />
        {section === 'pin' && (
          <View style={{ padding: 12, paddingTop: 0 }}>
            <Input value={newPin} onChangeText={setNewPin} placeholder="New 4-digit PIN" keyboardType="number-pad" />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Btn full onPress={changePin}>Save PIN</Btn>
              <Btn full outline onPress={() => { setSection(null); setNewPin(''); }}>Cancel</Btn>
            </View>
          </View>
        )}
      </Card>

      {/* Notifications */}
      <Text style={s.sectionLabel}>NOTIFICATIONS</Text>
      <Card style={{ padding: 4 }}>
        <Row icon="🔔" label="Daily reminders" sub="7am plan · 1pm PV · 8:30pm reading · 10pm journal"
          right={<Switch value={notifsOn} onValueChange={toggleNotifs}
            trackColor={{ false: COLORS.border, true: COLORS.primary + '66' }}
            thumbColor={notifsOn ? COLORS.primary : COLORS.t3} />} />
        <Row icon="⏱" label="Focus block alerts" sub="Fires when a block ends, even if app is closed"
          right={<Badge text="Always on" color={COLORS.primary} />} />
      </Card>

      {/* AI */}
      <Text style={s.sectionLabel}>AI KNOWLEDGE</Text>
      <Card style={{ padding: 4 }}>
        <Row icon="📚" label={`${getBookCount()} books loaded`}
          sub="AI draws from these when advising"
          onPress={() => setShowBooks(!showBooks)} />
        {showBooks && (
          <View style={{ padding: 12, paddingTop: 0, maxHeight: 260 }}>
            <ScrollView>
              {listBooks().map((b, i) => (
                <Text key={i} style={{ color: COLORS.t3, fontSize: 11, paddingVertical: 3 }}>
                  • {b.title}
                </Text>
              ))}
            </ScrollView>
          </View>
        )}
      </Card>

      {/* Director Challenge */}
      <Text style={s.sectionLabel}>DIRECTOR CHALLENGE</Text>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
          <Text style={{ color: COLORS.t2, fontSize: 12 }}>Start</Text>
          <Text style={{ color: COLORS.t1, fontSize: 12, fontWeight: '600' }}>September 2026</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
          <Text style={{ color: COLORS.t2, fontSize: 12 }}>Target date</Text>
          <Text style={{ color: COLORS.t1, fontSize: 12, fontWeight: '600' }}>28 February 2027</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
          <Text style={{ color: COLORS.t2, fontSize: 12 }}>Current QPV</Text>
          <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '600' }}>{data?.qpv || 0}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
          <Text style={{ color: COLORS.t2, fontSize: 12 }}>Final target</Text>
          <Text style={{ color: COLORS.t1, fontSize: 12, fontWeight: '600' }}>4,000 QPV</Text>
        </View>
      </Card>

      {/* Your data */}
      <Text style={s.sectionLabel}>YOUR DATA</Text>
      <Card>
        {stats.map((st, i) => (
          <View key={i} style={[s.statRow, i < stats.length - 1 && { borderBottomWidth: 1, borderBottomColor: COLORS.border }]}>
            <Text style={{ color: COLORS.t2, fontSize: 12 }}>{st.label}</Text>
            <Text style={{ color: COLORS.t1, fontSize: 13, fontWeight: '600' }}>{st.value}</Text>
          </View>
        ))}
      </Card>

      <Card style={{ padding: 4 }}>
        <Row icon="📤" label="Export backup" sub="Share all your data as JSON" onPress={exportData} />
        <Row icon="🗑" label="Erase everything" sub="Delete all data permanently" onPress={resetAll} />
      </Card>

      <Card style={{ alignItems: 'center', padding: 20 }}>
        <Text style={{ color: COLORS.primary, fontSize: 16, fontWeight: '800' }}>MachoHQ</Text>
        <Text style={{ color: COLORS.t3, fontSize: 11, marginTop: 2 }}>Your Operating System</Text>
        <Text style={{ color: COLORS.t3, fontSize: 10, marginTop: 8 }}>Built by Macho · Machotech</Text>
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.t1, marginBottom: 4 },
  sectionLabel: { color: COLORS.t3, fontSize: 10, fontWeight: '600', letterSpacing: 1, marginTop: 12, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  rowIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
});