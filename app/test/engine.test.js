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

// ---- nutrition, sync, gps ----
const prof = (o = {}) => ({ ...S({ weights: [{ iso: T, kg: 80 }] }), profile: { sex: "m", age: 30, heightCm: 175, goal: "lose", diet: "any", ...o } });

test("no targets until the profile is filled in", () => {
  assert.equal(E.targets(S(), T, null), null);
  assert.equal(E.profileReady(prof()), true);
});

test("targets follow Mifflin-St Jeor with a capped deficit and enough protein", () => {
  const t = E.targets(prof(), T, { type: "rest" });
  assert.equal(t.bmr, 1749); // 10*80 + 6.25*175 - 5*30 + 5
  assert.ok(t.adj >= -500 && t.adj < 0);
  assert.ok(t.kcal >= t.bmr && t.kcal < t.tdee);
  assert.equal(t.protein, 160);
  assert.ok(Math.abs(t.protein * 4 + t.carbs * 4 + t.fat * 9 - t.kcal) < 15);
});

test("run and match days get more food; a heavy match removes the deficit", () => {
  const rest = E.targets(prof(), T, { type: "rest" });
  const runDay = E.targets(prof(), T, { type: "run", stage: 6 });
  const match = E.targets(prof(), T, { type: "match", load: { level: "high" } });
  assert.ok(runDay.kcal > rest.kcal);
  assert.equal(match.adj, 0); assert.ok(match.note);
});

test("never recommends below the safe floor, and pauses the deficit on fast loss", () => {
  const small = E.targets({ ...prof({ sex: "f", age: 60, heightCm: 150 }), weights: [{ iso: T, kg: 45 }] }, T, { type: "rest" });
  assert.ok(small.kcal >= 1200 && small.kcal >= small.bmr - 5);
  const fast = { ...prof(), weights: [{ iso: "2026-11-02", kg: 84 }, { iso: T, kg: 80 }] };
  assert.equal(E.targets(fast, T, { type: "rest" }).adj, 0);
});

test("recommended meals land near the target and respect the diet", () => {
  for (const diet of ["any", "egg", "veg"]) {
    const s = prof({ diet }); const t = E.targets(s, T, { type: "run", stage: 4 });
    const meals = E.recommendMeals(s, T, { type: "run", stage: 4 }, t);
    assert.equal(meals.length, 4);
    const tot = E.sumFoods(meals.map((m) => m.total));
    assert.ok(Math.abs(tot.kcal - t.kcal) / t.kcal < 0.15, `${diet} kcal ${tot.kcal} vs ${t.kcal}`);
    assert.ok(tot.p >= t.protein - 25, `${diet} protein ${tot.p} vs ${t.protein}`);
    const ids = meals.flatMap((m) => m.items.map((i) => i.foodId));
    if (diet !== "any") assert.ok(!ids.some((id) => E.foodById[id].tag === "meat"));
    if (diet === "veg") assert.ok(!ids.some((id) => E.foodById[id].tag === "egg"));
    assert.ok(meals.some((m) => m.tip));
  }
});

test("swapping a meal changes the recommendation", () => {
  const s = prof(); const t = E.targets(s, T, null);
  const a = E.recommendMeals(s, T, null, t)[3].name;
  const b = E.recommendMeals(E.R.swapMeal(s, T, "dinner"), T, null, t)[3].name;
  assert.notEqual(a, b);
});

test("Open Food Facts product maps to a food", () => {
  const f = E.foodFromOff({ code: "123", product: { product_name: "Bar", brands: "X", nutriments: { "energy-kcal_100g": 400, proteins_100g: 20, carbohydrates_100g: 50, fat_100g: 12 } } });
  assert.deepEqual([f.kcal, f.p, f.serving, f.name], [400, 20, "100 g", "X Bar"]);
  assert.equal(E.foodFromOff({ product: { nutriments: {} } }), null);
});

test("sync merge keeps both devices' records, newest write wins, deletes stick", () => {
  let phone = E.R.addSession(S(), run("2026-11-20", 1)); const id = phone.sessions[0].id;
  let web = JSON.parse(JSON.stringify(phone));
  web = E.R.addSession(web, run("2026-11-22", 1));
  phone = E.R.removeSession(phone, id);
  phone = E.R.addWeight(phone, T, 80);
  const m = E.mergeStates(phone, web);
  assert.deepEqual(m.sessions.map((x) => x.iso), ["2026-11-22"]);
  assert.equal(m.weights.length, 1);
  assert.ok(E.sameState(E.mergeStates(m, web).sessions, m.sessions)); // merging again changes nothing
  const older = { ...S(), weights: [{ iso: T, kg: 82, ts: 1 }] }, newer = { ...S(), weights: [{ iso: T, kg: 80, ts: 2 }] };
  assert.equal(E.mergeStates(older, newer).weights[0].kg, 80);
  assert.equal(E.mergeStates(newer, older).weights[0].kg, 80);
});

test("gps distance ignores jitter, bad accuracy and jumps", () => {
  let tr = E.emptyTrack(); const p = (lat, t, acc = 5) => ({ lat, lon: -96.78, t: t * 1000, acc });
  tr = E.addPoint(tr, p(33.3, 0));
  tr = E.addPoint(tr, p(33.30001, 1)); // ~1 m: jitter
  tr = E.addPoint(tr, p(33.3009, 30)); // ~100 m in 30 s
  tr = E.addPoint(tr, p(33.31, 31, 80)); // bad accuracy
  tr = E.addPoint(tr, p(33.4, 32)); // 11 km jump
  assert.ok(tr.metres > 95 && tr.metres < 105, String(tr.metres));
  assert.equal(Math.round(E.pace(300, 1000)), 300);
});
