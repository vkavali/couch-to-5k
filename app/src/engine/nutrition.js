// Nutrition rules. Deterministic, like the training plan: targets come from the
// profile and from what today's plan asks of the body. Meals are recommended, not picked.
import { diffDays, parseIso } from "./dates.js";
import { buildPhases } from "./stages.js";
import { FOODS, foodById, MEALS, SLOTS } from "./foods.js";

export const GOALS = [{ key: "lose", label: "Lose fat" }, { key: "maintain", label: "Maintain" }, { key: "gain", label: "Build" }];
export const DIETS = [{ key: "any", label: "Everything" }, { key: "egg", label: "Veg + eggs" }, { key: "veg", label: "Vegetarian" }];
const FLOOR = { m: 1500, f: 1200 }; // never recommend below this
const BASE_ACTIVITY = 1.35; // desk work plus normal daily movement, exercise is added per day
const r5 = (n) => Math.round(n / 5) * 5;

export const latestWeight = (state) => (state.weights?.length ? state.weights[state.weights.length - 1].kg : null);
export function profileReady(state) {
  const p = state.profile || {};
  return !!(p.sex && p.age && p.heightCm && latestWeight(state));
}

// Mifflin-St Jeor resting energy.
export const bmr = ({ sex, age, heightCm }, kg) => 10 * kg + 6.25 * heightCm - 5 * age + (sex === "f" ? -161 : 5);

// Extra energy for the planned day, using net METs (above resting).
export function exerciseKcal(day, kg) {
  if (!day) return 0;
  if (day.type === "run") {
    const ph = buildPhases(day.stage);
    const jog = ph.filter((x) => x.kind === "jog").reduce((a, x) => a + x.secs, 0) / 3600;
    const walk = ph.filter((x) => x.kind === "walk").reduce((a, x) => a + x.secs, 0) / 3600;
    return Math.round(kg * (7 * jog + 2.5 * walk));
  }
  if (day.type === "strength") return Math.round(kg * 3 * (day.light ? 0.4 : 0.6));
  if (day.type === "walkTest") return Math.round(kg * 2.5 * 0.5);
  if (day.type === "match" || day.type === "nets") return Math.round(kg * { high: 6, medium: 4, low: 2.5 }[day.load?.level || "medium"]);
  if (day.type === "rehab") return Math.round(kg * 2.5 * 0.25);
  return 0;
}

// Weekly weight change in % of body weight, from the last 2 to 5 weeks of weigh-ins.
export function weightTrend(state, todayIso) {
  const w = (state.weights || []).filter((x) => diffDays(todayIso, x.iso) <= 35);
  if (w.length < 2) return null;
  const first = w[0], last = w[w.length - 1], days = diffDays(last.iso, first.iso);
  if (days < 13) return null;
  return { pctPerWeek: Math.round(((last.kg - first.kg) / first.kg / (days / 7)) * 1000) / 10, days };
}

export function targets(state, todayIso, day) {
  if (!profileReady(state)) return null;
  const p = state.profile, kg = latestWeight(state);
  const rest = bmr(p, kg);
  const ex = exerciseKcal(day, kg);
  const tdee = rest * BASE_ACTIVITY + ex;
  const goal = p.goal || "maintain";
  const trend = weightTrend(state, todayIso);
  const heavyDay = (day?.type === "match" || day?.type === "nets") && day.load?.level === "high";
  const tooFast = goal === "lose" && trend && trend.pctPerWeek < -1;
  let adj = 0, note = null;
  if (goal === "lose") {
    if (heavyDay) note = "Heavy cricket day: eating at maintenance, fuelling beats cutting.";
    else if (tooFast) note = "Weight is dropping faster than 1% a week: deficit paused.";
    else adj = -Math.min(500, tdee * 0.2);
  } else if (goal === "gain") adj = tdee * 0.1;
  const floor = Math.max(FLOOR[p.sex === "f" ? "f" : "m"], rest);
  let kcal = tdee + adj;
  if (kcal < floor) { kcal = floor; note = note || "Held at a safe minimum."; }
  kcal = r5(kcal);
  // Protein on a reference weight so a higher body weight does not inflate it.
  const refKg = Math.min(kg, 27 * (p.heightCm / 100) ** 2);
  const protein = Math.round(refKg * (goal === "lose" ? 2.0 : 1.8));
  const fat = Math.round(Math.max((kcal * 0.27) / 9, refKg * 0.6));
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const water = Math.round((kg * 35 + (ex > 0 ? 500 : 0) + (heavyDay ? 500 : 0)) / 100) / 10;
  return { kcal, protein, carbs, fat, water, bmr: Math.round(rest), tdee: Math.round(tdee), exercise: ex, adj: Math.round(adj), note, trend };
}

