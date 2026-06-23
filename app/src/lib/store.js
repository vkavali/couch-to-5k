import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "fitlog:v1";

export async function loadState(){
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const s = raw ? JSON.parse(raw) : {};
    return { logs: s.logs||{}, bodyWeights: s.bodyWeights||[], games: s.games||[] };
  } catch {
    return { logs:{}, bodyWeights:[], games:[] };
  }
}

export async function saveState(state){
  try { await AsyncStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}
