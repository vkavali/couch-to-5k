// Derives the current stage by replaying the log. Nothing is stored as "current
// stage", so editing history can never leave the plan in a wrong state.
import { diffDays } from "./dates.js";
import { LAST_STAGE, RUNS_PER_STAGE } from "./stages.js";
import { activeInjury } from "./injury.js";

export const gapDrop = (gap) => (gap >= 42 ? 4 : gap >= 21 ? 2 : gap >= 10 ? 1 : 0);
// A run counts toward the stage when it was finished at this stage or above without real pain.
export const runCounts = (s, stage) => s.kind === "run" && s.completed !== false && (s.stage || 1) >= stage && (s.pain || 0) <= 3;

export function deriveStage(state, todayIso) {
  const evs = [];
  (state.sessions || []).forEach((s) => { if (s.kind === "run") evs.push({ iso: s.iso, t: 2, s }); });
  (state.overrides || []).forEach((o) => evs.push({ iso: o.iso, t: 0, o }));
  (state.injuries || []).forEach((i) => { if (i.clearedIso) evs.push({ iso: i.clearedIso, t: 1, i }); });
  evs.sort((a, b) => (a.iso === b.iso ? a.t - b.t : a.iso < b.iso ? -1 : 1));

  let stage = 1, count = 0, anchor = null, lastRunIso = null, finished5k = false, dropped = null;
  const decay = (iso) => {
    if (!anchor) return;
    const d = gapDrop(diffDays(iso, anchor));
    if (d > 0) {
      const to = Math.max(1, stage - d);
      if (to !== stage || count) dropped = { from: stage, to, reason: "gap" };
      stage = to; count = 0;
    }
  };
  for (const e of evs) {
    if (e.iso > todayIso) break;
    if (e.o) { stage = Math.min(LAST_STAGE, Math.max(1, e.o.stage)); count = 0; anchor = null; dropped = null; } // a manual set starts the gap clock at the next run
    else if (e.i) {
      const to = Math.max(1, stage - 2);
      dropped = { from: stage, to, reason: "injury" };
      stage = to; count = 0; anchor = e.iso; // time off injured is not penalised twice
    } else {
      decay(e.iso);
      if (runCounts(e.s, stage)) {
        dropped = null;
        if (stage === LAST_STAGE) finished5k = true;
        count++;
        if (count >= RUNS_PER_STAGE && stage < LAST_STAGE) { stage++; count = 0; }
      }
      anchor = e.iso; lastRunIso = e.iso;
    }
  }
  if (!activeInjury(state)) decay(todayIso);
  return { stage, count: Math.min(count, RUNS_PER_STAGE), lastRunIso, finished5k, dropped };
}
