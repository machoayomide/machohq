import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { COLORS } from '../theme';

export default function AIScreen() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "I'm your MachoHQ adviser. Ask me about prospecting, objection handling, gig strategy, team coaching, or budgeting." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const q = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 800,
          messages: [{ role: 'user', content: `You are MachoHQ AI — a direct mentor for Macho (Ayomide), a Nigerian freelancer with 20+ Fiverr accounts and NeoLife network marketer on a 6-month Director Challenge (Sep 2026 - Feb 2027). Be concise, actionable, and direct. No fluff.\n\nQuestion: ${q}` }]
        })
      });
      const data = await res.json();
      const reply = data.content?.map(b => b.text || '').join('\n') || 'Try again.';
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Connection error. Check your network.' }]);
    }
    setLoading(false);
  };

  const chips = ['Prospecting help', 'Handle objections', 'Draft a message', 'PV strategy', 'Budget advice'];

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Text style={s.title}>AI Adviser</Text>

      <View style={s.chips}>
        {chips.map(c => (
          <TouchableOpacity key={c} onPress={() => setInput(c)} style={s.chip}>
            <Text style={s.chipText}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView ref={scrollRef} style={s.messages} contentContainerStyle={{ paddingBottom: 16 }}>
        {messages.map((m, i) => (
          <View key={i} style={[s.msgRow, m.role === 'user' && { justifyContent: 'flex-end' }]}>
            <View style={[s.bubble, m.role === 'user' ? s.userBubble : s.aiBubble]}>
              <Text style={s.msgText}>{m.text}</Text>
            </View>
          </View>
        ))}
        {loading && (
          <View style={s.msgRow}>
            <View style={s.aiBubble}>
              <Text style={{ color: COLORS.primary }}>Thinking...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={s.inputRow}>
        <TextInput value={input} onChangeText={setInput} onSubmitEditing={send} placeholder="Ask anything..." placeholderTextColor={COLORS.t3} style={s.input} returnKeyType="send" />
        <TouchableOpacity onPress={send} disabled={loading} style={[s.sendBtn, loading && { backgroundColor: COLORS.border }]}>
          <Text style={{ color: COLORS.bg, fontSize: 18 }}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16, paddingTop: 20 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.t1, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  chipText: { color: COLORS.t2, fontSize: 10 },
  messages: { flex: 1, marginBottom: 12 },
  msgRow: { flexDirection: 'row', marginBottom: 10 },
  bubble: { maxWidth: '85%', padding: 12, borderRadius: 14 },
  userBubble: { backgroundColor: COLORS.accent + '22', borderWidth: 1, borderColor: COLORS.accent + '33' },
  aiBubble: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  msgText: { color: COLORS.t1, fontSize: 13, lineHeight: 20 },
  inputRow: { flexDirection: 'row', gap: 8, paddingBottom: 16 },
  input: { flex: 1, height: 44, borderRadius: 22, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, color: COLORS.t1, paddingHorizontal: 16, fontSize: 13 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
});