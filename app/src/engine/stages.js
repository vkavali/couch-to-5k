// The 12-stage ladder. A stage is finished by completing 3 good runs at it,
// not by the calendar. Interval values carry over from the v0.1.0 plan.
export const STAGES = {
  1: { kind: "cycles", jog: 60, walk: 90, reps: 6, note: "Jog 1 min, walk 1.5 min, 6 times" },
  2: { kind: "cycles", jog: 120, walk: 60, reps: 6, note: "Jog 2 min, walk 1 min, 6 times" },
  3: { kind: "cycles", jog: 180, walk: 90, reps: 5, note: "Jog 3 min, walk 1.5 min, 5 times" },
  4: { kind: "cycles", jog: 300, walk: 60, reps: 4, note: "Jog 5 min, walk 1 min, 4 times" },
  5: { kind: "cycles", jog: 480, walk: 120, reps: 3, note: "Jog 8 min, walk 2 min, 3 times" },
  6: { kind: "cycles", jog: 720, walk: 120, reps: 2, note: "Jog 12 min, walk 2 min, twice" },
  7: { kind: "cont", jog: 18 * 60, note: "Jog 18 min non-stop" },
  8: { kind: "cont", jog: 22 * 60, note: "Jog 22 min non-stop" },
  9: { kind: "cont", jog: 26 * 60, note: "Jog 26 min non-stop" },
  10: { kind: "cont", jog: 30 * 60, note: "Jog 30 min non-stop" },
  11: { kind: "cont", jog: 33 * 60, note: "Jog 33 min non-stop" },
  12: { kind: "goal", jog: 45 * 60, note: "Jog until you reach 5 km" },
};
export const LAST_STAGE = 12;
export const RUNS_PER_STAGE = 3;

const WARM = 300;
export function buildPhases(stage) {
  const r = STAGES[stage];
  const ph = [{ label: "Warm-up walk", kind: "walk", secs: WARM }];
  if (r.kind === "cycles") {
    for (let i = 1; i <= r.reps; i++) {
      ph.push({ label: `Jog ${i} of ${r.reps}`, kind: "jog", secs: r.jog });
      ph.push({ label: `Walk ${i} of ${r.reps}`, kind: "walk", secs: r.walk });
    }
  } else {
    ph.push({ label: r.kind === "goal" ? "Jog to 5 km, easy pace" : "Jog, keep it easy", kind: "jog", secs: r.jog });
  }
  ph.push({ label: "Cool-down walk", kind: "walk", secs: WARM });
  return ph;
}
// 30 min brisk walk used as the gate before running again after an injury.
export const walkTestPhases = () => [{ label: "Brisk walk, no pain", kind: "walk", secs: 30 * 60 }];
export const totalSecs = (phases) => phases.reduce((a, p) => a + p.secs, 0);
export const jogSecs = (stage) => buildPhases(stage).filter((p) => p.kind === "jog").reduce((a, p) => a + p.secs, 0);

export const EXERCISES = [
  ["Goblet squat", "Dumbbell at your chest. Sit back, stand up. 12 reps", "legs"],
  ["Romanian deadlift", "Dumbbells at thighs. Hips back, slide down shins, stand tall. 12 reps", "legs"],
  ["Floor press", "On your back, press dumbbells up from the chest. 12 reps", "upper"],
  ["Bent-over row", "Hinge at the hips, pull dumbbells to your ribs. 12 reps", "upper"],
  ["Overhead press", "Press dumbbells from shoulders overhead. 12 reps", "upper"],
  ["Plank", "Forearms down, body straight. Hold 30 sec", "core"],
];
