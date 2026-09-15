import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import { COLORS } from './src/theme';
import { getData, setData, today } from './src/utils/storage';
import { DEFAULT_ACTIONS } from './src/data/constants';

import LockScreen from './src/screens/LockScreen';
import HomeScreen from './src/screens/HomeScreen';
import NeoLifeScreen from './src/screens/NeoLifeScreen';
import PipelineScreen from './src/screens/PipelineScreen';
import FocusScreen from './src/screens/FocusScreen';
import FiverrScreen from './src/screens/FiverrScreen';
import GrowthScreen from './src/screens/GrowthScreen';
import AIScreen from './src/screens/AIScreen';

const Tab = createBottomTabNavigator();

const TabIcon = ({ icon, label, focused }) => (
  <View style={{ alignItems: 'center', gap: 2 }}>
    {focused && <View style={{ width: 16, height: 3, borderRadius: 2, backgroundColor: COLORS.primary, marginBottom: 2 }} />}
    <Text style={{ fontSize: 18, color: focused ? COLORS.primary : COLORS.t3 }}>{icon}</Text>
    <Text style={{ fontSize: 9, color: focused ? COLORS.primary : COLORS.t3, fontWeight: focused ? '600' : '400' }}>{label}</Text>
  </View>
);

export default function App() {
  const [locked, setLocked] = useState(true);
  const [appData, setAppData] = useState({ qpv: 0, streak: 0 });
  const [team, setTeam] = useState([]);
  const [prospects, setProspects] = useState([]);
  const [dailyActions, setDailyActions] = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [books, setBooks] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [gigs, setGigs] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      getData('appData'), getData('team'), getData('prospects'),
      getData('da_' + today()), getData('earnings'), getData('books'),
      getData('fiverrAccounts'), getData('fiverrGigs'),
    ]).then(([d, t, p, a, e, b, fa, fg]) => {
      if (d) setAppData(d);
      if (t) setTeam(t);
      if (p) setProspects(p);
      setDailyActions(a || DEFAULT_ACTIONS.map(x => ({ ...x })));
      if (e) setEarnings(e);
      if (b) setBooks(b);
      if (fa) setAccounts(fa);
      if (fg) setGigs(fg);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    setData('appData', appData);
    setData('team', team);
    setData('prospects', prospects);
    setData('da_' + today(), dailyActions);
    setData('earnings', earnings);
    setData('books', books);
    setData('fiverrAccounts', accounts);
    setData('fiverrGigs', gigs);
  }, [appData, team, prospects, dailyActions, earnings, books, accounts, gigs, loaded]);

  const toggleAction = (id) => {
    setDailyActions(prev => prev.map(a => a.id === id ? { ...a, done: !a.done } : a));
  };

  if (locked) {
    return (<><StatusBar style="light" /><LockScreen onUnlock={() => setLocked(false)} /></>);
  }

  const darkTheme = {
    dark: true,
    colors: { primary: COLORS.primary, background: COLORS.bg, card: COLORS.bg, text: COLORS.t1, border: COLORS.border, notification: COLORS.primary },
  };

  return (
    <><StatusBar style="light" />
    <NavigationContainer theme={darkTheme}>
      <Tab.Navigator screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: COLORS.bg + 'ee', borderTopColor: COLORS.border, borderTopWidth: 1, height: 65, paddingBottom: 10, paddingTop: 6 },
        tabBarShowLabel: false,
      }}>
        <Tab.Screen name="HQ" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="⌂" label="HQ" focused={focused} /> }}>
          {() => <HomeScreen data={appData} dailyActions={dailyActions} toggleAction={toggleAction} />}
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
        <Tab.Screen name="AI" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="🧠" label="AI" focused={focused} /> }}>
          {() => <AIScreen />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer></>
  );
}
