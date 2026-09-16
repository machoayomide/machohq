import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import { Card, Badge, Btn, Input } from '../components/UI';
import { setData, today } from '../utils/storage';
import { clearKeyCache } from '../utils/ai';
import { SVB_TIERS } from '../data/constants';

export default function OnboardingScreen({ onDone }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [name, setName] = useState('');
  const [rank, setRank] = useState('Senior Manager');
  const [startQpv, setStartQpv] = useState('');
  const [apiKey, setApiKey] = useState('');

  const TOTAL = 5;

  const canNext = () => {
    if (step === 1) return true;
    if (step === 2) return pin.length === 4 && pin === confirmPin;
    if (step === 3) return name.trim().length > 0;
    if (step === 4) return true;
    return true;
  };

  const finish = async () => {
    await setData('pin', pin);
    await setData('profile', { name: name.trim(), rank, joined: today() });
    await setData('appData', { qpv: parseFloat(startQpv) || 0, streak: 0 });
    if (apiKey.trim().startsWith('sk-')) {
      await setData('anthropicKey', apiKey.trim());
      clearKeyCache();
    }
    await setData('onboarded', true);
    onDone();
  };

  return (
    <ScrollView style={[s.container, { paddingTop: insets.top + 20 }]} contentContainerStyle={{ paddingBottom: 60 }}>
      {/* Progress */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 24 }}>
        {Array.from({ length: TOTAL }).map((_, i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < step ? COLORS.primary : COLORS.border }} />
        ))}
      </View>

      {/* STEP 1 — Welcome */}
      {step === 1 && (
        <View style={{ alignItems: 'center' }}>
          <Image source={require('../../assets/icon.png')} style={s.logo} resizeMode="contain" />
          <Text style={s.bigTitle}>MachoHQ</Text>
          <Text style={s.tagline}>Your Operating System</Text>

          <Card style={{ marginTop: 28, width: '100%' }}>
            <Text style={{ color: COLORS.t1, fontSize: 15, fontWeight: '600', marginBottom: 10 }}>
              What this app is for
            </Text>
            {[
              ['◈', 'Build your NeoLife team to Director'],
              ['◎', 'Work a real prospect pipeline, not a notebook'],
              ['💼', 'Track every Fiverr account and gig in one place'],
              ['🔍', 'Know what is selling right now, not last year'],
              ['⏱', 'Work in blocks and prove you actually did'],
            ].map(([icon, text], i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7 }}>
                <Text style={{ fontSize: 17 }}>{icon}</Text>
                <Text style={{ color: COLORS.t2, fontSize: 12, flex: 1 }}>{text}</Text>
              </View>
            ))}
          </Card>

          <Card style={{ width: '100%', borderLeftWidth: 3, borderLeftColor: COLORS.accent }}>
            <Text style={{ color: COLORS.accent, fontSize: 10, fontWeight: '600', letterSpacing: 1 }}>
              SIX MONTHS TO DIRECTOR
            </Text>
            <Text style={{ color: COLORS.t2, fontSize: 12, marginTop: 6, lineHeight: 18 }}>
              September 2026 to February 2027. Everything in this app points at that one goal.
            </Text>
          </Card>
        </View>
      )}

      {/* STEP 2 — PIN */}
      {step === 2 && (
        <View>
          <Text style={s.stepTitle}>Lock the app</Text>
          <Text style={s.stepDesc}>
            Four digits. Your team data, income and prospects stay private on this phone.
          </Text>

          <Card style={{ marginTop: 20 }}>
            <Text style={s.label}>Choose a PIN</Text>
            <Input value={pin} onChangeText={(v) => setPin(v.replace(/[^0-9]/g, '').slice(0, 4))}
              placeholder="4 digits" keyboardType="number-pad" />
            <View style={{ height: 14 }} />
            <Text style={s.label}>Type it again</Text>
            <Input value={confirmPin} onChangeText={(v) => setConfirmPin(v.replace(/[^0-9]/g, '').slice(0, 4))}
              placeholder="Confirm" keyboardType="number-pad" />

            {pin.length === 4 && confirmPin.length === 4 && pin !== confirmPin && (
              <Text style={{ color: COLORS.danger, fontSize: 11, marginTop: 8 }}>
                They do not match.
              </Text>
            )}
            {pin.length === 4 && pin === confirmPin && (
              <Text style={{ color: COLORS.primary, fontSize: 11, marginTop: 8 }}>
                PIN set. Do not forget it — there is no reset.
              </Text>
            )}
          </Card>
        </View>
      )}

      {/* STEP 3 — Profile */}
      {step === 3 && (
        <View>
          <Text style={s.stepTitle}>Who are you?</Text>
          <Text style={s.stepDesc}>Used across the app so it talks to you, not at you.</Text>

          <Card style={{ marginTop: 20 }}>
            <Text style={s.label}>Your name</Text>
            <Input value={name} onChangeText={setName} placeholder="e.g. Macho" />

            <View style={{ height: 16 }} />
            <Text style={s.label}>Current NeoLife rank</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {SVB_TIERS.map(t => (
                <TouchableOpacity key={t.rank} onPress={() => setRank(t.rank)}
                  style={[s.tag, rank === t.rank && { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '22' }]}>
                  <Text style={{ color: rank === t.rank ? COLORS.primary : COLORS.t3, fontSize: 11 }}>
                    {t.rank}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ height: 16 }} />
            <Text style={s.label}>QPV so far this month</Text>
            <Input value={startQpv} onChangeText={setStartQpv} placeholder="e.g. 272" keyboardType="numeric" />
            <Text style={{ color: COLORS.t3, fontSize: 10, marginTop: 6 }}>
              Leave blank if you are starting fresh. You can correct this any time in Team.
            </Text>
          </Card>
        </View>
      )}

      {/* STEP 4 — API key */}
      {step === 4 && (
        <View>
          <Text style={s.stepTitle}>Turn on the AI</Text>
          <Text style={s.stepDesc}>
            About half of this app runs on AI — drafting messages, auditing gigs, researching what
            sells, grading your skills. It needs your own key.
          </Text>

          <Card style={{ marginTop: 20 }}>
            <Text style={{ color: COLORS.t2, fontSize: 12, lineHeight: 19 }}>
              1. Go to console.anthropic.com{'\n'}
              2. Sign up and create an API key{'\n'}
              3. Add a few dollars of credit{'\n'}
              4. Paste the key below
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://console.anthropic.com').catch(() => {})}>
              <Text style={{ color: COLORS.primary, fontSize: 12, marginTop: 10 }}>
                Open console.anthropic.com →
              </Text>
            </TouchableOpacity>

            <View style={{ height: 16 }} />
            <Input value={apiKey} onChangeText={setApiKey} placeholder="sk-ant-api03-..." />

            {apiKey.trim().startsWith('sk-') && (
              <Text style={{ color: COLORS.primary, fontSize: 11, marginTop: 8 }}>
                Key looks right. AI features will be live.
              </Text>
            )}
          </Card>

          <Card style={{ borderLeftWidth: 3, borderLeftColor: COLORS.warn }}>
            <Text style={{ color: COLORS.t2, fontSize: 11, lineHeight: 17 }}>
              You can skip this and add it later in More → Settings. Everything else works without
              it — only the AI features stay switched off.
            </Text>
          </Card>
        </View>
      )}

      {/* STEP 5 — Ready */}
      {step === 5 && (
        <View>
          <Text style={s.stepTitle}>Ready</Text>
          <Text style={s.stepDesc}>Here is where to start.</Text>

          <Card style={{ marginTop: 20 }}>
            {[
              ['1', 'Add your team', 'Team → Add downline. Set their income stage honestly.'],
              ['2', 'Add your prospects', 'Pipeline → Add prospect. Everyone you already know goes in the Cold List.'],
              ['3', 'Open the Attack Plan', 'HQ → Attack Plan. It tells you who to contact and writes the message.'],
              ['4', 'Add your Fiverr accounts', 'More → Fiverr Hub. Log your gigs, then audit them.'],
              ['5', 'Start a focus block', 'More → Focus. It keeps running if you close the app.'],
            ].map(([n, title, desc], i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 12, paddingVertical: 9, borderBottomWidth: i < 4 ? 1 : 0, borderBottomColor: COLORS.border }}>
                <View style={s.numCircle}><Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '700' }}>{n}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.t1, fontSize: 13, fontWeight: '600' }}>{title}</Text>
                  <Text style={{ color: COLORS.t3, fontSize: 11, marginTop: 1 }}>{desc}</Text>
                </View>
              </View>
            ))}
          </Card>

          <Card style={{ borderLeftWidth: 3, borderLeftColor: COLORS.accent }}>
            <Text style={{ color: COLORS.t2, fontSize: 12, lineHeight: 18 }}>
              The app is only as honest as what you put in it. Log the real numbers, even the
              ugly ones. That is the whole point.
            </Text>
          </Card>
        </View>
      )}

      {/* Nav */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
        {step > 1 && (
          <Btn outline onPress={() => setStep(step - 1)} style={{ paddingHorizontal: 24 }}>Back</Btn>
        )}
        {step < TOTAL ? (
          <Btn full color={canNext() ? COLORS.primary : COLORS.border}
            onPress={() => canNext() && setStep(step + 1)}>
            {step === 4 && !apiKey.trim() ? 'Skip for now' : 'Continue'}
          </Btn>
        ) : (
          <Btn full onPress={finish}>Start using MachoHQ</Btn>
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 18 },
  logo: { width: 170, height: 115 },
  bigTitle: { fontSize: 26, fontWeight: '800', color: COLORS.t1, marginTop: 4 },
  tagline: { color: COLORS.t3, fontSize: 12, marginTop: 2 },
  stepTitle: { fontSize: 22, fontWeight: '700', color: COLORS.t1, marginBottom: 6 },
  stepDesc: { color: COLORS.t2, fontSize: 13, lineHeight: 19 },
  label: { color: COLORS.t2, fontSize: 12, marginBottom: 6 },
  tag: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  numCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.primary + '22', alignItems: 'center', justifyContent: 'center' },
});