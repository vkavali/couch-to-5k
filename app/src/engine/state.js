// State shape (storage key c25k:v2) and the pure reducers that change it.
import { isoDay, addDays } from "./dates.js";

export const emptyState = () => ({ v: 2, sessions: [], events: [], injuries: [], checkins: [], overrides: [], weights: [] });
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const byIso = (a, b) => (a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0);

export const R = {
  addSession: (s, sess) => ({ ...s, sessions: [...s.sessions, { id: uid(), completed: true, ...sess }].sort(byIso) }),
  removeSession: (s, id) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== id) }),
  saveEvent: (s, ev) => ({ ...s, events: [...s.events.filter((e) => e.iso !== ev.iso), { id: uid(), ...ev }].sort(byIso) }),
  removeEvent: (s, iso) => ({ ...s, events: s.events.filter((e) => e.iso !== iso) }),
  reportInjury: (s, inj) => ({ ...s, injuries: [...s.injuries.filter((i) => i.clearedIso), { id: uid(), clearedIso: null, ...inj }],
    checkins: inj.pain == null ? s.checkins : [...s.checkins.filter((c) => c.iso !== inj.startIso), { iso: inj.startIso, pain: inj.pain, bendOk: false }].sort(byIso) }),
  checkin: (s, c) => ({ ...s, checkins: [...s.checkins.filter((x) => x.iso !== c.iso), c].sort(byIso) }),
  clearInjury: (s, iso) => ({ ...s, injuries: s.injuries.map((i) => (i.clearedIso ? i : { ...i, clearedIso: iso })) }),
  setStage: (s, iso, stage) => ({ ...s, overrides: [...s.overrides.filter((o) => o.iso !== iso), { iso, stage }].sort(byIso) }),
  addWeight: (s, iso, kg) => ({ ...s, weights: [...s.weights.filter((w) => w.iso !== iso), { iso, kg }].sort(byIso) }),
};

// v0.1.0 data (key fitlog:v1): logs keyed by UTC date, games with a picked intensity.
export function migrateV1(old, v1StartIso = "2026-06-23") {
  const s = emptyState();
  Object.entries(old.logs || {}).forEach(([iso, l]) => {
    if (!l || !l.done) return;
    if (l.type === "run" || l.secs || l.km) {
      const wk = Math.min(12, Math.max(1, Math.floor((new Date(iso) - new Date(v1StartIso)) / (7 * 86400000)) + 1));
      s.sessions.push({ id: uid(), iso, kind: "run", stage: wk, secs: l.secs || 0, km: Number(l.km) || 0, notes: l.notes || "", completed: true });
    } else if (l.type === "strength") s.sessions.push({ id: uid(), iso, kind: "strength", completed: true });
  });
  (old.games || []).forEach((g) => {
    const ev = { id: uid(), iso: g.iso, kind: /nets/i.test(g.label || "") ? "nets" : "match", played: g.iso < isoDay() };
    if (ev.kind === "nets") ev.minutes = 60;
    else if (g.intensity === "high") { ev.bowlOvers = 4; ev.fielded = true; }
    else if (g.intensity === "medium") { ev.batted = true; ev.fielded = true; }
    else ev.fielded = true;
    s.events.push(ev);
  });
  (old.bodyWeights || []).forEach((w) => s.weights.push({ iso: w.iso, kg: w.kg }));
  s.sessions.sort(byIso); s.events.sort(byIso); s.weights.sort(byIso);
  return s;
}

export function stats(state, todayIso) {
  const runs = state.sessions.filter((x) => x.kind === "run");
  const km = runs.reduce((a, r) => a + (Number(r.km) || 0), 0);
  const longest = runs.reduce((a, r) => Math.max(a, r.secs || 0), 0);
  // weeks in a row (ending this week or last) with at least 2 runs
  let weeks = 0;
  for (let w = 0; w < 52; w++) {
    const end = addDays(todayIso, -7 * w), start = addDays(end, -6);
    const n = runs.filter((r) => r.iso >= start && r.iso <= end).length;
    if (n >= 2) weeks++; else if (w > 0) break;
  }
  return { runs: runs.length, km: Math.round(km * 10) / 10, longest, weeks, strength: state.sessions.filter((x) => x.kind === "strength").length };
}
