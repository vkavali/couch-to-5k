// The 12-week Couch-to-5K plan. Day 1 = the START date below.
export const START = new Date(2026, 5, 23); // Tue 23 Jun 2026

export const RECIPES = {
  1:{kind:"cycles", jog:60,  walk:90,  reps:6, note:"jog 1 min / walk 1.5 min ×6"},
  2:{kind:"cycles", jog:120, walk:60,  reps:6, note:"jog 2 min / walk 1 min ×6"},
  3:{kind:"cycles", jog:180, walk:90,  reps:5, note:"jog 3 min / walk 1.5 min ×5"},
  4:{kind:"cycles", jog:300, walk:60,  reps:4, note:"jog 5 min / walk 1 min ×4"},
  5:{kind:"cycles", jog:480, walk:120, reps:3, note:"jog 8 min / walk 2 min ×3"},
  6:{kind:"cycles", jog:720, walk:120, reps:2, note:"jog 12 min / walk 2 min ×2"},
  7:{kind:"cont", jog:18*60, note:"jog 18 min non-stop"},
  8:{kind:"cont", jog:22*60, note:"jog 22 min non-stop"},
  9:{kind:"cont", jog:26*60, note:"jog 26 min non-stop"},
  10:{kind:"cont",jog:30*60, note:"jog 30 min non-stop (~4–4.5 km)"},
  11:{kind:"cont",jog:33*60, note:"jog 33 min non-stop"},
  12:{kind:"goal",jog:45*60, note:"jog until you reach 5 km — GOAL"},
};

// week shape: Run, Strength, Rest, Run, Strength, Long run, Rest
export const PATTERN = ["run","strength","rest","run","strength","run","rest"];

export const EXERCISES = [
  ["Goblet squat","Hold one dumbbell at your chest. Sit down like into a chair, stand up. ×12"],
  ["Romanian deadlift","Dumbbells at thighs. Push hips back, slide down shins, stand tall. ×12"],
  ["Floor press","On your back, press dumbbells up from the chest. (Or push-ups.) ×12"],
  ["Bent-over row","Bend at hips, pull dumbbells to your ribs, lower. ×12"],
  ["Overhead press","Standing, press dumbbells from shoulders overhead. ×12"],
  ["Plank","Forearms down, body straight, belly tight. Hold 30 sec."],
];

const DAY = 86400000;

export const isoDay = (d) => d.toISOString().slice(0,10);
export const mmss = (s) => {
  const m = Math.floor(s/60), x = Math.floor(s%60);
  return `${m}:${String(x).padStart(2,"0")}`;
};
export const fmtDate = (d) =>
  d.toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short"});

export const weekOf = (idx) => Math.min(12, Math.floor(idx/7)+1);
export const typeOf = (idx) => PATTERN[((idx%7)+7)%7];
export const dateOf = (idx) => new Date(START.getTime()+idx*DAY);

export function todayIndex(){
  const t = new Date();
  const a = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  return Math.round((a-START)/DAY);
}

// Build the ordered phases for a run, including warm-up and cool-down.
export function buildPhases(week){
  const r = RECIPES[week]; const ph = [];
  ph.push({label:"Warm-up walk", kind:"walk", secs:300});
  if(r.kind === "cycles"){
    for(let i=1;i<=r.reps;i++){
      ph.push({label:`Jog · cycle ${i}/${r.reps}`, kind:"jog", secs:r.jog});
      ph.push({label:`Walk · recover ${i}/${r.reps}`, kind:"walk", secs:r.walk});
    }
  } else {
    ph.push({label: r.kind==="goal" ? "Jog to 5 km — easy pace" : "Jog · keep it easy",
             kind:"jog", secs:r.jog});
  }
  ph.push({label:"Cool-down walk", kind:"walk", secs:300});
  return ph;
}

export const DAY_MS = DAY;
