import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from './src/theme';
import { getData, setData, today } from './src/utils/storage';
import { DEFAULT_ACTIONS } from './src/data/constants';

import LockScreen from './src/screens/LockScreen';
import HomeScreen from './src/screens/HomeScreen';
import DailyBriefScreen from './src/screens/DailyBriefScreen';
import NeoLifeScreen from './src/screens/NeoLifeScreen';
import PipelineScreen from './src/screens/PipelineScreen';
import FocusScreen from './src/screens/FocusScreen';
import FiverrScreen from './src/screens/FiverrScreen';
import GrowthScreen from './src/screens/GrowthScreen';
import SpendingScreen from './src/screens/SpendingScreen';
import ScoreScreen from './src/screens/ScoreScreen';
import JournalScreen from './src/screens/JournalScreen';
import WeeklyReviewScreen from './src/screens/WeeklyReviewScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AIScreen from './src/screens/AIScreen';

const Tab = createBottomTabNavigator();

const TabIcon = ({ icon, label, focused }) => (
  <View style={{ alignItems: 'center', gap: 2 }}>
    {focused && <View style={{ width: 16, height: 3, borderRadius: 2, backgroundColor: COLORS.primary, marginBottom: 2 }} />}
    <Text style={{ fontSize: 16, color: focused ? COLORS.primary : COLORS.t3 }}>{icon}</Text>
    <Text style={{ fontSize: 8, color: focused ? COLORS.primary : COLORS.t3, fontWeight: focused ? '600' : '400' }}>{label}</Text>
  </View>
);

