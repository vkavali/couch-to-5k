import React, { createContext, useContext, useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { C } from "./src/lib/theme";
import { loadState, saveState } from "./src/lib/store";
import { isoDay } from "./src/lib/plan";

import TodayScreen from "./src/screens/TodayScreen";
import RunTimerScreen from "./src/screens/RunTimerScreen";
import StrengthScreen from "./src/screens/StrengthScreen";
import ProgressScreen from "./src/screens/ProgressScreen";
import DevicesScreen from "./src/screens/DevicesScreen";

// ---- shared app state ----
export const LogContext = createContext(null);
export const useLog = () => useContext(LogContext);

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: C.bg, card: C.panel, border: C.line, text: C.ink },
};

export default function App(){
  const [state, setState] = useState({ logs:{}, bodyWeights:[] });
  const [loaded, setLoaded] = useState(false);

  useEffect(()=>{ (async()=>{ setState(await loadState()); setLoaded(true); })(); },[]);
  useEffect(()=>{ if(loaded) saveState(state); },[state, loaded]);

  const logDay = (iso, patch) =>
    setState(s => ({ ...s, logs: { ...s.logs, [iso]: { ...(s.logs[iso]||{}), ...patch } } }));
  const logRunToday = (rec) =>
    logDay(isoDay(new Date()), { type:"run", done:true, ...rec });
  const addWeight = (kg) =>
    setState(s => ({ ...s, bodyWeights:[
      ...s.bodyWeights.filter(x=>x.iso!==isoDay(new Date())),
      { iso: isoDay(new Date()), kg } ] }));

  const ctx = { ...state, logDay, logRunToday, addWeight };

  const icon = (name) => ({ color, size }) => <Ionicons name={name} size={size} color={color}/>;

  return (
    <LogContext.Provider value={ctx}>
      <StatusBar style="light"/>
      <NavigationContainer theme={navTheme}>
        <Tab.Navigator
          screenOptions={{
            headerStyle:{ backgroundColor:C.bg }, headerTintColor:C.ink,
            tabBarStyle:{ backgroundColor:C.panel, borderTopColor:C.line },
            tabBarActiveTintColor:C.accent, tabBarInactiveTintColor:C.muted,
          }}>
          <Tab.Screen name="Today" component={TodayScreen}
            options={{ tabBarIcon: icon("calendar-outline") }}/>
          <Tab.Screen name="Run" component={RunTimerScreen}
            options={{ tabBarIcon: icon("pulse-outline") }}/>
          <Tab.Screen name="Strength" component={StrengthScreen}
            options={{ tabBarIcon: icon("barbell-outline") }}/>
          <Tab.Screen name="Progress" component={ProgressScreen}
            options={{ tabBarIcon: icon("stats-chart-outline") }}/>
          <Tab.Screen name="Devices" component={DevicesScreen}
            options={{ tabBarIcon: icon("watch-outline") }}/>
        </Tab.Navigator>
      </NavigationContainer>
    </LogContext.Provider>
  );
}
