// Design tokens. Cricket palette: cream, pitch green, cherry red, willow, gold.
// Screens read tokens through useT() so light and dark follow the phone setting.
import { useColorScheme } from "react-native";

export const LIGHT = {
  dark: false, bg: "#F4EFE2", panel: "#FFFDF7", panel2: "#EDE6D3", ink: "#1B2A21", muted: "#667064",
  line: "rgba(27,42,33,0.12)", pitch: "#1F6B45", onPitch: "#FFFDF7", cherry: "#B3261E", willow: "#D9C7A0",
  gold: "#A9781A", warn: "#B25E09", ok: "#1F6B45",
};
export const DARK = {
  dark: true, bg: "#0E1611", panel: "#17221B", panel2: "#213026", ink: "#F1EDE0", muted: "#94A197",
  line: "rgba(255,255,255,0.10)", pitch: "#43B97F", onPitch: "#0E1611", cherry: "#EC6A5E", willow: "#CDB98C",
  gold: "#E0B04A", warn: "#F0A04B", ok: "#43B97F",
};
export const useT = () => (useColorScheme() === "dark" ? DARK : LIGHT);

export const TYPE = {
  run: { icon: "walk", color: "cherry", short: "Run" },
  strength: { icon: "barbell", color: "gold", short: "Lift" },
  rest: { icon: "bed", color: "muted", short: "Rest" },
  match: { icon: "baseball", color: "pitch", short: "Match" },
  nets: { icon: "baseball-outline", color: "pitch", short: "Nets" },
  rehab: { icon: "bandage", color: "warn", short: "Hold" },
  walkTest: { icon: "footsteps", color: "pitch", short: "Walk" },
};
export const typeColor = (T, type) => T[(TYPE[type] || TYPE.rest).color];
export const S = { pad: 16, gap: 12, r: 18 };
