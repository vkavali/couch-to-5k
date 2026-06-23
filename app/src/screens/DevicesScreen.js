import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { C } from "../lib/theme";
import { isBleAvailable, connectHeartRate } from "../lib/hr";

export default function DevicesScreen(){
  const [hr, setHr] = useState(null);
  const [status, setStatus] = useState("idle");
  const ble = isBleAvailable();

  const connect = async ()=>{
    if(!ble){ setStatus("nobuild"); return; }
    setStatus("connecting");
    try {
      await connectHeartRate(
        (bpm)=>{ setHr(bpm); setStatus("connected"); },
        ()=>setStatus("error"));
    } catch { setStatus("error"); }
  };

  const msg = {
    idle:"Not connected.", connecting:"Scanning…",
    connected:`Live: ${hr ?? "--"} bpm`, error:"Couldn't connect — try again.",
    nobuild:"Needs a dev build (see note).",
  }[status];

  return (
    <ScrollView style={{ flex:1, backgroundColor:C.bg }} contentContainerStyle={{ padding:18 }}>
      <Card>
        <Row title="Heart-rate monitor" right={msg}
          rightColor={status==="connected"?C.accent:C.muted}/>
        <Text style={{ color:C.muted, fontSize:12.5, lineHeight:19, marginVertical:10 }}>
          Connects to any standard Bluetooth heart-rate strap or monitor — and on a custom
          dev build this works on iPhone too, unlike the web version. Some Garmin watches can
          broadcast standard heart rate (enable “Broadcast HR” on the watch) and then show up here.
        </Text>
        <Primary bg={C.jog} label={status==="connected"?"Reconnect":"Connect monitor"} onPress={connect}/>
        {!ble && <Text style={{ color:C.warn, fontSize:12, marginTop:10, lineHeight:18 }}>
          You’re likely running in Expo Go, which has no native Bluetooth module. Run a dev build
          (`npx expo run:ios` / `run:android` after adding `react-native-ble-plx`) to enable HR.
        </Text>}
      </Card>

      <Card>
        <Row title="Garmin watch sync" right="Needs the backend" rightColor={C.warn}/>
        <Text style={{ color:C.muted, fontSize:12.5, lineHeight:19, marginTop:10 }}>
          Pulling runs, HR, and sleep from Garmin Connect requires Garmin’s official Health API,
          which needs an approved Garmin Developer Program account, OAuth sign-in, and a small
          server to receive Garmin’s data webhooks. That server skeleton is in the `/server`
          folder of this repo — add your Garmin consumer key/secret and deploy it, then point
          the app at it. Until then, run with your watch and log the time/distance here after.
        </Text>
      </Card>
    </ScrollView>
  );
}

function Card({ children }){
  return <View style={{ backgroundColor:C.panel, borderRadius:16, padding:16, marginBottom:14 }}>{children}</View>;
}
function Row({ title, right, rightColor }){
  return (
    <View style={{ flexDirection:"row", alignItems:"center" }}>
      <Text style={{ color:C.ink, fontWeight:"700" }}>{title}</Text>
      <Text style={{ marginLeft:"auto", color:rightColor, fontSize:12 }}>{right}</Text>
    </View>
  );
}
function Primary({ bg, label, onPress }){
  return (
    <TouchableOpacity onPress={onPress} style={{ padding:12, borderRadius:12, backgroundColor:bg, alignItems:"center" }}>
      <Text style={{ color:"#04211a", fontWeight:"800" }}>{label}</Text>
    </TouchableOpacity>
  );
}
