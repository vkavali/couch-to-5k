import test from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/engine/index.js";

const T = "2026-11-23"; // a Monday
const run = (iso, stage, extra = {}) => ({ iso, kind: "run", stage, secs: 1500, completed: true, ...extra });
const S = (o = {}) => ({ ...E.emptyState(), ...o });
const types = (p) => p.map((d) => d.type);

test("dates are local and survive month ends", () => {
  assert.equal(E.addDays("2026-11-30", 1), "2026-12-01");
  assert.equal(E.diffDays("2026-12-01", "2026-11-23"), 8);
  assert.equal(E.isoDay(new Date(2026, 10, 23, 23, 30)), "2026-11-23");
});

test("new user starts at stage 1 with 3 runs and 2 strength in the first week", () => {
  const p = E.buildPlan(S(), T, 7);
  assert.equal(p[0].type, "run"); assert.equal(p[0].stage, 1);
  assert.equal(types(p).filter((t) => t === "run").length, 3);
  assert.equal(types(p).filter((t) => t === "strength").length, 2);
});

test("never schedules runs on back-to-back days", () => {
  const p = E.buildPlan(S(), T, 21);
  for (let i = 1; i < p.length; i++) assert.ok(!(p[i].type === "run" && p[i - 1].type === "run"), `day ${i}`);
});

test("stage advances after 3 good runs, painful runs do not count", () => {
  let s = S({ sessions: [run("2026-11-16", 1), run("2026-11-18", 1), run("2026-11-20", 1, { pain: 5 })] });
  assert.deepEqual([E.deriveStage(s, T).stage, E.deriveStage(s, T).count], [1, 2]);
  s = S({ sessions: [run("2026-11-16", 1), run("2026-11-18", 1), run("2026-11-20", 1)] });
  assert.deepEqual([E.deriveStage(s, T).stage, E.deriveStage(s, T).count], [2, 0]);
});

test("a long gap drops stages instead of resuming where the calendar says", () => {
  const s = S({ overrides: [{ iso: "2026-08-01", stage: 6 }], sessions: [run("2026-08-03", 6)] });
  const d = E.deriveStage(s, T); // 112 days off
  assert.equal(d.stage, 2); assert.equal(d.dropped.reason, "gap");
  const s2 = S({ overrides: [{ iso: "2026-11-01", stage: 6 }], sessions: [run("2026-11-10", 6)] });
  assert.equal(E.deriveStage(s2, T).stage, 5); // 13 days off
});

test("cricket load is computed from roles", () => {
  assert.equal(E.eventLoad({ kind: "match", bowlOvers: 4, fielded: true }).level, "high");
  assert.equal(E.eventLoad({ kind: "match", batted: true, fielded: true }).level, "medium");
  assert.equal(E.eventLoad({ kind: "match", fielded: true }).level, "low");
  assert.equal(E.eventLoad({ kind: "nets", minutes: 90 }).level, "medium");
});

test("high-load match blocks runs the day before, on, and after", () => {
  const s = S({ events: [{ iso: "2026-11-28", kind: "match", bowlOvers: 4, batted: true, fielded: true }] });
  const p = E.buildPlan(s, T, 9);
  const by = Object.fromEntries(p.map((d) => [d.iso, d]));
  assert.notEqual(by["2026-11-27"].type, "run");
  assert.equal(by["2026-11-28"].type, "match");
  assert.notEqual(by["2026-11-29"].type, "run");
  assert.ok(types(p.slice(0, 7)).filter((t) => t === "run").length >= 2);
});

test("active injury holds all running and projects the return", () => {
  let s = S({ overrides: [{ iso: "2026-11-01", stage: 5 }], sessions: [run("2026-11-18", 5)] });
  s = E.R.reportInjury(s, { area: "hip", side: "left", startIso: T, pain: 7 });
  const st = E.injuryStatus(s, T);
  assert.equal(st.streak, 0); assert.equal(st.canClear, false); assert.ok(st.seeDoctor);
  const p = E.buildPlan(s, T, 14);
  assert.deepEqual(types(p.slice(0, 3)), ["rehab", "rehab", "rehab"]);
  assert.equal(p[3].type, "walkTest");
  const firstRun = p.find((d) => d.type === "run");
  assert.equal(firstRun.stage, 3); assert.equal(firstRun.returnRun, true);
  assert.ok(E.diffDays(firstRun.iso, p[3].iso) >= 2);
  // only 2 runs in the first week back
  const wk = p.filter((d) => d.iso > p[2].iso && E.diffDays(d.iso, p[2].iso) <= 7 && d.type === "run");
  assert.equal(wk.length, 2);
});

test("3 pain-free check-ins allow clearing, then walk test gates the first run", () => {
  let s = S({ overrides: [{ iso: "2026-11-01", stage: 5 }], sessions: [run("2026-11-18", 5)] });
  s = E.R.reportInjury(s, { area: "hip", startIso: "2026-11-20", pain: 6 });
  for (const iso of ["2026-11-21", "2026-11-22", "2026-11-23"]) s = E.R.checkin(s, { iso, pain: 1, bendOk: true });
  assert.equal(E.injuryStatus(s, T).canClear, true);
  s = E.R.clearInjury(s, T);
  assert.equal(E.deriveStage(s, T).stage, 3);
  assert.equal(E.returnStatus(s).phase, "walkTest");
  assert.equal(E.buildPlan(s, T, 3)[0].type, "walkTest");
  s = E.R.addSession(s, { iso: T, kind: "walkTest", pain: 0 });
  assert.equal(E.returnStatus(s).phase, "returnRuns");
  const p = E.buildPlan(s, T, 5);
  assert.equal(p[0].done, true); assert.notEqual(p[1].type, "run"); assert.equal(p[2].type, "run");
  s = E.R.addSession(s, run("2026-11-25", 3)); s = E.R.addSession(s, run("2026-11-27", 3));
  assert.equal(E.returnStatus(s), null);
});

test("a bad check-in resets the pain-free streak", () => {
  let s = E.R.reportInjury(S(), { area: "shin", startIso: "2026-11-19", pain: 5 });
  s = E.R.checkin(s, { iso: "2026-11-21", pain: 1, bendOk: true });
  s = E.R.checkin(s, { iso: "2026-11-22", pain: 3, bendOk: true });
  s = E.R.checkin(s, { iso: "2026-11-23", pain: 1, bendOk: true });
  assert.equal(E.painFreeStreak(s, T), 1);
});

test("v1 data migrates", () => {
  const s = E.migrateV1({ logs: { "2026-06-24": { type: "run", done: true, secs: 1200, km: "2.1" } }, games: [{ iso: "2026-06-27", label: "Match — bowling", intensity: "high" }], bodyWeights: [{ iso: "2026-06-24", kg: 80 }] });
  assert.equal(s.sessions[0].stage, 1); assert.equal(E.eventLoad(s.events[0]).level, "high"); assert.equal(s.weights.length, 1);
});

test("goal date exists and moves out with an injury", () => {
  const a = E.goalEta(S(), T);
  const b = E.goalEta(E.R.reportInjury(S(), { area: "hip", startIso: T, pain: 5 }), T);
  assert.ok(a.iso && b.iso >= a.iso);
});
