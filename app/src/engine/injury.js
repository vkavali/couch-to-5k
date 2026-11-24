// Injury hold and return rules. The app holds running, it does not diagnose.
import { addDays, diffDays } from "./dates.js";

export const AREAS = [
  { key: "hip", label: "Hip / glute" },
  { key: "shin", label: "Shin / calf" },
  { key: "knee", label: "Knee" },
  { key: "back", label: "Lower back" },
  { key: "other", label: "Other" },
];
export const areaLabel = (k) => (AREAS.find((a) => a.key === k) || AREAS[4]).label;

export const CLEAR_STREAK = 3; // pain-free days needed before running again
const EARLY_DAYS = 2; // first days: walk and rest only

const GENTLE = [["Easy walk", "10 to 20 min on flat ground, stop if it gets sharp"], ["Heat or ice", "15 to 20 min, whichever feels better"]];
export const REHAB = {
  hip: [["Glute bridge", "2 sets of 10, slow"], ["Clamshell", "2 sets of 12 each side"], ["Side-lying leg raise", "2 sets of 10 each side"]],
  shin: [["Tibialis raise", "2 sets of 15, back against a wall"], ["Calf raise", "2 sets of 12, slow down"], ["Single-leg balance", "3 x 30 sec each leg"]],
  knee: [["Straight-leg raise", "2 sets of 10 each leg"], ["Glute bridge", "2 sets of 10"], ["Wall sit", "3 x 20 sec, pain-free depth"]],
  back: [["Cat-cow", "10 slow reps"], ["Bird-dog", "2 sets of 8 each side"], ["Glute bridge", "2 sets of 10"]],
  other: [["Gentle range of motion", "Move the area through a pain-free range, 2 min"]],
};

export const activeInjury = (state) => (state.injuries || []).find((i) => !i.clearedIso) || null;
export const lastCleared = (state) =>
  (state.injuries || []).filter((i) => i.clearedIso).sort((a, b) => (a.clearedIso < b.clearedIso ? 1 : -1))[0] || null;

const checkinsSince = (state, iso) =>
  (state.checkins || []).filter((c) => c.iso >= iso).sort((a, b) => (a.iso < b.iso ? -1 : 1));

// Consecutive pain-free check-ins (pain <= 1, bending fine) ending today or yesterday.
export function painFreeStreak(state, todayIso) {
  const inj = activeInjury(state);
  if (!inj) return 0;
  const by = {};
  checkinsSince(state, inj.startIso).forEach((c) => { by[c.iso] = c; });
  let cur = by[todayIso] ? todayIso : addDays(todayIso, -1);
  let n = 0;
  while (by[cur] && by[cur].pain <= 1 && by[cur].bendOk) { n++; cur = addDays(cur, -1); }
  return n;
}

export function injuryStatus(state, todayIso) {
  const inj = activeInjury(state);
  if (!inj) return null;
  const cs = checkinsSince(state, inj.startIso);
  const day = diffDays(todayIso, inj.startIso) + 1;
  const streak = painFreeStreak(state, todayIso);
  const first = cs[0], latest = cs[cs.length - 1];
  let seeDoctor = null;
  if (cs.some((c) => c.pain >= 7)) seeDoctor = "Pain reached 7 or more. Get it examined.";
  else if (day >= 14) seeDoctor = "Two weeks without clearing. Get it examined.";
  else if (day >= 5 && first && latest && latest.pain >= first.pain && latest.pain > 1)
    seeDoctor = "No improvement after 5 days. See a physio or sports doctor.";
  return {
    injury: inj, day, streak, canClear: streak >= CLEAR_STREAK,
    checkedInToday: cs.some((c) => c.iso === todayIso), latestPain: latest ? latest.pain : null, seeDoctor,
    rehab: day <= EARLY_DAYS ? GENTLE : [GENTLE[0], ...(REHAB[inj.area] || REHAB.other)],
    early: day <= EARLY_DAYS,
  };
}

// After clearing: a 30 min walk test, then 2 return runs, before normal progression.
export function returnStatus(state) {
  if (activeInjury(state)) return null;
  const inj = lastCleared(state);
  if (!inj) return null;
  const after = (state.sessions || []).filter((s) => s.iso >= inj.clearedIso);
  const walkOk = after.some((s) => s.kind === "walkTest" && (s.pain || 0) <= 1);
  const runs = after.filter((s) => s.kind === "run" && (s.pain || 0) <= 2).length;
  if (!walkOk && runs === 0) return { phase: "walkTest", done: 0, injury: inj };
  if (runs < 2) return { phase: "returnRuns", done: runs, injury: inj };
  return null;
}
