import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { COLORS } from '../theme';

export function Card({ children, style, glow, onPress }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper onPress={onPress} activeOpacity={0.7} style={[styles.card, glow && { shadowColor: glow, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 }, style]}>
      {children}
    </Wrapper>
  );
}

export function Badge({ text, color = COLORS.primary }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '22' }]}>
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

export function ProgressBar({ value, max, color = COLORS.primary, height = 8 }) {
  const pct = Math.min(100, (value / (max || 1)) * 100);
  return (
    <View style={[styles.progressTrack, { height, borderRadius: height / 2 }]}>
      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color, height, borderRadius: height / 2 }]} />
    </View>
  );
}

export function Ring({ value, max, size = 160, strokeWidth = 10, color = COLORS.primary, children }) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / (max || 1));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size/2} cy={size/2} r={r} fill="none" stroke={COLORS.border} strokeWidth={strokeWidth} />
        <Circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={`${c}`} strokeDashoffset={`${c * (1 - pct)}`} strokeLinecap="round" />
      </Svg>
      {children}
    </View>
  );
}

export function Btn({ children, onPress, color = COLORS.primary, outline, full, style: extraStyle }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[styles.btn, outline ? { borderWidth: 1, borderColor: COLORS.border, backgroundColor: 'transparent' } : { backgroundColor: color }, full && { flex: 1 }, extraStyle]}>
      <Text style={[styles.btnText, { color: outline ? COLORS.t2 : COLORS.bg }]}>{children}</Text>
    </TouchableOpacity>
  );
}

export function Input({ value, onChangeText, placeholder, keyboardType, style: extraStyle }) {
  return (
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={COLORS.t3} keyboardType={keyboardType || 'default'}
      style={[styles.input, extraStyle]} />
  );
}

export function SectionHeader({ title, right }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <Text style={{ color: COLORS.t2, fontSize: 13, fontWeight: '600' }}>{title}</Text>
      {right}
    </View>
  );
}

export function TabBar({ tabs, active, onChange }) {
  return (
    <View style={styles.tabBar}>
      {tabs.map((t, i) => (
        <TouchableOpacity key={i} onPress={() => onChange(i)} style={[styles.tabItem, active === i && styles.tabActive]}>
          <Text style={[styles.tabText, active === i && styles.tabTextActive]}>{t}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 16, marginBottom: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  progressTrack: { backgroundColor: COLORS.bg, width: '100%', overflow: 'hidden', marginTop: 4 },
  progressFill: {},
  btn: { height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  btnText: { fontWeight: '600', fontSize: 13 },
  input: { width: '100%', height: 44, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, color: COLORS.t1, paddingHorizontal: 12, fontSize: 13 },
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 12, padding: 3, marginBottom: 16 },
  tabItem: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 11, fontWeight: '600', color: COLORS.t3 },
  tabTextActive: { color: COLORS.bg },
});