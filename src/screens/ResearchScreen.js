import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import { Card, Badge, Btn, Input, TabBar } from '../components/UI';
import { getData, setData, today, daysBetween } from '../utils/storage';
import { askClaude, hasApiKey } from '../utils/ai';
import { SELLABLE_SKILLS } from '../data/constants';

const TOPICS = [
  {
    id: 'hot-services',
    icon: '🔥',
    title: 'What is selling right now',
    sub: 'Services buyers are paying for this month',
    prompt: `Search the web for what freelance services are in highest demand RIGHT NOW on Fiverr and Upwork.

Focus on services a beginner-to-intermediate Nigerian freelancer could realistically deliver, and that a new team member could learn within 4-8 weeks.

For each of the top 5:
- Service name
- Why demand is rising now (cite what you found)
- Typical price range on Fiverr
- How long to learn it well enough to sell
- How saturated it is

Only use information from the last 60 days. If you cannot find recent data on something, say so rather than guessing. End with which ONE you would tell a beginner to start today and why.`,
  },
  {
    id: 'keywords',
    icon: '🔑',
    title: 'Keywords trending now',
    sub: 'What buyers are actually searching',
    prompt: `Search for current Fiverr and Upwork search trends and keyword data.

Find keywords and search terms that buyers are using NOW that have rising demand but are not yet saturated with sellers.

Give me 8-10 specific keyword phrases. For each:
- The exact phrase
- Why it is rising
- Rough competition level
- What kind of gig would rank for it

Prioritise anything that appeared or spiked in the last 60 days. Cite your sources with dates. Do not invent keyword volume numbers — if you do not have real data, say the data is not available and explain what you did find.`,
  },
  {
    id: 'new-jobs',
    icon: '💼',
    title: 'Where the work is',
    sub: 'Live job posts and hiring trends',
    prompt: `Search for current freelance job postings and hiring trends across Upwork, LinkedIn, RemoteOK, Wellfound and freelance job boards.

Tell me:
- What roles are being posted most in the last few weeks
- Budget ranges being offered
- Which platforms have the most volume right now
- Any platform that recently changed rules in a way that affects sellers

Focus on remote work open to Nigerian freelancers. Cite sources with dates. Be specific — name actual trends you found, not general advice.`,
  },
  {
    id: 'platform-news',
    icon: '📢',
    title: 'Platform changes',
    sub: 'Algorithm updates, policy changes',
    prompt: `Search for any recent changes to Fiverr, Upwork, or other freelance platforms in the last 60 days.

Look for:
- Algorithm or ranking changes
- New fee structures
- Policy changes affecting sellers
- New features sellers should use
- Account or gig restrictions people are reporting

Check Fiverr forums, Reddit r/Fiverr, YouTube from Fiverr coaches, and official announcements. For each change: what changed, when, what sellers should do about it, and where you found it. If nothing significant changed, say that plainly.`,
  },
  {
    id: 'team-income',
    icon: '👥',
    title: 'Fast income for my team',
    sub: 'What a beginner can earn from in 30 days',
    prompt: `Search for realistic fast-income freelance options for complete beginners in Nigeria in the current market.

My NeoLife team members need to make money online before they can afford NeoLife products. I need options where someone can realistically earn their first money within 30-45 days of starting.

For each option:
- What the work actually is
- What skill level is required
- Realistic first-month earnings
- Where the work comes from
- What equipment is needed (many only have a phone)

Be realistic, not optimistic. If something takes 6 months to earn from, say so. Prioritise options that work on a phone if possible. Cite recent sources.`,
  },
  {
    id: 'ai-tools',
    icon: '🤖',
    title: 'AI tools and niches',
    sub: 'New AI services people are selling',
    prompt: `Search for AI-related freelance services that are currently selling well and are not yet saturated.

Find:
- AI services being sold on Fiverr and Upwork right now
- New AI tools that have created service opportunities in the last 60 days
- What sellers are charging
- What skill is actually needed to deliver it

Focus on things a developer with existing skills could add quickly. Cite sources with dates and be honest about saturation.`,
  },
];

