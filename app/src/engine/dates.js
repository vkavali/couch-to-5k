// Local-date helpers. v0.1.0 used toISOString() (UTC), which rolled the date
// forward at night in US time zones. Everything here is local time.
export const DAY = 86400000;
const pad = (n) => String(n).padStart(2, "0");

export const isoDay = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseIso = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (iso, n) => {
  const d = parseIso(iso);
  d.setDate(d.getDate() + n);
  return isoDay(d);
};
// a - b in whole days
export const diffDays = (a, b) => Math.round((parseIso(a) - parseIso(b)) / DAY);

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const weekday = (iso) => WD[parseIso(iso).getDay()];
export const dayNum = (iso) => parseIso(iso).getDate();
export const fmtDate = (iso) => {
  const d = parseIso(iso);
  return `${WD[d.getDay()]} ${d.getDate()} ${MO[d.getMonth()]}`;
};
export const mmss = (s) => {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${pad(t % 60)}`;
};