export const sumFoods = (list) => list.reduce((a, x) => ({ kcal: a.kcal + (x.kcal || 0), p: a.p + (x.p || 0), c: a.c + (x.c || 0), f: a.f + (x.f || 0) }), { kcal: 0, p: 0, c: 0, f: 0 });
export const foodsOn = (state, iso) => (state.foods || []).filter((x) => x.iso === iso);
export const entryFromFood = (food, qty = 1) => ({ foodId: food.id, name: food.name, serving: food.serving, qty,
  kcal: Math.round(food.kcal * qty), p: Math.round(food.p * qty * 10) / 10, c: Math.round(food.c * qty * 10) / 10, f: Math.round(food.f * qty * 10) / 10 });

const dietOk = (mealDiet, diet) => diet === "any" || mealDiet === "veg" || (diet === "egg" && mealDiet === "egg");
const half = (n) => Math.max(0.5, Math.round(n * 2) / 2);
const dayIndex = (iso) => Math.floor(parseIso(iso).getTime() / 86400000);

// One recommended meal per slot, portions scaled to the slot's share of the target.
export function recommendMeals(state, todayIso, day, t) {
  if (!t) return [];
  const diet = state.profile?.diet || "any";
  const swaps = state.swaps || {};
  const meals = SLOTS.map((slot, si) => {
    const pool = MEALS[slot.key].filter((m) => dietOk(m.diet, diet));
    const pick = pool[(dayIndex(todayIso) + si + (swaps[`${todayIso}:${slot.key}`] || 0)) % pool.length];
    const base = sumFoods(pick.items.map(([id, q]) => entryFromFood(foodById[id], q)));
    const scale = Math.min(2, Math.max(0.5, (t.kcal * slot.share) / base.kcal));
    const items = pick.items.map(([id, q]) => entryFromFood(foodById[id], half(q * scale)));
    return { slot: slot.key, label: slot.label, name: pick.name, items, total: sumFoods(items), tip: null };
  });
  // Protein top-up: whey with the snack first, then a larger portion of each main
  // meal's own protein food. Then trim the starch if the day went over on energy.
  const prot = () => meals.reduce((a, m) => a + m.total.p, 0);
  const kcalNow = () => meals.reduce((a, m) => a + m.total.kcal, 0);
  const setQty = (m, it, q) => { Object.assign(it, entryFromFood(foodById[it.foodId], q)); m.total = sumFoods(m.items); };
  const mains = [meals[1], meals[3], meals[0]];
  for (let n = 0; n < 7 && t.protein - prot() > 10; n++) {
    const snack = meals[2];
    if (n === 0 && !snack.items.some((x) => x.foodId === "whey")) { snack.items.push(entryFromFood(foodById.whey, 1)); snack.total = sumFoods(snack.items); continue; }
    const m = mains[n % mains.length];
    const it = [...m.items].filter((x) => foodById[x.foodId].p >= 8).sort((x, y) => foodById[y.foodId].p / foodById[y.foodId].kcal - foodById[x.foodId].p / foodById[x.foodId].kcal)[0];
    if (it && it.qty < 3) setQty(m, it, it.qty + 0.5);
  }
  for (let n = 0; n < 8 && kcalNow() > t.kcal * 1.04; n++) {
    const m = mains[n % mains.length];
    const it = [...m.items].filter((x) => foodById[x.foodId].c >= 12 && foodById[x.foodId].p < 8 && x.qty > 0.5).sort((x, y) => y.kcal - x.kcal)[0];
    if (it) setQty(m, it, it.qty - 0.5);
  }
  const tips = { run: ["snack", "Have this 60 to 90 minutes before the run"], match: ["breakfast", "Eat 2 to 3 hours before the first ball; sip water through the match"],
    nets: ["snack", "Have this an hour before nets"], strength: ["snack", "Works well after the workout"] };
  const tip = tips[day?.type];
  if (tip) meals.find((m) => m.slot === tip[0]).tip = tip[1];
  return meals;
}

export function searchFoods(q) {
  const s = q.trim().toLowerCase();
  if (!s) return FOODS;
  return FOODS.filter((x) => x.name.toLowerCase().includes(s));
}

// Open Food Facts product JSON -> a food per 100 g (or per serving when listed).
export function foodFromOff(json) {
  const pr = json && json.product;
  if (!pr || !pr.nutriments) return null;
  const n = pr.nutriments, hasServing = n["energy-kcal_serving"] != null;
  const k = (key) => Number(n[`${key}_${hasServing ? "serving" : "100g"}`]) || 0;
  const kcal = k("energy-kcal");
  if (!kcal) return null;
  return { id: `off:${json.code || pr.code || ""}`, name: [pr.brands, pr.product_name].filter(Boolean).join(" ").trim() || "Scanned food",
    serving: hasServing ? pr.serving_size || "1 serving" : "100 g", kcal: Math.round(kcal), p: k("proteins"), c: k("carbohydrates"), f: k("fat") };
}
