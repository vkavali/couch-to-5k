// Merge two copies of the state (phone and server). Record-level: the newer write
// wins, and a delete (tombstone) beats any older copy of the same record.
import { emptyState } from "./state.js";

const KEYS = { sessions: "id", events: "iso", injuries: "id", checkins: "iso", overrides: "iso", weights: "iso", foods: "id" };
const byIso = (a, b) => (a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0);

export function mergeStates(a, b) {
  const A = { ...emptyState(), ...(a || {}) }, B = { ...emptyState(), ...(b || {}) };
  const out = emptyState();
  const tomb = { ...(A.tombstones || {}) };
  Object.entries(B.tombstones || {}).forEach(([k, ts]) => { tomb[k] = Math.max(tomb[k] || 0, ts); });
  for (const [list, key] of Object.entries(KEYS)) {
    const m = new Map();
    [...(A[list] || []), ...(B[list] || [])].forEach((r) => {
      const k = `${list}:${r[key]}`;
      if (tomb[k] && tomb[k] >= (r.ts || 0)) return;
      const cur = m.get(k);
      if (!cur || (r.ts || 0) > (cur.ts || 0)) m.set(k, r);
    });
    out[list] = [...m.values()].sort(list === "injuries" ? (x, y) => (x.startIso < y.startIso ? -1 : 1) : byIso);
  }
  out.profile = (A.profile?.ts || 0) >= (B.profile?.ts || 0) ? A.profile : B.profile;
  out.swaps = { ...(B.swaps || {}), ...(A.swaps || {}) };
  out.tombstones = tomb;
  return out;
}
export const sameState = (a, b) => JSON.stringify(a) === JSON.stringify(b);
