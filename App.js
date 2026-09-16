import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { COLORS } from './src/theme';
import { getData, setData, today } from './src/utils/storage';
import { DEFAULT_ACTIONS } from './src/data/constants';

import OnboardingScreen from './src/screens/OnboardingScreen';
import LockScreen from './src/screens/LockScreen';
import HomeScreen from './src/screens/HomeScreen';
import DailyBriefScreen from './src/screens/DailyBriefScreen';
import NeoLifeScreen from './src/screens/NeoLifeScreen';
import PipelineScreen from './src/screens/PipelineScreen';
import FocusScreen from './src/screens/FocusScreen';
import FiverrScreen from './src/screens/FiverrScreen';
import ResearchScreen from './src/screens/ResearchScreen';
import SkillsScreen from './src/screens/SkillsScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import GrowthScreen from './src/screens/GrowthScreen';
import SpendingScreen from './src/screens/SpendingScreen';
import ScoreScreen from './src/screens/ScoreScreen';
import JournalScreen from './src/screens/JournalScreen';
import WeeklyReviewScreen from './src/screens/WeeklyReviewScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import MoreScreen from './src/screens/MoreScreen';
import AIScreen from './src/screens/AIScreen';

const Tab = createBottomTabNavigator();

// Five tabs only. Bigger icons, readable labels.
const TabIcon = ({ icon, label, focused }) => (
  <View style={{ alignItems: 'center', width: 70 }}>
    {focused && <View style={{ width: 22, height: 3, borderRadius: 2, backgroundColor: COLORS.primary, marginBottom: 4 }} />}
    <Text style={{ fontSize: 22, color: focused ? COLORS.primary : COLORS.t3, marginBottom: 2 }}>{icon}</Text>
    <Text style={{ fontSize: 11, color: focused ? COLORS.primary : COLORS.t3, fontWeight: focused ? '700' : '500' }}>
      {label}
    </Text>
  </View>
);

