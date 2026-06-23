// Bluetooth LE heart-rate service using the standard Heart Rate GATT profile (0x180D).
// Requires a custom dev build with `react-native-ble-plx` — it does NOT run in Expo Go.
// On a dev build this works on iPhone too (unlike the web version).

const HR_SERVICE = "0000180d-0000-1000-8000-00805f9b34fb";
const HR_CHAR    = "00002a37-0000-1000-8000-00805f9b34fb";

let manager = null;

function getManager(){
  if(manager) return manager;
  // Lazy require so the JS bundles/runs even when the native module is absent.
  const { BleManager } = require("react-native-ble-plx");
  manager = new BleManager();
  return manager;
}

export function isBleAvailable(){
  try { require.resolve("react-native-ble-plx"); return true; }
  catch { return false; }
}

// onBpm(bpm) called on every measurement. Returns a stop() function.
export async function connectHeartRate(onBpm, onError){
  try {
    const m = getManager();
    return await new Promise((resolve, reject)=>{
      m.startDeviceScan([HR_SERVICE], null, async (err, device)=>{
        if(err){ onError?.(err); reject(err); return; }
        if(!device) return;
        m.stopDeviceScan();
        try {
          const d = await device.connect();
          await d.discoverAllServicesAndCharacteristics();
          const sub = d.monitorCharacteristicForService(HR_SERVICE, HR_CHAR, (e, ch)=>{
            if(e || !ch?.value) return;
            const bytes = Buffer.from(ch.value, "base64");
            const flags = bytes[0];
            const bpm = (flags & 0x1) ? bytes.readUInt16LE(1) : bytes[1];
            onBpm(bpm);
          });
          resolve(()=>{ sub.remove(); d.cancelConnection(); });
        } catch(e){ onError?.(e); reject(e); }
      });
    });
  } catch(e){ onError?.(e); throw e; }
}
