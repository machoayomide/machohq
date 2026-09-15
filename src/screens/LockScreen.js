import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { COLORS } from '../theme';
import { getData, setData } from '../utils/storage';

export default function LockScreen({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [savedPin, setSavedPin] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const shakeAnim = new Animated.Value(0);

  useEffect(() => {
    getData('pin').then(p => { if (!p) setIsNew(true); else setSavedPin(p); });
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const handleTap = (n) => {
    if (pin.length >= 4) return;
    const next = pin + n;
    setPin(next);
    if (next.length === 4) {
      if (isNew) {
        setData('pin', next);
        setTimeout(onUnlock, 400);
      } else if (next === savedPin) {
        setTimeout(onUnlock, 400);
      } else {
        setError(true);
        shake();
        setTimeout(() => { setPin(''); setError(false); }, 600);
      }
    }
  };

  const nums = [1,2,3,4,5,6,7,8,9,null,0,'⌫'];

  return (
    <View style={s.container}>
      <Text style={s.logo}>MachoHQ</Text>
      <Text style={s.subtitle}>Your Operating System</Text>
      <Text style={s.prompt}>{isNew ? 'Create your PIN' : 'Enter PIN'}</Text>

      <Animated.View style={[s.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
        {[0,1,2,3].map(i => (
          <View key={i} style={[s.dot, pin.length > i && (error ? s.dotError : s.dotFilled)]} />
        ))}
      </Animated.View>

      <View style={s.grid}>
        {nums.map((n, i) => n === null ? <View key={i} style={s.empty} /> : (
          <TouchableOpacity key={i} activeOpacity={0.6} onPress={() => n === '⌫' ? setPin(p => p.slice(0, -1)) : handleTap(String(n))} style={s.key}>
            <Text style={s.keyText}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },
  logo: { fontSize: 28, fontWeight: '800', color: COLORS.primary, marginBottom: 6 },
  subtitle: { color: COLORS.t3, fontSize: 12, marginBottom: 40 },
  prompt: { color: COLORS.t2, fontSize: 13, marginBottom: 24 },
  dotsRow: { flexDirection: 'row', gap: 18, marginBottom: 48 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: COLORS.t3 },
  dotFilled: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dotError: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: 240, justifyContent: 'center', gap: 14 },
  key: { width: 72, height: 72, borderRadius: 36, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  keyText: { color: COLORS.t1, fontSize: 24, fontWeight: '500' },
  empty: { width: 72, height: 72 },
});