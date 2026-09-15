import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import { buildKnowledgeContext } from '../utils/knowledge';

export default function AIScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "I'm your MachoHQ adviser. I've studied 56 books on leadership, selling, networking, and mindset. Ask me about prospecting, objection handling, gig strategy, team coaching, or budgeting — I'll give you advice grounded in real knowledge, not generic answers." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('chat'); // chat, simulator, training
  const [simDifficulty, setSimDifficulty] = useState('Medium');
  const [simActive, setSimActive] = useState(false);
  const [trainAudience, setTrainAudience] = useState('General Team');
  const [trainTopic, setTrainTopic] = useState('');
  const [trainResult, setTrainResult] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => { scrollRef.current?.scrollToEnd({ animated: true }); }, [messages, loading]);

  const callAI = async (prompt) => {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] })
      });
      const data = await res.json();
      return data.content?.filter(b => b.type === 'text').map(b => b.text).join('\n') || 'Try again.';
    } catch { return 'Connection error. Check your network.'; }
  };

  const sendChat = async () => {
    if (!input.trim() || loading) return;
    const q = input.trim(); setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);

    // Search knowledge base for relevant book excerpts
    let knowledgeContext = '';
    try { knowledgeContext = buildKnowledgeContext(q); } catch {}

    const prompt = `You are MachoHQ AI — a direct, no-fluff mentor for Macho (Ayomide), a Nigerian freelancer with 20+ Fiverr accounts and NeoLife network marketer on a 6-month Director Challenge (Sep 2026 - Feb 2027).

When giving advice, draw from the knowledge below naturally — like a wise mentor who has read these books. Don't cite or quote them, just apply the wisdom to the specific situation.
${knowledgeContext}

Be concise, actionable, and direct. Give specific steps, not vague motivation.

Question: ${q}`;

    const reply = await callAI(prompt);
    setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    setLoading(false);
  };

  const startSim = async () => {
    setSimActive(true); setLoading(true);
    const reply = await callAI(`You are playing a ${simDifficulty.toLowerCase()} difficulty NeoLife prospect in Nigeria. You are skeptical about network marketing. Start the conversation — someone is about to pitch you. Say something a real person would say. 1-2 sentences. Be realistic.`);
    setMessages([{ role: 'assistant', text: reply }]);
    setLoading(false);
  };

  const sendSim = async () => {
    if (!input.trim() || loading) return;
    const q = input.trim(); setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    const history = messages.map(m => `${m.role === 'user' ? 'Distributor' : 'Prospect'}: ${m.text}`).join('\n');
    const reply = await callAI(`You are a ${simDifficulty.toLowerCase()} difficulty prospect. Continue this conversation. After 4+ exchanges, end with:\n---SCORE---\nScore: [0-100]\nFeedback: [coaching]\n\n${history}\nDistributor: ${q}\n\nRespond as prospect (1-2 sentences).`);
    setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    setLoading(false);
  };

  const genTraining = async () => {
    if (!trainTopic.trim()) return;
    setLoading(true);
    let knowledgeContext = '';
    try { knowledgeContext = buildKnowledgeContext(trainTopic); } catch {}
    const reply = await callAI(`Generate a NeoLife team training for: ${trainAudience}. Topic: ${trainTopic}. Use this knowledge:\n${knowledgeContext}\n\nInclude: opening hook, 3-4 key points with talking notes, 1 activity, closing CTA. ${trainAudience === 'General Team' ? 'Simple and motivational.' : trainAudience === 'Pros Only' ? 'Add skill-building.' : 'Business strategy and leadership.'} Under 300 words.`);
    setTrainResult(reply);
    setLoading(false);
  };

  const chips = ['Prospecting', 'Handle objections', 'Draft message', 'PV strategy', 'Budget advice', 'Team coaching'];
  const trainTopics = ['Prospecting', 'Closing', 'Products', 'Business Basics', 'Compensation', 'Mindset', 'Team Building', 'Retention'];

  return (
    <KeyboardAvoidingView style={[s.container, { paddingTop: insets.top + 12 }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Text style={s.title}>AI Centre</Text>

      {/* Mode selector */}
      <View style={{ flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 12, padding: 3, marginBottom: 12 }}>
        {['Chat', 'Simulator', 'Training'].map((m, i) => (
          <TouchableOpacity key={m} onPress={() => { setMode(m.toLowerCase()); if (m === 'Chat') { setSimActive(false); setMessages([{ role: 'assistant', text: "Ask me anything — I draw from 56 books in your library." }]); } }}
            style={[s.modeBtn, mode === m.toLowerCase() && s.modeBtnActive]}>
            <Text style={{ color: mode === m.toLowerCase() ? COLORS.bg : COLORS.t3, fontSize: 11, fontWeight: '600' }}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* CHAT MODE */}
      {mode === 'chat' && (
        <>
          <View style={s.chips}>
            {chips.map(c => (
              <TouchableOpacity key={c} onPress={() => setInput(c)} style={s.chip}>
                <Text style={s.chipText}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <ScrollView ref={scrollRef} style={{ flex: 1, marginBottom: 12 }} contentContainerStyle={{ paddingBottom: 16 }}>
            {messages.map((m, i) => (
              <View key={i} style={[s.msgRow, m.role === 'user' && { justifyContent: 'flex-end' }]}>
                <View style={[s.bubble, m.role === 'user' ? s.userBubble : s.aiBubble]}>
                  <Text style={s.msgText}>{m.text}</Text>
                </View>
              </View>
            ))}
            {loading && <View style={s.msgRow}><View style={s.aiBubble}><Text style={{ color: COLORS.primary }}>Thinking...</Text></View></View>}
          </ScrollView>
          <View style={s.inputRow}>
            <TextInput value={input} onChangeText={setInput} onSubmitEditing={sendChat} placeholder="Ask anything..." placeholderTextColor={COLORS.t3} style={s.input} returnKeyType="send" />
            <TouchableOpacity onPress={sendChat} disabled={loading} style={[s.sendBtn, loading && { backgroundColor: COLORS.border }]}>
              <Text style={{ color: COLORS.bg, fontSize: 18 }}>↑</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* SIMULATOR MODE */}
      {mode === 'simulator' && (
        <>
          {!simActive ? (
            <ScrollView>
              <View style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border }}>
                <Text style={{ color: COLORS.t2, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Prospect Simulator</Text>
                <Text style={{ color: COLORS.t3, fontSize: 12, marginBottom: 16, lineHeight: 18 }}>AI plays a real prospect. You pitch them. Get scored on your approach.</Text>
                <Text style={{ color: COLORS.t2, fontSize: 12, marginBottom: 6 }}>Difficulty</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  {['Easy', 'Medium', 'Hard'].map(d => (
                    <TouchableOpacity key={d} onPress={() => setSimDifficulty(d)} style={[s.diffBtn, simDifficulty === d && s.diffBtnActive]}>
                      <Text style={{ color: simDifficulty === d ? COLORS.accent : COLORS.t3, fontSize: 12 }}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={{ color: COLORS.t3, fontSize: 10, marginBottom: 12 }}>Easy = curious. Medium = skeptic. Hard = hostile.</Text>
                <TouchableOpacity onPress={startSim} style={{ height: 44, borderRadius: 10, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: COLORS.bg, fontWeight: '600', fontSize: 13 }}>Start simulation</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ backgroundColor: COLORS.accent + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                  <Text style={{ color: COLORS.accent, fontSize: 10, fontWeight: '600' }}>{simDifficulty} mode</Text>
                </View>
                <TouchableOpacity onPress={() => { setSimActive(false); setMessages([]); }}>
                  <Text style={{ color: COLORS.danger, fontSize: 12 }}>End session</Text>
                </TouchableOpacity>
              </View>
              <ScrollView ref={scrollRef} style={{ flex: 1, marginBottom: 12 }}>
                {messages.map((m, i) => (
                  <View key={i} style={[s.msgRow, m.role === 'user' && { justifyContent: 'flex-end' }]}>
                    <View style={[s.bubble, m.role === 'user' ? s.userBubble : s.aiBubble]}>
                      <Text style={s.msgText}>{m.text}</Text>
                    </View>
                  </View>
                ))}
                {loading && <View style={s.msgRow}><View style={s.aiBubble}><Text style={{ color: COLORS.primary }}>Thinking...</Text></View></View>}
              </ScrollView>
              <View style={s.inputRow}>
                <TextInput value={input} onChangeText={setInput} onSubmitEditing={sendSim} placeholder="Your pitch..." placeholderTextColor={COLORS.t3} style={s.input} returnKeyType="send" />
                <TouchableOpacity onPress={sendSim} disabled={loading} style={[s.sendBtn, loading && { backgroundColor: COLORS.border }]}>
                  <Text style={{ color: COLORS.bg, fontSize: 18 }}>↑</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </>
      )}

      {/* TRAINING MODE */}
      {mode === 'training' && (
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 }}>
            <Text style={{ color: COLORS.t2, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Draft a Team Training</Text>
            <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 12 }}>AI generates a training outline using your book knowledge, tailored to your audience.</Text>

            <Text style={{ color: COLORS.t2, fontSize: 12, marginBottom: 6 }}>Audience</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              {['General Team', 'Pros Only', 'Distributors'].map(a => (
                <TouchableOpacity key={a} onPress={() => setTrainAudience(a)} style={[s.diffBtn, trainAudience === a && { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '22' }]}>
                  <Text style={{ color: trainAudience === a ? COLORS.primary : COLORS.t3, fontSize: 10 }}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ color: COLORS.t2, fontSize: 12, marginBottom: 6 }}>Topic</Text>
            <TextInput value={trainTopic} onChangeText={setTrainTopic} placeholder="e.g. Prospecting, Mindset..."
              placeholderTextColor={COLORS.t3} style={[s.input, { marginBottom: 8 }]} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {trainTopics.map(t => (
                <TouchableOpacity key={t} onPress={() => setTrainTopic(t)} style={[s.chip, trainTopic === t && { borderColor: COLORS.warn, backgroundColor: COLORS.warn + '22' }]}>
                  <Text style={{ color: trainTopic === t ? COLORS.warn : COLORS.t3, fontSize: 10 }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={genTraining} disabled={loading} style={{ height: 44, borderRadius: 10, backgroundColor: loading ? COLORS.border : COLORS.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: COLORS.bg, fontWeight: '600', fontSize: 13 }}>{loading ? 'Generating...' : 'Generate training'}</Text>
            </TouchableOpacity>
          </View>

          {trainResult ? (
            <View style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.primary + '44' }}>
              <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>Training Draft — {trainAudience}</Text>
              <Text style={{ color: COLORS.t1, fontSize: 13, lineHeight: 20 }}>{trainResult}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <TouchableOpacity onPress={() => { /* clipboard */ }} style={{ flex: 1, height: 36, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: COLORS.t2, fontSize: 11 }}>Copy</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setTrainResult('')} style={{ flex: 1, height: 36, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: COLORS.t2, fontSize: 11 }}>Clear</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.t1, marginBottom: 8 },
  modeBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  modeBtnActive: { backgroundColor: COLORS.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  chipText: { color: COLORS.t2, fontSize: 10 },
  msgRow: { flexDirection: 'row', marginBottom: 10 },
  bubble: { maxWidth: '85%', padding: 12, borderRadius: 14 },
  userBubble: { backgroundColor: COLORS.accent + '22', borderWidth: 1, borderColor: COLORS.accent + '33' },
  aiBubble: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  msgText: { color: COLORS.t1, fontSize: 13, lineHeight: 20 },
  inputRow: { flexDirection: 'row', gap: 8, paddingBottom: 16 },
  input: { flex: 1, height: 44, borderRadius: 22, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, color: COLORS.t1, paddingHorizontal: 16, fontSize: 13 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  diffBtn: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  diffBtnActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accent + '22' },
});
