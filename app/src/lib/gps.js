// Foreground GPS for outdoor runs. The screen is kept awake by the timer, so no
// background location permission is requested.
import * as Location from "expo-location";

export async function startTracking(onPoint, onError) {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") { onError?.("Location permission was not granted."); return null; }
    const sub = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 3 },
      (l) => onPoint({ lat: l.coords.latitude, lon: l.coords.longitude, acc: l.coords.accuracy, t: l.timestamp })
    );
    return () => sub.remove();
  } catch (e) { onError?.("GPS is not available on this device."); return null; }
}
