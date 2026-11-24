// Cricket load is computed from what was done, never picked by the user.
// One event can hold several roles (bowled, batted, fielded, kept).
export function eventLoad(ev) {
  let score = (ev.bowlOvers || 0) * 1.2;
  if (ev.kind === "nets") score += (ev.minutes || 0) / 20;
  else score += (ev.batted ? 2 : 0) + (ev.fielded ? 2 : 0) + (ev.kept ? 3 : 0);
  score = Math.round(score * 10) / 10;
  const level = score >= 6 ? "high" : score >= 3 ? "medium" : "low";
  return { score, level };
}
export const LOAD_TEXT = {
  high: "High load: no run the day before or after",
  medium: "Medium load: no run the day after",
  low: "Light load: only this day is affected",
};
export function eventSummary(ev) {
  const parts = [];
  if (ev.bowlOvers) parts.push(`${ev.bowlOvers} overs`);
  if (ev.kind === "nets") { if (ev.minutes) parts.push(`${ev.minutes} min`); }
  else {
    if (ev.batted) parts.push("batted");
    if (ev.fielded) parts.push("fielded");
    if (ev.kept) parts.push("kept");
  }
  return parts.join(", ") || "no roles set";
}
