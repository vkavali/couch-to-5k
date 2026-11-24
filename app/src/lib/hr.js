// Bluetooth LE heart-rate service using the standard Heart Rate GATT profile (0x180D).
// Requires a custom dev build with `react-native-ble-plx` — it does NOT run in Expo Go.
// On a dev build this works on iPhone too (unlike the web version).

import { NativeModules, Platform } from "react-native";

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

// The native module only exists in an installed dev/production build.
// (v0.1.0 used require.resolve, which Metro does not provide, so this was always false.)
export function isBleAvailable(){
  return Platform.OS !== "web" && !!NativeModules.BlePlx;
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function b64bytes(str){
  const out = []; let buf = 0, bits = 0;
  for (const ch of str.replace(/=+$/, "")){
    buf = (buf << 6) | B64.indexOf(ch); bits += 6;
    if (bits >= 8){ bits -= 8; out.push((buf >> bits) & 0xff); }
  }
  return out;
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
            const bytes = b64bytes(ch.value); // Buffer is not available in React Native
            const flags = bytes[0];
            const bpm = (flags & 0x1) ? (bytes[1] | (bytes[2] << 8)) : bytes[1];
            onBpm(bpm);
          });
          resolve(()=>{ sub.remove(); d.cancelConnection(); });
        } catch(e){ onError?.(e); reject(e); }
      });
    });
  } catch(e){ onError?.(e); throw e; }
}
