import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Animated, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import { setData } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const NEOLIFE_RANKS = [
  'Not in NeoLife yet',
  'Full Distributor',
  'Manager',
  'Senior Manager',
  'Executive Manager',
  'Director',
  '1RD', '2RD', '3RD', '4RD', '5RD',
];

export default function OnboardingScreen({ onDone }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Profile fields
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [rank, setRank] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const animateStep = (next) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setStep(next);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const canNext = () => {
    if (step === 0) return true; // welcome
    if (step === 1) return name.trim().length >= 2;
    if (step === 2) return nickname.trim().length >= 1;
    if (step === 3) return rank.length > 0;
    if (step === 4) return pin.length === 4 && pin === confirmPin;
    return true;
  };

  const finish = async () => {
    // Clear all old data first — fresh start
    const allKeys = await AsyncStorage.getAllKeys();
    if (allKeys.length > 0) await AsyncStorage.multiRemove(allKeys);

    // Save profile
    await setData('profile', {
      name: name.trim(),
      nickname: nickname.trim(),
      phone: phone.trim(),
      rank,
      createdAt: new Date().toISOString(),
    });
    await setData('pin', pin);
    await setData('onboarded', true);
    await setData('appData', { qpv: 0, streak: 0, dayNumber: 1, startDate: new Date().toISOString() });
    onDone();
  };

  const renderStep = () => {
    if (step === 0) return (
      <View style={st.stepContent}>
        <Text style={st.bigEmoji}>⚡</Text>
        <Text style={st.heroTitle}>MachoHQ</Text>
        <Text style={st.heroSub}>Your Personal Performance OS</Text>
        <View style={st.spacer} />
        <Text style={st.desc}>
          This is your daily operating system. Everything you need to build your NeoLife business, run your freelancing, and stay disciplined — in one place.
        </Text>
        <Text style={[st.desc, { marginTop: 12, color: COLORS.accent }]}>
          All previous data will be cleared for a fresh start.
        </Text>
      </View>
    );

    if (step === 1) return (
      <View style={st.stepContent}>
        <Text style={st.stepLabel}>STEP 1 OF 4</Text>
        <Text style={st.stepTitle}>What's your full name?</Text>
        <Text style={st.desc}>This is how you appear in your app and team reports.</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Ayomide Olalekan"
          placeholderTextColor={COLORS.t3}
          style={st.input}
          autoFocus
        />
      </View>
    );

    if (step === 2) return (
      <View style={st.stepContent}>
        <Text style={st.stepLabel}>STEP 2 OF 4</Text>
        <Text style={st.stepTitle}>What should we call you?</Text>
        <Text style={st.desc}>Your nickname — used in daily greetings and nudges.</Text>
        <TextInput
          value={nickname}
          onChangeText={setNickname}
          placeholder="e.g. Macho"
          placeholderTextColor={COLORS.t3}
          style={st.input}
          autoFocus
        />
        <View style={{ marginTop: 16 }}>
          <Text style={[st.desc, { marginBottom: 8 }]}>Phone number (for WhatsApp integration)</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g. 08012345678"
            placeholderTextColor={COLORS.t3}
            keyboardType="phone-pad"
            style={st.input}
          />
        </View>
      </View>
    );

    if (step === 3) return (
      <View style={st.stepContent}>
        <Text style={st.stepLabel}>STEP 3 OF 4</Text>
        <Text style={st.stepTitle}>Your NeoLife rank</Text>
        <Text style={st.desc}>Where you currently stand. This sets your starting targets.</Text>
        <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
          {NEOLIFE_RANKS.map(r => (
            <TouchableOpacity
              key={r}
              onPress={() => setRank(r)}
              style={[st.rankOption, rank === r && st.rankSelected]}
            >
              <Text style={[st.rankText, rank === r && { color: COLORS.primary, fontWeight: '700' }]}>{r}</Text>
              {rank === r && <Text style={{ color: COLORS.primary, fontSize: 16 }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );

    if (step === 4) return (
      <View style={st.stepContent}>
        <Text style={st.stepLabel}>STEP 4 OF 4</Text>
        <Text style={st.stepTitle}>Set your lock PIN</Text>
        <Text style={st.desc}>4 digits. Keeps your data private.</Text>
        <TextInput
          value={pin}
          onChangeText={t => t.length <= 4 && setPin(t.replace(/[^0-9]/g, ''))}
          placeholder="Enter 4-digit PIN"
          placeholderTextColor={COLORS.t3}
          keyboardType="number-pad"
          secureTextEntry
          style={[st.input, { textAlign: 'center', fontSize: 28, letterSpacing: 12 }]}
          maxLength={4}
          autoFocus
        />
        {pin.length === 4 && (
          <View style={{ marginTop: 16 }}>
            <Text style={st.desc}>Confirm PIN</Text>
            <TextInput
              value={confirmPin}
              onChangeText={t => t.length <= 4 && setConfirmPin(t.replace(/[^0-9]/g, ''))}
              placeholder="Re-enter PIN"
              placeholderTextColor={COLORS.t3}
              keyboardType="number-pad"
              secureTextEntry
              style={[st.input, { textAlign: 'center', fontSize: 28, letterSpacing: 12 }]}
              maxLength={4}
            />
            {confirmPin.length === 4 && confirmPin !== pin && (
              <Text style={{ color: COLORS.danger, fontSize: 12, marginTop: 8, textAlign: 'center' }}>PINs don't match</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const totalSteps = 5;
  const isLast = step === totalSteps - 1;

  return (
    <View style={[st.container, { paddingTop: insets.top + 20 }]}>
      {/* Progress bar */}
      <View style={st.progressWrap}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View key={i} style={[st.progressDot, i <= step && st.progressActive]} />
        ))}
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {renderStep()}
      </Animated.View>

      {/* Bottom buttons */}
      <View style={[st.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {step > 0 && (
          <TouchableOpacity onPress={() => animateStep(step - 1)} style={st.backBtn}>
            <Text style={{ color: COLORS.t2, fontSize: 15 }}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => isLast ? finish() : animateStep(step + 1)}
          disabled={!canNext()}
          style={[st.nextBtn, !canNext() && { opacity: 0.3 }]}
        >
          <Text style={st.nextText}>{step === 0 ? 'Get Started' : isLast ? 'Launch MachoHQ' : 'Continue'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 24 },
  progressWrap: { flexDirection: 'row', gap: 6, marginBottom: 32, justifyContent: 'center' },
  progressDot: { width: 28, height: 4, borderRadius: 2, backgroundColor: COLORS.border },
  progressActive: { backgroundColor: COLORS.primary },
  stepContent: { flex: 1, justifyContent: 'center' },
  bigEmoji: { fontSize: 48, textAlign: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 36, fontWeight: '800', color: COLORS.t1, textAlign: 'center' },
  heroSub: { fontSize: 14, color: COLORS.primary, textAlign: 'center', marginTop: 6, fontWeight: '600' },
  spacer: { height: 32 },
  desc: { fontSize: 14, color: COLORS.t2, lineHeight: 22, textAlign: 'center' },
  stepLabel: { fontSize: 10, color: COLORS.primary, fontWeight: '700', letterSpacing: 2, marginBottom: 12 },
  stepTitle: { fontSize: 26, fontWeight: '800', color: COLORS.t1, marginBottom: 8 },
  input: {
    height: 52, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface, color: COLORS.t1, paddingHorizontal: 16,
    fontSize: 16, marginTop: 8,
  },
  rankOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface, marginBottom: 8,
  },
  rankSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryDim },
  rankText: { color: COLORS.t2, fontSize: 15 },
  bottomBar: { flexDirection: 'row', gap: 12, paddingTop: 12 },
  backBtn: { height: 52, paddingHorizontal: 20, justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  nextBtn: {
    flex: 1, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