// Sub-navigation pill row shown at the top of tabs that have multiple views
const SubNav = ({ items, active, onChange }) => {
  const insets = useSafeAreaInsets();
  return (
  <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingTop: insets.top + 8, paddingBottom: 4, backgroundColor: COLORS.bg }}>
    {items.map(it => (
      <TouchableOpacity key={it.key} onPress={() => onChange(it.key)}
        style={{
          flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
          backgroundColor: active === it.key ? COLORS.primary : COLORS.surface,
        }}>
        <Text style={{ color: active === it.key ? COLORS.bg : COLORS.t3, fontSize: 11, fontWeight: '600' }}>
          {it.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
  );
};

export default function App() {
  const [locked, setLocked] = useState(true);
  const [appData, setAppData] = useState({ qpv: 0, streak: 0 });
  const [team, setTeam] = useState([]);
  const [prospects, setProspects] = useState([]);
  const [dailyActions, setDailyActions] = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [spending, setSpending] = useState([]);
  const [books, setBooks] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [gigs, setGigs] = useState([]);
  const [journal, setJournal] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // Sub-view state per tab
  const [hqView, setHqView] = useState('home');       // home | brief | settings
  const [moneyView, setMoneyView] = useState('earn'); // earn | spend
  const [scoreView, setScoreView] = useState('score'); // score | journal | review

  useEffect(() => {
    Promise.all([
      getData('appData'), getData('team'), getData('prospects'),
      getData('da_' + today()), getData('earnings'), getData('spending'),
      getData('books'), getData('fiverrAccounts'), getData('fiverrGigs'),
      getData('journal'),
    ]).then(([d, t, p, a, e, sp, b, fa, fg, j]) => {
      if (d) setAppData(d);
      if (t) setTeam(t);
      if (p) setProspects(p);
      setDailyActions(a || DEFAULT_ACTIONS.map(x => ({ ...x })));
      if (e) setEarnings(e);
      if (sp) setSpending(sp);
      if (b) setBooks(b);
      if (fa) setAccounts(fa);
      if (fg) setGigs(fg);
      if (j) setJournal(j);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    setData('appData', appData); setData('team', team);
    setData('prospects', prospects); setData('da_' + today(), dailyActions);
    setData('earnings', earnings); setData('spending', spending);
    setData('books', books); setData('fiverrAccounts', accounts);
    setData('fiverrGigs', gigs); setData('journal', journal);
  }, [appData, team, prospects, dailyActions, earnings, spending, books, accounts, gigs, journal, loaded]);

  const toggleAction = (id) => setDailyActions(prev => prev.map(a => a.id === id ? { ...a, done: !a.done } : a));

  if (locked) return (<SafeAreaProvider><StatusBar style="light" /><LockScreen onUnlock={() => setLocked(false)} /></SafeAreaProvider>);

  const darkTheme = {
    dark: true,
    colors: { primary: COLORS.primary, background: COLORS.bg, card: COLORS.bg, text: COLORS.t1, border: COLORS.border, notification: COLORS.primary },
  };

  return (
    <SafeAreaProvider><StatusBar style="light" />
    <NavigationContainer theme={darkTheme}>
      <Tab.Navigator screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: COLORS.bg, borderTopColor: COLORS.border, borderTopWidth: 1, height: 60, paddingBottom: 8, paddingTop: 4 },
        tabBarShowLabel: false,
      }}>

        {/* HQ: home | attack plan | settings */}
        <Tab.Screen name="HQ" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="⌂" label="HQ" focused={focused} /> }}>
          {() => (
            <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
              <SubNav
                items={[
                  { key: 'home', label: 'Home' },
                  { key: 'brief', label: 'Attack Plan' },
                  { key: 'settings', label: 'Settings' },
                ]}
                active={hqView} onChange={setHqView} />
              {hqView === 'home' && (
                <HomeScreen data={appData} dailyActions={dailyActions} toggleAction={toggleAction}
                  team={team} prospects={prospects} onOpenBrief={() => setHqView('brief')} />
              )}
              {hqView === 'brief' && (
                <DailyBriefScreen team={team} prospects={prospects} data={appData} books={books} />
              )}
              {hqView === 'settings' && (
                <SettingsScreen team={team} prospects={prospects} earnings={earnings}
                  spending={spending} books={books} accounts={accounts} gigs={gigs}
                  journal={journal} data={appData} />
              )}
            </View>
          )}
        </Tab.Screen>

        <Tab.Screen name="NeoLife" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="◈" label="NeoLife" focused={focused} /> }}>
          {() => <NeoLifeScreen team={team} setTeam={setTeam} data={appData} setData={setAppData} />}
        </Tab.Screen>

        <Tab.Screen name="Pipeline" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="◎" label="Pipeline" focused={focused} /> }}>
          {() => <PipelineScreen prospects={prospects} setProspects={setProspects} />}
        </Tab.Screen>

        <Tab.Screen name="Focus" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="⏱" label="Focus" focused={focused} /> }}>
          {() => <FocusScreen />}
        </Tab.Screen>

        <Tab.Screen name="Fiverr" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="💼" label="Fiverr" focused={focused} /> }}>
          {() => <FiverrScreen accounts={accounts} setAccounts={setAccounts} gigs={gigs} setGigs={setGigs} />}
        </Tab.Screen>

        {/* Money: earnings+books | spending */}
        <Tab.Screen name="Money" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="📈" label="Money" focused={focused} /> }}>
          {() => (
            <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
              <SubNav
                items={[
                  { key: 'earn', label: 'Earn & Read' },
                  { key: 'spend', label: 'Spending' },
                ]}
                active={moneyView} onChange={setMoneyView} />
              {moneyView === 'earn' && (
                <GrowthScreen earnings={earnings} setEarnings={setEarnings} books={books} setBooks={setBooks} />
              )}
              {moneyView === 'spend' && (
                <SpendingScreen spending={spending} setSpending={setSpending} earnings={earnings} />
              )}
            </View>
          )}
        </Tab.Screen>

        {/* Score: score | journal | weekly review */}
        <Tab.Screen name="Score" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="★" label="Score" focused={focused} /> }}>
          {() => (
            <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
              <SubNav
                items={[
                  { key: 'score', label: 'Score' },
                  { key: 'journal', label: 'Journal' },
                  { key: 'review', label: 'Weekly' },
                ]}
                active={scoreView} onChange={setScoreView} />
              {scoreView === 'score' && <ScoreScreen dailyActions={dailyActions} data={appData} />}
              {scoreView === 'journal' && <JournalScreen entries={journal} setEntries={setJournal} />}
              {scoreView === 'review' && (
                <WeeklyReviewScreen data={appData} team={team} prospects={prospects}
                  earnings={earnings} dailyActions={dailyActions} books={books} />
              )}
            </View>
          )}
        </Tab.Screen>

        <Tab.Screen name="AI" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="🧠" label="AI" focused={focused} /> }}>
          {() => <AIScreen />}
        </Tab.Screen>

      </Tab.Navigator>
    </NavigationContainer></SafeAreaProvider>
  );
}
