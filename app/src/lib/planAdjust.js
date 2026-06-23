// Reshapes the 12-week plan around logged game days (cricket etc).
// Rules:
//  - A game day becomes a hard impact day ("game").
//  - The day before and after a medium/high-intensity game go run-free
//    (a base run there becomes "recovery"). Low-intensity (fielding) only
//    affects the game day itself.
//  - Each run displaced by a game/adjacent day is moved to a free rest day
//    the same week. If none is free, the run is dropped (that's fine).
//  - Strength is allowed next to a game (low shin impact) but flagged "light".

import { dateOf, typeOf, isoDay } from "./plan";

const DAY = 86400000;

// game types offered in the UI, with their lower-leg impact intensity
export const GAME_TYPES = [
  { label: "Match — bowling", intensity: "high" },
  { label: "Match — batting", intensity: "medium" },
  { label: "Nets / practice", intensity: "medium" },
  { label: "Fielding only",   intensity: "low" },
];

export function buildAdjustedPlan(games = []){
  const gByIso = {};
  games.forEach(g => { gByIso[g.iso] = g; });

  // days adjacent to a medium/high game are run-restricted
  const restrictAdj = new Set();
  games.forEach(g => {
    if (g.intensity === "low") return;
    const d = new Date(g.iso + "T00:00:00");
    restrictAdj.add(isoDay(new Date(d.getTime() - DAY)));
    restrictAdj.add(isoDay(new Date(d.getTime() + DAY)));
  });

  const days = [];
  for (let i = 0; i < 84; i++){
    const date = dateOf(i), iso = isoDay(date);
    days.push({ idx:i, iso, date, base: typeOf(i), isLong: i%7===5,
                type: typeOf(i), note: null, game: gByIso[iso] || null });
  }
  days.forEach(d => { if (d.game) d.type = "game"; });

  for (let w = 0; w < 12; w++){
    const wk = days.slice(w*7, w*7+7);
    const displaced = [];

    wk.forEach(d => {
      if (d.game){ if (d.base === "run") displaced.push(d); return; }
      if (restrictAdj.has(d.iso)){
        if (d.base === "run"){ d.type = "recovery";
          d.note = "Beside a game — no run, let your legs recover"; displaced.push(d); }
        else if (d.base === "strength"){ d.type = "strength";
          d.note = "Day beside a game — keep it light, no jumping"; }
      }
    });

    let toPlace = displaced.length;
    if (toPlace > 0){
      const slots = wk.filter(d => d.type === "rest" && !d.game && !restrictAdj.has(d.iso));
      for (const s of slots){
        if (toPlace <= 0) break;
        s.type = "run"; s.note = "Run moved here to dodge the game days"; toPlace--;
      }
    }
    if (toPlace > 0){
      const gd = wk.find(d => d.game);
      if (gd) gd.note = `Busy week — ${toPlace} run${toPlace>1?"s":""} skipped around the game. That's fine.`;
    }
  }
  return days;
}

export function getAdjustedDay(idx, games = []){
  return buildAdjustedPlan(games)[Math.max(0, Math.min(83, idx))];
}
