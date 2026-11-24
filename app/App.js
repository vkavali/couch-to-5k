import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useT } from "./src/ui/theme";
import { loadState, saveState } from "./src/lib/store";
import { R, emptyState, isoDay, buildPlan, deriveStage, injuryStatus, returnStatus, goalEta, mergeStates, sameState, targets } from "./src/engine";
import { loadAccount, pullState, pushState, signInWithApple, signOut, deleteAccount, syncConfigured } from "./src/lib/api";
import TodayScreen from "./src/screens/TodayScreen";
import PlanScreen from "./src/screens/PlanScreen";
import LogScreen from "./src/screens/LogScreen";
import ProgressScreen from "./src/screens/ProgressScreen";
import FoodScreen from "./src/screens/FoodScreen";
import SettingsSheet from "./src/screens/SettingsSheet";

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

  // ---- optional account + sync: pull, merge record by record, push ----
  const [account, setAccount] = useState(null);
  const [sync, setSync] = useState({ status: "off", at: null, error: null });
  const [settings, setSettings] = useState(false);
  const stateRef = useRef(state); stateRef.current = state;
  const busy = useRef(false);
  useEffect(() => { (async () => setAccount(await loadAccount()))(); }, []);
  const runSync = useCallback(async (acct) => {
    if (!acct || !syncConfigured() || busy.current) return;
    busy.current = true; setSync((x) => ({ ...x, status: "syncing", error: null }));
    try {
      const remote = (await pullState(acct.token)).state;
      const merged = mergeStates(stateRef.current, remote);
      if (!sameState(merged, stateRef.current)) setState(merged);
      if (!remote || !sameState(merged, { ...emptyState(), ...remote })) await pushState(acct.token, merged);
      setSync({ status: "ok", at: Date.now(), error: null });
    } catch (e) {
      if (e.status === 401) { await signOut(); setAccount(null); setSync({ status: "off", at: null, error: "Signed out: session expired." }); }
      else setSync((x) => ({ ...x, status: "error", error: e.message || "Sync failed" }));
    } finally { busy.current = false; }
  }, []);
  useEffect(() => { if (loaded && account) runSync(account); }, [loaded, account, today]);
  useEffect(() => { if (!loaded || !account) return; const id = setTimeout(() => runSync(account), 4000); return () => clearTimeout(id); }, [state]);
  const accountApi = useMemo(() => ({
    account, sync,
    signIn: async () => { const a = await signInWithApple(); setAccount(a); },
    signOut: async () => { await signOut(); setAccount(null); setSync({ status: "off", at: null, error: null }); },
    remove: async () => { await deleteAccount(account.token); setAccount(null); setSync({ status: "off", at: null, error: null }); },
    syncNow: () => runSync(account),
  }), [account, sync, runSync]);

  const ctx = useMemo(() => {
    const plan = buildPlan(state, today, 21);
    return {
    state, today, loaded, ...accountApi, openSettings: () => setSettings(true),
    targets: targets(state, today, plan[0]),
    act: (name, ...args) => setState((s) => R[name](s, ...args)),
    plan,
    prog: deriveStage(state, today),
    inj: injuryStatus(state, today),
    ret: returnStatus(state),
    eta: goalEta(state, today),
  }; }, [state, today, loaded, accountApi]);

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
            <Tab.Screen name="Food" component={FoodScreen} options={{ tabBarIcon: icon("restaurant") }} />
            <Tab.Screen name="Log" component={LogScreen} options={{ tabBarIcon: icon("add-circle") }} />
            <Tab.Screen name="Progress" component={ProgressScreen} options={{ tabBarIcon: icon("stats-chart") }} />
          </Tab.Navigator>
        </NavigationContainer>
        <SettingsSheet visible={settings} onClose={() => setSettings(false)} />
      </Ctx.Provider>
    </SafeAreaProvider>
  );
}
