import AsyncStorage from "@react-native-async-storage/async-storage";
import { emptyState, migrateV1 } from "../engine";

const KEY = "c25k:v2";
const KEY_V1 = "fitlog:v1";

export async function loadState() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return { ...emptyState(), ...JSON.parse(raw) };
    const old = await AsyncStorage.getItem(KEY_V1);
    if (old) return migrateV1(JSON.parse(old));
  } catch {}
  return emptyState();
}
export async function saveState(state) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}
