import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import { Card, Badge, ProgressBar, Btn, Input, TabBar } from '../components/UI';
import { getData, setData, today, daysBetween } from '../utils/storage';
import { askClaude } from '../utils/ai';

export default function SkillsScreen({ accounts, gigs, earnings }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(0);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [testResult, setTestResult] = useState({});
  const [testAnswer, setTestAnswer] = useState({});
  const [customSkill, setCustomSkill] = useState('');

  useEffect(() => {
    getData('skills').then(s => { if (s) setSkills(s); });
    getData('skillRecommendation').then(r => { if (r) setRecommendation(r); });
  }, []);

  const save = async (next) => {
    setSkills(next);
    await setData('skills', next);
  };

  const monthKey = today().slice(0, 7);
  const currentSkill = skills.find(s => s.month === monthKey && !s.completed);
  const completed = skills.filter(s => s.completed);

  // ─── Get this month's recommendation ───
  const getRecommendation = async () => {
    setLoading('rec');
    const niches = (accounts || []).map(a => a.niche).filter(Boolean).join(', ') || 'Shopify, web development';
    const gigTitles = (gigs || []).map(g => g.title).slice(0, 5).join('; ') || 'none logged';
    const learned = completed.map(s => s.name).join(', ') || 'none yet';

    const res = await askClaude(
      `Search the web for what freelance skill I should learn this month.

MY SITUATION:
- Nigerian freelance developer, ${(accounts || []).length} Fiverr accounts
- Current niches: ${niches}
- My gigs: ${gigTitles}
- Skills I have already mastered through this app: ${learned}
- Existing stack: Flutter, React Native, Node.js, Laravel, Shopify/Liquid

Find ONE skill I should learn this month. It must:
- Have rising demand on Fiverr or Upwork right now (verify with current search)
- Not be saturated
- Build on what I already know, so I can learn it in 3-4 weeks
- Let me charge more than my current gigs

Answer with exactly this structure:

SKILL: [name, 5 words max]
WHY NOW: [2 sentences with what you found, including dates]
DEMAND: [what you found about current demand]
PRICE RANGE: [what sellers charge for this]
WEEK 1: [specific learning task]
WEEK 2: [specific learning task]
WEEK 3: [specific learning task]
WEEK 4: [build this exact project]
RESOURCES: [3 specific free resources, named]

Be specific. No vague advice. Cite what you found.`,
      { maxTokens: 1400, webSearch: true }
    );

    if (res.ok) {
      const parsed = { text: res.text, date: today(), month: monthKey };
      setRecommendation(parsed);
      await setData('skillRecommendation', parsed);
    } else {
      setRecommendation({ text: res.error, date: today(), month: monthKey, error: true });
    }
    setLoading(null);
  };

  // ─── Start a skill ───
  const startSkill = async (name) => {
    if (!name.trim()) return;
    const entry = {
      id: Date.now(),
      name: name.trim(),
      month: monthKey,
      started: today(),
      daysStudied: [],
      completed: false,
      score: null,
      plan: recommendation?.text || null,
    };
    await save([...skills, entry]);
    setCustomSkill('');
    setTab(1);
  };

  const logStudy = async (id) => {
    const next = skills.map(s => {
      if (s.id !== id) return s;
      if ((s.daysStudied || []).includes(today())) return s;
      return { ...s, daysStudied: [...(s.daysStudied || []), today()] };
    });
    await save(next);
  };

  // ─── Mastery test ───
  const generateTest = async (skill) => {
    setLoading('test-' + skill.id);
    const res = await askClaude(
      `I have been learning "${skill.name}" for ${daysBetween(skill.started, today())} days as a freelance developer.

Give me ONE realistic client scenario that tests whether I can actually deliver this skill professionally. It should be the kind of brief a real Fiverr buyer would send.

Format:
CLIENT BRIEF: [the scenario, 3-4 sentences, like a real buyer wrote it]
WHAT I MUST COVER: [4-5 specific things a competent answer must address]

Do not give the answer. Just the brief and the checklist. Under 200 words.`,
      { maxTokens: 700 }
    );
    setTestResult(prev => ({ ...prev, [skill.id]: { brief: res.ok ? res.text : res.error, graded: null } }));
    setLoading(null);
  };

  const submitTest = async (skill) => {
    const answer = testAnswer[skill.id];
    if (!answer || answer.trim().length < 30) return;
    setLoading('grade-' + skill.id);
    const brief = testResult[skill.id]?.brief || '';
    const res = await askClaude(
      `Grade this freelancer's answer to a client brief. Be honest and strict — a soft grade helps nobody.

SKILL BEING TESTED: ${skill.name}

THE BRIEF:
${brief}

THEIR ANSWER:
${answer}

Respond exactly like this:
SCORE: [0-100]
VERDICT: [one sentence — can they take paid work in this skill or not]
STRONG: [what they got right]
WEAK: [what a real client would push back on]
FIX THIS FIRST: [the single most important gap]

Pass mark is 70. Under 250 words.`,
      { maxTokens: 900 }
    );

    const text = res.ok ? res.text : res.error;
    const scoreMatch = text.match(/SCORE:\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : null;

    setTestResult(prev => ({ ...prev, [skill.id]: { ...prev[skill.id], graded: text, score } }));

    if (score !== null && score >= 70) {
      await save(skills.map(s => s.id === skill.id
        ? { ...s, completed: true, score, completedDate: today() }
        : s));
    } else if (score !== null) {
      await save(skills.map(s => s.id === skill.id ? { ...s, score } : s));
    }
    setLoading(null);
  };

  return (
    <ScrollView style={[s.container, { paddingTop: 12 }]} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={s.title}>Skill Path</Text>
      <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 14 }}>
        One skill a month · graded, not guessed
      </Text>

      <TabBar tabs={['This month', 'In progress', 'Mastered']} active={tab} onChange={setTab} />

      {/* ─── THIS MONTH ─── */}
      {tab === 0 && (
        <View>
          {currentSkill ? (
            <Card glow={COLORS.accent}>
              <Text style={{ color: COLORS.accent, fontSize: 10, fontWeight: '600', letterSpacing: 1 }}>
                LEARNING NOW
              </Text>
              <Text style={{ color: COLORS.t1, fontSize: 18, fontWeight: '700', marginTop: 4 }}>
                {currentSkill.name}
              </Text>
              <Text style={{ color: COLORS.t3, fontSize: 11, marginTop: 2 }}>
                Day {daysBetween(currentSkill.started, today()) + 1} · {(currentSkill.daysStudied || []).length} days studied
              </Text>
              <ProgressBar value={(currentSkill.daysStudied || []).length} max={20} color={COLORS.accent} height={6} />
              <Text style={{ color: COLORS.t3, fontSize: 10, marginTop: 6 }}>
                20 study days before the mastery test unlocks
              </Text>
            </Card>
          ) : (
            <Card>
              <Text style={{ color: COLORS.t2, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
                No skill started this month
              </Text>
              <Text style={{ color: COLORS.t3, fontSize: 11, lineHeight: 17 }}>
                Pick one skill, give it a month, prove it with a test. Scattered learning across
                five things at once produces nothing sellable.
              </Text>
            </Card>
          )}

          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: COLORS.t2, fontSize: 13, fontWeight: '600' }}>What to learn this month</Text>
              {recommendation?.month === monthKey && <Badge text="Current" color={COLORS.primary} />}
            </View>
            <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 10, lineHeight: 17 }}>
              Searches live demand on Fiverr and Upwork, checks it against your existing niches
              and what you have already mastered, then picks one skill with a four-week plan.
            </Text>
            <Btn full outline onPress={getRecommendation}>
              {loading === 'rec' ? 'Searching the market...' : recommendation ? 'Get a fresh recommendation' : 'Recommend a skill'}
            </Btn>

            {recommendation && (
              <View style={{ marginTop: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Badge
                    text={recommendation.date === today() ? 'Fresh today' : `${daysBetween(recommendation.date, today())} days old`}
                    color={recommendation.date === today() ? COLORS.primary : COLORS.warn}
                  />
                  <TouchableOpacity onPress={() => Share.share({ message: recommendation.text }).catch(() => {})}>
                    <Text style={{ color: COLORS.t3, fontSize: 11 }}>Share</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ backgroundColor: COLORS.bg, borderRadius: 10, padding: 12, borderLeftWidth: 2, borderLeftColor: recommendation.error ? COLORS.danger : COLORS.primary }}>
                  <Text style={{ color: recommendation.error ? COLORS.danger : COLORS.t2, fontSize: 12, lineHeight: 19 }}>
                    {recommendation.text}
                  </Text>
                </View>
              </View>
            )}
          </Card>

          <Card>
            <Text style={{ color: COLORS.t2, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>
              Start a skill
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Input value={customSkill} onChangeText={setCustomSkill} placeholder="Skill name" />
              </View>
              <Btn onPress={() => startSkill(customSkill)}>Start</Btn>
            </View>
            <Text style={{ color: COLORS.t3, fontSize: 10, marginTop: 8 }}>
              Starting a skill saves the current plan alongside it.
            </Text>
          </Card>
        </View>
      )}

      {/* ─── IN PROGRESS ─── */}
      {tab === 1 && (
        <View>
          {skills.filter(sk => !sk.completed).length === 0 && (
            <Card style={{ alignItems: 'center', padding: 26 }}>
              <Text style={{ fontSize: 26, marginBottom: 8 }}>🧠</Text>
              <Text style={{ color: COLORS.t2, fontSize: 13 }}>Nothing in progress</Text>
              <Text style={{ color: COLORS.t3, fontSize: 11, marginTop: 4 }}>
                Start a skill from the This Month tab
              </Text>
            </Card>
          )}

          {skills.filter(sk => !sk.completed).map(sk => {
            const days = (sk.daysStudied || []).length;
            const studiedToday = (sk.daysStudied || []).includes(today());
            const testReady = days >= 20;
            const test = testResult[sk.id];

            return (
              <Card key={sk.id}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: COLORS.t1, fontSize: 16, fontWeight: '700' }}>{sk.name}</Text>
                  <Badge text={`${days}/20 days`} color={testReady ? COLORS.primary : COLORS.accent} />
                </View>
                <ProgressBar value={days} max={20} color={testReady ? COLORS.primary : COLORS.accent} height={6} />
                <Text style={{ color: COLORS.t3, fontSize: 10, marginTop: 6 }}>
                  Started {sk.started} · {sk.score !== null && sk.score !== undefined ? `last test scored ${sk.score}` : 'not tested yet'}
                </Text>

                <Btn full color={studiedToday ? COLORS.border : COLORS.primary}
                  onPress={() => logStudy(sk.id)} style={{ marginTop: 10 }}>
                  {studiedToday ? 'Studied today ✓' : 'Log today\'s study'}
                </Btn>

                {testReady && (
                  <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border }}>
                    <Text style={{ color: COLORS.t2, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>
                      Mastery test
                    </Text>

                    {!test?.brief ? (
                      <Btn full outline onPress={() => generateTest(sk)}>
                        {loading === 'test-' + sk.id ? 'Writing the brief...' : 'Get a client brief'}
                      </Btn>
                    ) : (
                      <View>
                        <View style={{ backgroundColor: COLORS.bg, borderRadius: 10, padding: 12, borderLeftWidth: 2, borderLeftColor: COLORS.warn }}>
                          <Text style={{ color: COLORS.t2, fontSize: 12, lineHeight: 18 }}>{test.brief}</Text>
                        </View>

                        {!test.graded ? (
                          <View style={{ marginTop: 10 }}>
                            <Text style={{ color: COLORS.t2, fontSize: 12, marginBottom: 6 }}>
                              Write how you would handle this brief
                            </Text>
                            <Input
                              value={testAnswer[sk.id] || ''}
                              onChangeText={(v) => setTestAnswer(prev => ({ ...prev, [sk.id]: v }))}
                              placeholder="Your approach, step by step..."
                            />
                            <Btn full onPress={() => submitTest(sk)} style={{ marginTop: 10 }}>
                              {loading === 'grade-' + sk.id ? 'Grading...' : 'Submit for grading'}
                            </Btn>
                          </View>
                        ) : (
                          <View style={{ marginTop: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <Badge
                                text={test.score >= 70 ? `Passed · ${test.score}` : `Scored ${test.score} · need 70`}
                                color={test.score >= 70 ? COLORS.primary : COLORS.danger}
                              />
                            </View>
                            <View style={{ backgroundColor: COLORS.bg, borderRadius: 10, padding: 12, borderLeftWidth: 2, borderLeftColor: test.score >= 70 ? COLORS.primary : COLORS.danger }}>
                              <Text style={{ color: COLORS.t2, fontSize: 12, lineHeight: 18 }}>{test.graded}</Text>
                            </View>
                            {test.score < 70 && (
                              <Btn full outline onPress={() => {
                                setTestResult(prev => ({ ...prev, [sk.id]: null }));
                                setTestAnswer(prev => ({ ...prev, [sk.id]: '' }));
                              }} style={{ marginTop: 10 }}>
                                Try a new brief
                              </Btn>
                            )}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                )}

                {!testReady && (
                  <Text style={{ color: COLORS.t3, fontSize: 10, marginTop: 8 }}>
                    {20 - days} more study days before the test unlocks
                  </Text>
                )}
              </Card>
            );
          })}
        </View>
      )}

      {/* ─── MASTERED ─── */}
      {tab === 2 && (
        <View>
          {completed.length === 0 ? (
            <Card style={{ alignItems: 'center', padding: 26 }}>
              <Text style={{ fontSize: 26, marginBottom: 8 }}>🏆</Text>
              <Text style={{ color: COLORS.t2, fontSize: 13 }}>Nothing mastered yet</Text>
              <Text style={{ color: COLORS.t3, fontSize: 11, marginTop: 4, textAlign: 'center' }}>
                Pass a mastery test at 70 or above and the skill lands here
              </Text>
            </Card>
          ) : (
            <>
              <Card>
                <Text style={{ color: COLORS.t3, fontSize: 10, fontWeight: '600', letterSpacing: 1 }}>
                  SKILLS PROVEN
                </Text>
                <Text style={{ fontSize: 32, fontWeight: '800', color: COLORS.primary, marginTop: 4 }}>
                  {completed.length}
                </Text>
                <Text style={{ color: COLORS.t3, fontSize: 11 }}>
                  Average score {Math.round(completed.reduce((s, x) => s + (x.score || 0), 0) / completed.length)}
                </Text>
              </Card>

              {completed.map(sk => (
                <Card key={sk.id} style={{ padding: 13, borderLeftWidth: 3, borderLeftColor: COLORS.primary }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: COLORS.t1, fontSize: 15, fontWeight: '600' }}>{sk.name}</Text>
                      <Text style={{ color: COLORS.t3, fontSize: 10 }}>
                        {(sk.daysStudied || []).length} study days · passed {sk.completedDate}
                      </Text>
                    </View>
                    <Badge text={String(sk.score)} color={COLORS.primary} />
                  </View>
                </Card>
              ))}
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.t1, marginBottom: 2 },
});