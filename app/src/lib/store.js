import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "fitlog:v1";

export async function loadState(){
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { logs:{}, bodyWeights:[] };
  } catch {
    return { logs:{}, bodyWeights:[] };
  }
}

export async function saveState(state){
  try { await AsyncStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}
