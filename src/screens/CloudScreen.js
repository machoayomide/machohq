import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Linking, Share, Switch } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { COLORS } from '../theme';
import { Card, Badge, Btn, Input } from '../components/UI';
import {
  getCloudConfig, saveCloudConfig, testConnection, backupNow,
  listBackups, restoreFrom, lastBackupTime, clearCloudCache, SETUP_SQL,
} from '../utils/cloud';

export default function CloudScreen() {
  const [cfg, setCfg] = useState(null);
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(null);
  const [last, setLast] = useState(null);
  const [backups, setBackups] = useState([]);
  const [showSql, setShowSql] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    getCloudConfig().then(c => {
      setCfg(c);
      setUrl(c.url || '');
      setKey(c.anonKey || '');
      setShowSetup(!c.url);
    });
    lastBackupTime().then(setLast);
  }, []);

  const configured = !!(cfg?.url && cfg?.anonKey);

  const connect = async () => {
    if (!url.trim() || !key.trim()) {
      Alert.alert('Missing details', 'Paste both the project URL and the anon key.');
      return;
    }
    setBusy('connect');
    const res = await testConnection(url.trim(), key.trim());
    setBusy(null);
    if (!res.ok) {
      Alert.alert('Not connected', res.error);
      if (res.error.includes('backups table')) setShowSql(true);
      return;
    }
    const saved = await saveCloudConfig({ url: url.trim().replace(/\/$/, ''), anonKey: key.trim() });
    setCfg(saved);
    setShowSetup(false);
    Alert.alert('Connected', 'Your data can now be backed up.');
  };

  const doBackup = async () => {
    setBusy('backup');
    const res = await backupNow();
    setBusy(null);
    if (res.ok) {
      setLast(new Date().toISOString());
      Alert.alert('Backed up', `${res.keys} sections saved, ${(res.size / 1024).toFixed(0)}KB.`);
    } else {
      Alert.alert('Backup failed', res.error);
    }
  };

  const loadBackups = async () => {
    setBusy('list');
    const res = await listBackups();
    setBusy(null);
    if (res.ok) setBackups(res.rows || []);
    else Alert.alert('Could not load', res.error);
  };

  const doRestore = (deviceId, when) => {
    Alert.alert(
      'Restore this backup?',
      `Everything currently on this phone will be replaced with the backup from ${new Date(when).toLocaleString()}. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            setBusy('restore');
            const res = await restoreFrom(deviceId);
            setBusy(null);
            if (res.ok) {
              Alert.alert('Restored', `${res.restored} sections restored. Close and reopen the app.`);
            } else {
              Alert.alert('Restore failed', res.error);
            }
          },
        },
      ]
    );
  };

  const copySql = async () => {
    try { await Clipboard.setStringAsync(SETUP_SQL); Alert.alert('Copied', 'Paste it into the Supabase SQL editor.'); }
    catch { Share.share({ message: SETUP_SQL }).catch(() => {}); }
  };

  const ago = (iso) => {
    if (!iso) return 'never';
    const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={s.title}>Cloud Backup</Text>
      <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 14 }}>
        Free forever on Supabase · set up once
      </Text>

      {!configured && (
        <Card style={{ borderLeftWidth: 3, borderLeftColor: COLORS.danger }}>
          <Text style={{ color: COLORS.danger, fontSize: 12, fontWeight: '600' }}>
            Your data exists only on this phone
          </Text>
          <Text style={{ color: COLORS.t2, fontSize: 11, marginTop: 5, lineHeight: 17 }}>
            Lose it, reset it, or uninstall the app and your team, PV history, prospects and income
            logs go with it. Setting this up takes about five minutes and costs nothing.
          </Text>
        </Card>
      )}

      {configured && (
        <Card glow={COLORS.primary}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Badge text="Connected" color={COLORS.primary} />
              <Text style={{ color: COLORS.t1, fontSize: 15, fontWeight: '600', marginTop: 8 }}>
                Last backup {ago(last)}
              </Text>
              <Text style={{ color: COLORS.t3, fontSize: 10, marginTop: 2 }}>
                Device {cfg.deviceId}
              </Text>
            </View>
          </View>
          <Btn full onPress={doBackup} style={{ marginTop: 12 }}>
            {busy === 'backup' ? 'Backing up...' : 'Back up now'}
          </Btn>
        </Card>
      )}

      {configured && (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.t1, fontSize: 13, fontWeight: '600' }}>Automatic backup</Text>
              <Text style={{ color: COLORS.t3, fontSize: 10, marginTop: 2 }}>
                Backs up when you open the app, at most once an hour
              </Text>
            </View>
            <Switch
              value={cfg.autoSync !== false}
              onValueChange={async (v) => { const c = await saveCloudConfig({ autoSync: v }); setCfg(c); }}
              trackColor={{ false: COLORS.border, true: COLORS.primary + '66' }}
              thumbColor={cfg.autoSync !== false ? COLORS.primary : COLORS.t3}
            />
          </View>
        </Card>
      )}

      {/* Setup */}
      <TouchableOpacity onPress={() => setShowSetup(!showSetup)}>
        <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: COLORS.t2, fontSize: 13, fontWeight: '600' }}>
            {configured ? 'Change connection' : 'Set it up'}
          </Text>
          <Text style={{ color: COLORS.t3, fontSize: 16 }}>{showSetup ? '−' : '+'}</Text>
        </Card>
      </TouchableOpacity>

      {showSetup && (
        <Card style={{ borderColor: COLORS.primary + '44' }}>
          <Text style={{ color: COLORS.t2, fontSize: 12, lineHeight: 19, marginBottom: 12 }}>
            1. Go to supabase.com and create a free account{'\n'}
            2. Create a new project — any name, any region{'\n'}
            3. Open the SQL Editor and run the setup SQL below{'\n'}
            4. Go to Settings → API and copy the Project URL and the anon public key{'\n'}
            5. Paste both here
          </Text>

          <TouchableOpacity onPress={() => Linking.openURL('https://supabase.com/dashboard').catch(() => {})}>
            <Text style={{ color: COLORS.primary, fontSize: 12, marginBottom: 12 }}>
              Open supabase.com →
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowSql(!showSql)}>
            <Text style={{ color: COLORS.accent, fontSize: 12, marginBottom: 8 }}>
              {showSql ? 'Hide' : 'Show'} setup SQL
            </Text>
          </TouchableOpacity>

          {showSql && (
            <View style={{ backgroundColor: COLORS.bg, borderRadius: 9, padding: 11, marginBottom: 12 }}>
              <Text style={{ color: COLORS.t2, fontSize: 10, fontFamily: 'monospace', lineHeight: 16 }}>
                {SETUP_SQL}
              </Text>
              <Btn full outline onPress={copySql} style={{ marginTop: 10, height: 34 }}>Copy SQL</Btn>
            </View>
          )}

          <Text style={s.label}>Project URL</Text>
          <Input value={url} onChangeText={setUrl} placeholder="https://xxxx.supabase.co" />
          <View style={{ height: 10 }} />
          <Text style={s.label}>Anon public key</Text>
          <Input value={key} onChangeText={setKey} placeholder="eyJhbGci..." />

          <Btn full onPress={connect} style={{ marginTop: 12 }}>
            {busy === 'connect' ? 'Testing...' : 'Test and connect'}
          </Btn>
        </Card>
      )}

      {/* Restore */}
      {configured && (
        <Card>
          <Text style={{ color: COLORS.t2, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
            Restore from a backup
          </Text>
          <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 10, lineHeight: 17 }}>
            New phone? Connect it to the same project, load the backups, and restore.
          </Text>
          <Btn full outline onPress={loadBackups}>
            {busy === 'list' ? 'Loading...' : 'Load backups'}
          </Btn>

          {backups.map(b => (
            <TouchableOpacity key={b.device_id} onPress={() => doRestore(b.device_id, b.updated_at)}
              style={s.backupRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.t1, fontSize: 12 }}>
                  {b.device_id === cfg.deviceId ? 'This phone' : b.device_id}
                </Text>
                <Text style={{ color: COLORS.t3, fontSize: 10 }}>
                  {new Date(b.updated_at).toLocaleString()}
                </Text>
              </View>
              <Text style={{ color: COLORS.accent, fontSize: 11 }}>Restore</Text>
            </TouchableOpacity>
          ))}
        </Card>
      )}

      <Card style={{ backgroundColor: COLORS.surface }}>
        <Text style={{ color: COLORS.t3, fontSize: 10, lineHeight: 16 }}>
          Your data goes to a Supabase project you own and control. Nothing passes through me or
          anyone else. The free tier gives you 500MB — this app uses well under one megabyte.
        </Text>
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.t1, marginBottom: 2 },
  label: { color: COLORS.t2, fontSize: 11, marginBottom: 5 },
  backupRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
});