// GPS distance. Points with poor accuracy or impossible jumps are dropped.
const R = 6371000, rad = (d) => (d * Math.PI) / 180;
export function haversine(a, b) {
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
// Returns the new total in metres and the last accepted point.
export function addPoint(track, pt) {
  if (pt.acc != null && pt.acc > 30) return track;
  if (!track.last) return { ...track, last: pt };
  const d = haversine(track.last, pt), dt = Math.max(0.001, (pt.t - track.last.t) / 1000);
  if (d < 3) return track; // standing still jitter
  if (d / dt > 8) return { ...track, last: pt }; // faster than 29 km/h: a GPS jump, not running
  return { metres: track.metres + d, last: pt };
}
export const emptyTrack = () => ({ metres: 0, last: null });
export const pace = (secs, metres) => (metres > 50 ? secs / (metres / 1000) : null); // sec per km