export default function App() {
  const [locked, setLocked] = useState(true);
  const [onboarded, setOnboarded] = useState(null);
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

  const [hqView, setHqView] = useState('home');
  const [moreView, setMoreView] = useState(null);

  useEffect(() => {
    Promise.all([
      getData('appData'), getData('team'), getData('prospects'),
      getData('da_' + today()), getData('earnings'), getData('spending'),
      getData('books'), getData('fiverrAccounts'), getData('fiverrGigs'),
      getData('journal'), getData('onboarded'),
    ]).then(([d, t, p, a, e, sp, b, fa, fg, j, ob]) => {
      setOnboarded(!!ob);
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

  // Debounced saving. Writing ten AsyncStorage keys on every keystroke was
  // what made the app feel sluggish — now it batches after 600ms of quiet.
  const saveTimer = useRef(null);
  useEffect(() => {
    if (!loaded) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setData('appData', appData);
      setData('team', team);
      setData('prospects', prospects);
      setData('da_' + today(), dailyActions);
      setData('earnings', earnings);
      setData('spending', spending);
      setData('books', books);
      setData('fiverrAccounts', accounts);
      setData('fiverrGigs', gigs);
      setData('journal', journal);
    }, 600);
    return () => clearTimeout(saveTimer.current);
  }, [appData, team, prospects, dailyActions, earnings, spending, books, accounts, gigs, journal, loaded]);

  const toggleAction = useCallback((id) => {
    setDailyActions(prev => prev.map(a => a.id === id ? { ...a, done: !a.done } : a));
  }, []);

  if (onboarded === null) {
    return (<SafeAreaProvider><StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: COLORS.bg }} /></SafeAreaProvider>);
  }

  if (!onboarded) {
    return (<SafeAreaProvider><StatusBar style="light" />
      <OnboardingScreen onDone={() => { setOnboarded(true); setLocked(false); }} /></SafeAreaProvider>);
  }

  if (locked) {
    return (<SafeAreaProvider><StatusBar style="light" /><LockScreen onUnlock={() => setLocked(false)} /></SafeAreaProvider>);
  }

  const darkTheme = {
    dark: true,
    colors: { primary: COLORS.primary, background: COLORS.bg, card: COLORS.bg, text: COLORS.t1, border: COLORS.border, notification: COLORS.primary },
  };

  // Everything reachable from the More tab
  const renderMore = () => {
    const back = () => setMoreView(null);
    switch (moreView) {
      case 'focus':    return <FocusScreen />;
      case 'fiverr':   return <FiverrScreen accounts={accounts} setAccounts={setAccounts} gigs={gigs} setGigs={setGigs} />;
      case 'research': return <ResearchScreen />;
      case 'skills':   return <SkillsScreen accounts={accounts} gigs={gigs} earnings={earnings} />;
      case 'leaderboard': return <LeaderboardScreen team={team} />;
      case 'money':    return <GrowthScreen earnings={earnings} setEarnings={setEarnings} books={books} setBooks={setBooks} />;
      case 'books':    return <GrowthScreen earnings={earnings} setEarnings={setEarnings} books={books} setBooks={setBooks} />;
      case 'spending': return <SpendingScreen spending={spending} setSpending={setSpending} earnings={earnings} />;
      case 'score':    return <ScoreScreen dailyActions={dailyActions} data={appData} />;
      case 'journal':  return <JournalScreen entries={journal} setEntries={setJournal} />;
      case 'review':   return <WeeklyReviewScreen data={appData} team={team} prospects={prospects} earnings={earnings} dailyActions={dailyActions} books={books} />;
      case 'settings': return <SettingsScreen team={team} prospects={prospects} earnings={earnings} spending={spending} books={books} accounts={accounts} gigs={gigs} journal={journal} data={appData} />;
      default:         return <MoreScreen onSelect={setMoreView} />;
    }
  };

  return (
    <SafeAreaProvider><StatusBar style="light" />
    <NavigationContainer theme={darkTheme}>
      <Tab.Navigator screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.bg,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 74,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
      }}>

        <Tab.Screen name="HQ" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="⌂" label="HQ" focused={focused} /> }}>
          {() => (
            <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
              {hqView === 'home' ? (
                <HomeScreen data={appData} dailyActions={dailyActions} toggleAction={toggleAction}
                  team={team} prospects={prospects} onOpenBrief={() => setHqView('brief')} />
              ) : (
                <DailyBriefScreen team={team} prospects={prospects} data={appData} books={books}
                  onBack={() => setHqView('home')} />
              )}
            </View>
          )}
        </Tab.Screen>

        <Tab.Screen name="Team" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="◈" label="Team" focused={focused} /> }}>
          {() => <NeoLifeScreen team={team} setTeam={setTeam} data={appData} setData={setAppData} />}
        </Tab.Screen>

        <Tab.Screen name="Pipeline" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="◎" label="Pipeline" focused={focused} /> }}>
          {() => <PipelineScreen prospects={prospects} setProspects={setProspects} />}
        </Tab.Screen>

        <Tab.Screen name="AI" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="🧠" label="AI" focused={focused} /> }}>
          {() => <AIScreen />}
        </Tab.Screen>

        <Tab.Screen name="More"
          options={{ tabBarIcon: ({ focused }) => <TabIcon icon="☰" label="More" focused={focused} /> }}
          listeners={{ tabPress: () => setMoreView(null) }}>
          {() => (
            <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
              {moreView && (
                <View style={{ paddingHorizontal: 16, paddingTop: 48, backgroundColor: COLORS.bg }}>
                  <Text onPress={() => setMoreView(null)} style={{ color: COLORS.primary, fontSize: 14, paddingVertical: 6 }}>
                    ← All features
                  </Text>
                </View>
              )}
              {renderMore()}
            </View>
          )}
        </Tab.Screen>

      </Tab.Navigator>
    </NavigationContainer></SafeAreaProvider>
  );
}
