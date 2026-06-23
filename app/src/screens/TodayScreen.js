import React, { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useLog } from "../../App";
import { C } from "../lib/theme";
import { dateOf, typeOf, weekOf, isoDay, fmtDate, todayIndex, RECIPES } from "../lib/plan";
import { buildAdjustedPlan } from "../lib/planAdjust";

export default function TodayScreen({ navigation }){
  const { logs, logDay, games } = useLog();
  const [idx, setIdx] = useState(Math.max(0, Math.min(83, todayIndex())));

  const plan = useMemo(()=>buildAdjustedPlan(games||[]), [games]);
  const day = plan[idx];
  const d = dateOf(idx), t = day.type, wk = weekOf(idx);
  const iso = isoDay(d), done = logs[iso]?.done;
  const isToday = idx === todayIndex();
  const colour = t==="run"?C.jog : t==="strength"?C.str
    : t==="game"?C.warn : t==="recovery"?C.walk : C.rest;
  const r = RECIPES[wk];
  const longRun = day.isLong;

  return (
    <ScrollView style={{ flex:1, backgroundColor:C.bg }} contentContainerStyle={{ padding:18 }}>
      <View style={{ flexDirection:"row", alignItems:"center", justifyContent:"space-between",
        backgroundColor:C.panel, borderRadius:14, padding:10, marginBottom:14 }}>
        <TouchableOpacity onPress={()=>setIdx(i=>Math.max(0,i-1))}>
          <Text style={{ color:C.ink, fontSize:22, paddingHorizontal:8 }}>‹</Text></TouchableOpacity>
        <View style={{ alignItems:"center" }}>
          <Text style={{ color:C.ink, fontWeight:"700" }}>{isToday?"Today · ":""}{fmtDate(d)}</Text>
          <Text style={{ color:C.muted, fontSize:11 }}>Week {wk} · Day {idx+1} of 84</Text>
        </View>
        <TouchableOpacity onPress={()=>setIdx(i=>Math.min(83,i+1))}>
          <Text style={{ color:C.ink, fontSize:22, paddingHorizontal:8 }}>›</Text></TouchableOpacity>
      </View>

      <View style={{ backgroundColor:C.panel, borderRadius:18, overflow:"hidden" }}>
        <View style={{ height:6, backgroundColor:colour }}/>
        <View style={{ padding:16 }}>
          <Text style={{ color:colour, fontWeight:"800", letterSpacing:1.5, fontSize:12 }}>
            {t==="run" ? (longRun?"LONG RUN":"RUN") : t==="strength" ? "STRENGTH"
              : t==="game" ? "GAME DAY" : t==="recovery" ? "RECOVERY" : "REST DAY"}
          </Text>

          {t==="run" && <>
            <Text style={{ color:C.ink, fontSize:22, fontWeight:"800", marginTop:8 }}>{r.note}</Text>
            <Text style={{ color:C.muted, fontSize:13, lineHeight:20, marginTop:8 }}>
              Walk 5 min to warm up, do the session, then walk 5 min to cool down.
              Keep the jog slow enough that you could still talk.
            </Text>
            <Primary bg={C.jog} label="Start guided run" onPress={()=>navigation.navigate("Run")}/>
          </>}

          {t==="strength" && <>
            <Text style={{ color:C.ink, fontSize:22, fontWeight:"800", marginTop:8 }}>Full-body dumbbells</Text>
            <Text style={{ color:C.muted, fontSize:13, lineHeight:20, marginTop:8 }}>
              3 rounds · 12 reps each · ~30 min. Same workout every strength day.
            </Text>
            <Primary bg={C.str} label="Open strength workout" onPress={()=>navigation.navigate("Strength")}/>
          </>}

          {t==="game" && <>
            <Text style={{ color:C.ink, fontSize:22, fontWeight:"800", marginTop:8 }}>
              {day.game?.type || "Cricket"}</Text>
            <Text style={{ color:C.muted, fontSize:13, lineHeight:20, marginTop:8 }}>
              This is your hard impact day. Warm up well first, keep your slow run-up, and cut
              your overs if your shins sharpen up. No separate workout today.
            </Text>
          </>}

          {t==="recovery" && <>
            <Text style={{ color:C.ink, fontSize:22, fontWeight:"800", marginTop:8 }}>Recovery — no run</Text>
            <Text style={{ color:C.muted, fontSize:13, lineHeight:20, marginTop:8 }}>
              You've a game right next to today, so running is off to protect your shins. Gentle
              walking, calf raises, and mobility are great. Strength is fine if it's pain-free.
            </Text>
          </>}

          {t==="rest" && <>
            <Text style={{ color:C.ink, fontSize:22, fontWeight:"800", marginTop:8 }}>Recover</Text>
            <Text style={{ color:C.muted, fontSize:13, lineHeight:20, marginTop:8 }}>
              Take the day off, or an easy 20-minute walk. Rest is when you actually get fitter.
            </Text>
          </>}

          {day.note && <Text style={{ color:C.warn, fontSize:12, lineHeight:18, marginTop:10 }}>
            {day.note}</Text>}

          <TouchableOpacity onPress={()=>logDay(iso,{ type:t, done:!done })}
            style={{ marginTop:14, padding:12, borderRadius:12, alignItems:"center",
              borderWidth:1, borderColor: done?C.line:C.accent,
              backgroundColor: done?"transparent":C.accent }}>
            <Text style={{ color: done?C.muted:"#04211a", fontWeight:"700" }}>
              {done ? "Mark as not done" : "Mark day complete"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

function Primary({ bg, label, onPress }){
  return (
    <TouchableOpacity onPress={onPress} style={{ marginTop:14, padding:13, borderRadius:12,
      backgroundColor:bg, alignItems:"center" }}>
      <Text style={{ color:"#04211a", fontWeight:"800", fontSize:15 }}>{label}</Text>
    </TouchableOpacity>
  );
}