export default function ResearchScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(0);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(null);
  const [customQuery, setCustomQuery] = useState('');
  const [customResult, setCustomResult] = useState('');
  const [keyed, setKeyed] = useState(true);

  useEffect(() => {
    hasApiKey().then(setKeyed);
    getData('researchResults').then(r => { if (r) setResults(r); });
  }, []);

  const runResearch = async (topic) => {
    setLoading(topic.id);
    const res = await askClaude(topic.prompt, { maxTokens: 1800, webSearch: true });
    const entry = {
      text: res.ok ? res.text : res.error,
      ok: res.ok,
      date: today(),
      time: new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
    };
    const updated = { ...results, [topic.id]: entry };
    setResults(updated);
    await setData('researchResults', updated);
    setLoading(null);
  };

  const runCustom = async () => {
    if (!customQuery.trim()) return;
    setLoading('custom');
    setCustomResult('');
    const res = await askClaude(
      `Search the web and answer this for a Nigerian freelancer and network marketer. Use only current information from the last 60 days where possible, and cite what you found with dates. If you cannot find recent data, say so rather than guessing.\n\nQuestion: ${customQuery}`,
      { maxTokens: 1500, webSearch: true }
    );
    setCustomResult(res.ok ? res.text : res.error);
    setLoading(null);
  };

  const ResultBlock = ({ entry, topicId }) => {
    if (!entry) return null;
    const age = daysBetween(entry.date, today());
    return (
      <View style={{ marginTop: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Badge
            text={age === 0 ? `Today ${entry.time}` : age === 1 ? 'Yesterday' : `${age} days old`}
            color={age === 0 ? COLORS.primary : age <= 3 ? COLORS.warn : COLORS.danger}
          />
          <TouchableOpacity onPress={() => Share.share({ message: entry.text }).catch(() => {})}>
            <Text style={{ color: COLORS.t3, fontSize: 11 }}>Share</Text>
          </TouchableOpacity>
        </View>
        <View style={{ backgroundColor: COLORS.bg, borderRadius: 10, padding: 12, borderLeftWidth: 2, borderLeftColor: entry.ok ? COLORS.primary : COLORS.danger }}>
          <Text style={{ color: entry.ok ? COLORS.t2 : COLORS.danger, fontSize: 12, lineHeight: 19 }}>
            {entry.text}
          </Text>
        </View>
        {age >= 3 && (
          <Text style={{ color: COLORS.warn, fontSize: 10, marginTop: 6 }}>
            This is {age} days old. Markets move — run it again.
          </Text>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={[s.container, { paddingTop: insets.top + 12 }]} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={s.title}>Research</Text>
      <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 14 }}>
        Live web search · nothing from memory · always dated
      </Text>

      {!keyed && (
        <Card style={{ borderLeftWidth: 3, borderLeftColor: COLORS.warn }}>
          <Text style={{ color: COLORS.warn, fontSize: 12, fontWeight: '600' }}>API key needed</Text>
          <Text style={{ color: COLORS.t2, fontSize: 11, marginTop: 4, lineHeight: 17 }}>
            Research runs on live web search through Claude. Add your Anthropic API key in
            HQ → Settings → AI Key to switch it on.
          </Text>
        </Card>
      )}

      <TabBar tabs={['Topics', 'Ask anything']} active={tab} onChange={setTab} />

      {tab === 0 && (
        <View>
          {TOPICS.map(topic => {
            const entry = results[topic.id];
            const isLoading = loading === topic.id;
            return (
              <Card key={topic.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <View style={s.iconBox}><Text style={{ fontSize: 18 }}>{topic.icon}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: COLORS.t1, fontSize: 14, fontWeight: '600' }}>{topic.title}</Text>
                    <Text style={{ color: COLORS.t3, fontSize: 10 }}>{topic.sub}</Text>
                  </View>
                </View>

                <Btn full outline onPress={() => runResearch(topic)} style={{ height: 36 }}>
                  {isLoading ? 'Searching the web...' : entry ? 'Run again' : 'Research now'}
                </Btn>

                <ResultBlock entry={entry} topicId={topic.id} />
              </Card>
            );
          })}
        </View>
      )}

      {tab === 1 && (
        <View>
          <Card>
            <Text style={{ color: COLORS.t2, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
              Ask anything, get current answers
            </Text>
            <Text style={{ color: COLORS.t3, fontSize: 11, marginBottom: 10, lineHeight: 17 }}>
              This searches the live web every time. Ask about a niche, a competitor, a platform
              change, a price, a trend — anything where the answer changes over time.
            </Text>
            <Input value={customQuery} onChangeText={setCustomQuery}
              placeholder="e.g. Is Shopify theme dev still worth it on Fiverr?" />
            <Btn full onPress={runCustom} style={{ marginTop: 10 }}>
              {loading === 'custom' ? 'Searching...' : 'Search the web'}
            </Btn>
          </Card>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {[
              'Best Fiverr niche for beginners in Nigeria',
              'Is video editing saturated on Fiverr',
              'What can someone sell with only a phone',
              'Upwork proposal tips that work now',
              'Cheapest way to learn Shopify',
            ].map(q => (
              <TouchableOpacity key={q} onPress={() => setCustomQuery(q)} style={s.chip}>
                <Text style={{ color: COLORS.t3, fontSize: 10 }}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {customResult ? (
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Badge text="Live result" color={COLORS.primary} />
                <TouchableOpacity onPress={() => Share.share({ message: customResult }).catch(() => {})}>
                  <Text style={{ color: COLORS.t3, fontSize: 11 }}>Share</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ color: COLORS.t2, fontSize: 12, lineHeight: 19 }}>{customResult}</Text>
            </Card>
          ) : null}
        </View>
      )}

      <Card style={{ backgroundColor: COLORS.surface }}>
        <Text style={{ color: COLORS.t3, fontSize: 10, lineHeight: 16 }}>
          Every answer here comes from a live web search at the moment you tap the button.
          Nothing is pulled from the model's memory. Results are stamped with the date they
          were pulled, and flagged when they go stale.
        </Text>
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.t1, marginBottom: 2 },
  iconBox: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
});