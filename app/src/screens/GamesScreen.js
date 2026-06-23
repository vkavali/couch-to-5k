import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useLog } from "../../App";
import { C } from "../lib/theme";
import { isoDay, fmtDate, dateOf } from "../lib/plan";
import { GAME_TYPES } from "../lib/planAdjust";

export default function GamesScreen(){
  const { games, addGame, removeGame } = useLog();
  const [pickIso, setPickIso] = useState(null);
  const [typeIdx, setTypeIdx] = useState(0);

  // next 21 days as choices
  const today = new Date(); today.setHours(0,0,0,0);
  const options = Array.from({length:21}, (_,i)=>{
    const d = new Date(today.getTime()+i*86400000); return { iso: isoDay(d), date: d };
  });

  const add = ()=>{
    if(!pickIso) return;
    const t = GAME_TYPES[typeIdx];
    addGame({ iso: pickIso, type: t.label, intensity: t.intensity });
    setPickIso(null);
  };

  return (
    <ScrollView style={{ flex:1, backgroundColor:C.bg }} contentContainerStyle={{ padding:18 }}>
      <Text style={{ color:C.ink, fontSize:18, fontWeight:"800" }}>Game days</Text>
      <Text style={{ color:C.muted, fontSize:13, lineHeight:19, marginTop:4, marginBottom:14 }}>
        Add a cricket day and the plan reshapes itself: no run the day before or after, the game
        counts as your hard impact day, and any bumped run shifts to a safe day that week.
      </Text>

      <Section title="1 · Pick the day">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap:8, paddingVertical:2 }}>
          {options.map(o=>{
            const on = pickIso===o.iso;
            return (
              <TouchableOpacity key={o.iso} onPress={()=>setPickIso(o.iso)}
                style={{ paddingVertical:10, paddingHorizontal:14, borderRadius:12,
                  backgroundColor: on?C.accent:C.panel2, minWidth:64, alignItems:"center" }}>
                <Text style={{ color: on?"#04211a":C.ink, fontWeight:"700", fontSize:13 }}>
                  {o.date.toLocaleDateString(undefined,{weekday:"short"})}</Text>
                <Text style={{ color: on?"#04211a":C.muted, fontSize:12 }}>
                  {o.date.toLocaleDateString(undefined,{day:"numeric",month:"short"})}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Section>

      <Section title="2 · What kind of game">
        <View style={{ gap:8 }}>
          {GAME_TYPES.map((t,i)=>{
            const on = typeIdx===i;
            return (
              <TouchableOpacity key={t.label} onPress={()=>setTypeIdx(i)}
                style={{ flexDirection:"row", alignItems:"center", gap:10, padding:12,
                  borderRadius:12, backgroundColor:C.panel,
                  borderWidth:1, borderColor: on?C.accent:C.line }}>
                <View style={{ width:18, height:18, borderRadius:9, borderWidth:2,
                  borderColor: on?C.accent:C.muted, alignItems:"center", justifyContent:"center" }}>
                  {on && <View style={{ width:9, height:9, borderRadius:5, backgroundColor:C.accent }}/>}
                </View>
                <Text style={{ color:C.ink, fontWeight:"600" }}>{t.label}</Text>
                <Text style={{ marginLeft:"auto", color:C.muted, fontSize:11 }}>
                  {t.intensity==="high"?"high impact":t.intensity==="medium"?"medium":"light"}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Section>

      <TouchableOpacity onPress={add} disabled={!pickIso}
        style={{ marginTop:14, padding:13, borderRadius:12, alignItems:"center",
          backgroundColor: pickIso?C.accent:C.panel2 }}>
        <Text style={{ color: pickIso?"#04211a":C.muted, fontWeight:"800" }}>Add game day</Text>
      </TouchableOpacity>

      <Text style={{ color:C.ink, fontWeight:"700", marginTop:22, marginBottom:8 }}>Scheduled games</Text>
      {(!games || games.length===0) && <Text style={{ color:C.muted, fontSize:13 }}>
        None yet. Add your next match above.</Text>}
      {games && games.map(g=>(
        <View key={g.iso} style={{ flexDirection:"row", alignItems:"center", gap:10,
          backgroundColor:C.panel, borderRadius:10, padding:12, marginBottom:7 }}>
          <View style={{ width:8, height:8, borderRadius:4,
            backgroundColor: g.intensity==="high"?C.jog : g.intensity==="medium"?C.warn : C.muted }}/>
          <View>
            <Text style={{ color:C.ink, fontWeight:"700", fontSize:13 }}>
              {fmtDate(new Date(g.iso+"T00:00:00"))}</Text>
            <Text style={{ color:C.muted, fontSize:12 }}>{g.type}</Text>
          </View>
          <TouchableOpacity onPress={()=>removeGame(g.iso)} style={{ marginLeft:"auto", padding:6 }}>
            <Text style={{ color:C.muted, fontSize:18 }}>✕</Text></TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

function Section({ title, children }){
  return (
    <View style={{ marginBottom:16 }}>
      <Text style={{ color:C.muted, fontSize:11, textTransform:"uppercase",
        letterSpacing:1, marginBottom:8 }}>{title}</Text>
      {children}
    </View>
  );
}
