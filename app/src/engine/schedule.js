// Builds the forward plan from today. Deterministic: same log in, same plan out.
// This module owns every safety rule; screens only display what it returns.
import { addDays, diffDays } from "./dates.js";
import { STAGES, LAST_STAGE, RUNS_PER_STAGE } from "./stages.js";
import { eventLoad } from "./load.js";
import { deriveStage } from "./progress.js";
import { injuryStatus, returnStatus, areaLabel, CLEAR_STREAK } from "./injury.js";

export const RUNS_PER_WEEK = 3;
export const STRENGTH_PER_WEEK = 2;

function runBlocks(state) {
  const blocked = {};
  (state.events || []).forEach((ev) => {
    const { level } = eventLoad(ev);
    const what = ev.kind === "nets" ? "nets" : "match";
    blocked[ev.iso] = `Cricket ${what} today`;
    if (level !== "low") blocked[addDays(ev.iso, 1)] = blocked[addDays(ev.iso, 1)] || `Day after a ${level}-load ${what}`;
    if (level === "high") blocked[addDays(ev.iso, -1)] = blocked[addDays(ev.iso, -1)] || `Day before a high-load ${what}`;
  });
  return blocked;
}

export function buildPlan(state, todayIso, horizon = 21) {
  const prog = deriveStage(state, todayIso);
  const inj = injuryStatus(state, todayIso);
  const ret = returnStatus(state);
  const blocked = runBlocks(state);
  const evBy = {};
  (state.events || []).forEach((e) => { evBy[e.iso] = e; });
  const sessBy = {};
  (state.sessions || []).forEach((s) => { (sessBy[s.iso] = sessBy[s.iso] || []).push(s); });

  // simulation state
  let stage = prog.stage, count = prog.count;
  const runDays = (state.sessions || []).filter((s) => s.kind === "run").map((s) => s.iso);
  const strDays = (state.sessions || []).filter((s) => s.kind === "strength").map((s) => s.iso);
  const within = (list, iso) => list.filter((d) => { const g = diffDays(iso, d); return g >= 0 && g <= 6; }).length;
  let lastHard = [...runDays].sort().pop() || null;

  const holdDays = inj ? (inj.canClear ? 1 : CLEAR_STREAK - inj.streak) : 0;
  let needWalk = inj ? true : ret?.phase === "walkTest";
  let returnLeft = inj ? 2 : ret ? 2 - ret.done : 0;
  let returnWindowStart = inj ? null : ret ? ret.injury.clearedIso : null;
  if (inj) { stage = Math.max(1, stage - 2); count = 0; }

  const out = [];
  for (let i = 0; i < horizon; i++) {
    const iso = addDays(todayIso, i);
    const ev = evBy[iso];
    const done = sessBy[iso] || [];
    const day = { iso, projected: i > 0 || !!inj, done: false };
    const push = (o) => out.push(Object.assign(day, o));

    if (ev) {
      const l = eventLoad(ev);
      push({ type: ev.kind, event: ev, load: l, title: ev.kind === "nets" ? "Nets session" : "Cricket match",
        reason: inj && i < holdDays ? `${areaLabel(inj.injury.area)} is on hold: sit out or keep it very light`
          : needWalk || returnLeft > 0 ? "Return not finished: field only, skip bowling and long batting" : null,
        done: !!ev.played });
      continue;
    }
    if (i === 0 && done.length) {
      const s = done[done.length - 1];
      const t = { run: `Stage ${s.stage} run`, strength: "Strength", walkTest: "Walk test", rehab: "Recovery work" }[s.kind] || "Session";
      push({ type: s.kind, stage: s.stage, title: t, done: true, session: s });
      if (s.kind === "walkTest") { needWalk = false; lastHard = iso; }
      continue;
    }
    if (inj && i < holdDays) {
      push({ type: "rehab", title: `${areaLabel(inj.injury.area)} on hold`, rehab: i === 0 ? inj.rehab : null,
        reason: inj.canClear ? "3 pain-free days logged: you can clear it" : `Running resumes after ${CLEAR_STREAK} pain-free days in a row` });
      if (i === holdDays - 1) returnWindowStart = addDays(iso, 1);
      continue;
    }
    const why = blocked[iso];
    if (needWalk) {
      if (!why) { push({ type: "walkTest", title: "Walk test", detail: "30 min brisk walk. Pain-free means running is back on.", reason: "Gate before the first run back" }); needWalk = false; lastHard = iso; }
      else push({ type: "rest", title: "Rest", reason: why });
      continue;
    }
    const inReturn = returnLeft > 0;
    const cap = returnWindowStart && diffDays(iso, returnWindowStart) < 7 ? 2 : RUNS_PER_WEEK; // first week back: 2 runs
    const sinceHard = lastHard ? diffDays(iso, lastHard) : 99;
    const gapNeeded = inReturn ? 2 : 2; // never run on back-to-back days
    const runs7 = within(runDays, iso);
    const strYesterday = strDays.includes(addDays(iso, -1));

    if (!why && runs7 < cap && sinceHard >= gapNeeded) {
      const st = STAGES[stage];
      push({ type: "run", stage, title: inReturn ? `Return run, stage ${stage}` : `Stage ${stage} run`, detail: st.note,
        returnRun: inReturn, runOfStage: count + 1,
        reason: inReturn ? "Back from injury: two easy runs before the plan moves on" : null });
      runDays.push(iso); lastHard = iso;
      if (inReturn) returnLeft--;
      count++;
      if (count >= RUNS_PER_STAGE && stage < LAST_STAGE) { stage++; count = 0; }
    } else if (within(strDays, iso) < STRENGTH_PER_WEEK && !strYesterday) {
      const light = !!why || inReturn;
      push({ type: "strength", light, title: light ? "Strength, light" : "Strength",
        detail: light ? "Upper body and core only, no jumping" : "6 exercises, 3 rounds", reason: why || (inReturn ? "Back from injury: keep load off the legs" : null) });
      strDays.push(iso);
    } else {
      push({ type: "rest", title: "Rest",
        reason: why || (sinceHard < gapNeeded ? "Recovery after a run" : runs7 >= cap ? "Weekly run target met" : "Recovery day") });
    }
  }
  return out;
}

// Rough finish date for the 5K at 3 runs a week, counting any injury hold.
export function goalEta(state, todayIso) {
  const prog = deriveStage(state, todayIso);
  if (prog.finished5k) return { done: true };
  const inj = injuryStatus(state, todayIso);
  let stage = prog.stage, count = prog.count, extra = 0;
  if (inj) { stage = Math.max(1, stage - 2); count = 0; extra = CLEAR_STREAK - inj.streak + 2; }
  const runsLeft = (LAST_STAGE - stage) * RUNS_PER_STAGE + (RUNS_PER_STAGE - count) - (RUNS_PER_STAGE - 1);
  const days = Math.ceil((runsLeft / RUNS_PER_WEEK) * 7) + extra;
  return { done: false, runsLeft, iso: addDays(todayIso, days), weeks: Math.ceil(days / 7) };
}
