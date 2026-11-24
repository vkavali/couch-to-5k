import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AppState, useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useT } from "./src/ui/theme";
import { loadState, saveState } from "./src/lib/store";
import { R, emptyState, isoDay, buildPlan, deriveStage, injuryStatus, returnStatus, goalEta } from "./src/engine";
import TodayScreen from "./src/screens/TodayScreen";
import PlanScreen from "./src/screens/PlanScreen";
import LogScreen from "./src/screens/LogScreen";
import ProgressScreen from "./src/screens/ProgressScreen";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);
const Tab = createBottomTabNavigator();

export default function App() {
  const T = useT();
  const scheme = useColorScheme();
  const [state, setState] = useState(emptyState());
  const [loaded, setLoaded] = useState(false);
  const [today, setToday] = useState(isoDay());

  useEffect(() => { (async () => { setState(await loadState()); setLoaded(true); })(); }, []);
  useEffect(() => { if (loaded) saveState(state); }, [state, loaded]);
  // The plan is derived from today's date, so refresh it when the app comes back.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") setToday(isoDay()); });
    return () => sub.remove();
  }, []);

  const ctx = useMemo(() => ({
    state, today, loaded,
    act: (name, ...args) => setState((s) => R[name](s, ...args)),
    plan: buildPlan(state, today, 21),
    prog: deriveStage(state, today),
    inj: injuryStatus(state, today),
    ret: returnStatus(state),
    eta: goalEta(state, today),
  }), [state, today, loaded]);

  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  const nav = { ...base, colors: { ...base.colors, background: T.bg, card: T.panel, border: T.line, text: T.ink, primary: T.pitch } };
  const icon = (name) => ({ color, size, focused }) => <Ionicons name={focused ? name : `${name}-outline`} size={size} color={color} />;

  return (
    <SafeAreaProvider>
      <Ctx.Provider value={ctx}>
        <StatusBar style={T.dark ? "light" : "dark"} />
        <NavigationContainer theme={nav}>
          <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: T.pitch, tabBarInactiveTintColor: T.muted,
            tabBarStyle: { backgroundColor: T.panel, borderTopColor: T.line }, tabBarLabelStyle: { fontSize: 11, fontWeight: "700" } }}>
            <Tab.Screen name="Today" component={TodayScreen} options={{ tabBarIcon: icon("today") }} />
            <Tab.Screen name="Plan" component={PlanScreen} options={{ tabBarIcon: icon("calendar") }} />
            <Tab.Screen name="Log" component={LogScreen} options={{ tabBarIcon: icon("add-circle") }} />
            <Tab.Screen name="Progress" component={ProgressScreen} options={{ tabBarIcon: icon("stats-chart") }} />
          </Tab.Navigator>
        </NavigationContainer>
      </Ctx.Provider>
    </SafeAreaProvider>
  );
}
