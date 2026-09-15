import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { COLORS } from './src/theme';
import { getData, setData, today } from './src/utils/storage';
import { DEFAULT_ACTIONS } from './src/data/constants';

import LockScreen from './src/screens/LockScreen';
import HomeScreen from './src/screens/HomeScreen';
import DailyBriefScreen from './src/screens/DailyBriefScreen';
import NeoLifeScreen from './src/screens/NeoLifeScreen';
import AddDownlineScreen from './src/screens/AddDownlineScreen';
import PipelineScreen from './src/screens/PipelineScreen';
import FocusScreen from './src/screens/FocusScreen';
import FiverrScreen from './src/screens/FiverrScreen';
import GrowthScreen from './src/screens/GrowthScreen';
import ScoreScreen from './src/screens/ScoreScreen';
import SpendingScreen from './src/screens/SpendingScreen';
import JournalScreen from './src/screens/JournalScreen';
import WeeklyReviewScreen from './src/screens/WeeklyReviewScreen';
import AIScreen from './src/screens/AIScreen';

const Tab = createBottomTabNavigator();

const TabIcon = ({ icon, label, focused }) => (
  <View style={{ alignItems: 'center', gap: 2 }}>
    {focused && <View style={{ width: 16, height: 3, borderRadius: 2, backgroundColor: COLORS.primary, marginBottom: 2 }} />}
    <Text style={{ fontSize: 16, color: focused ? COLORS.primary : COLORS.t3 }}>{icon}</Text>
    <Text style={{ fontSize: 8, color: focused ? COLORS.primary : COLORS.t3, fontWeight: focused ? '600' : '400' }}>{label}</Text>
  </View>
);

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
  const [showBrief, setShowBrief] = useState(false);

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
        tabBarStyle: { backgroundColor: COLORS.bg + 'ee', borderTopColor: COLORS.border, borderTopWidth: 1, height: 60, paddingBottom: 8, paddingTop: 4 },
        tabBarShowLabel: false,
      }}>
        <Tab.Screen name="HQ" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="⌂" label="HQ" focused={focused} /> }}>
          {() => showBrief ? (
            <DailyBriefScreen team={team} prospects={prospects} data={appData} books={books} onBack={() => setShowBrief(false)} />
          ) : (
            <HomeScreen data={appData} dailyActions={dailyActions} toggleAction={toggleAction}
              team={team} prospects={prospects} onOpenBrief={() => setShowBrief(true)} />
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
        <Tab.Screen name="Growth" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="📈" label="Growth" focused={focused} /> }}>
          {() => <GrowthScreen earnings={earnings} setEarnings={setEarnings} books={books} setBooks={setBooks} />}
        </Tab.Screen>
        <Tab.Screen name="Score" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="★" label="Score" focused={focused} /> }}>
          {() => <ScoreScreen dailyActions={dailyActions} data={appData} />}
        </Tab.Screen>
        <Tab.Screen name="AI" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="🧠" label="AI" focused={focused} /> }}>
          {() => <AIScreen />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer></SafeAreaProvider>
  );
}
