import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { useLog } from "../../App";
import { C } from "../lib/theme";
import { isoDay, DAY_MS } from "../lib/plan";

export default function ProgressScreen(){
  const { logs, bodyWeights, addWeight } = useLog();
  const [w, setW] = useState("");

  const entries = Object.entries(logs).filter(([,v])=>v.done).sort((a,b)=>a[0]<b[0]?1:-1);
  const runs = entries.filter(([,v])=>v.type==="run");
  const longest = runs.reduce((m,[,v])=>Math.max(m, v.duration||0), 0);

  let streak = 0; let d = new Date(); d = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  while(logs[isoDay(d)]?.done){ streak++; d = new Date(d - DAY_MS); }

  return (
    <ScrollView style={{ flex:1, backgroundColor:C.bg }} contentContainerStyle={{ padding:18 }}>
      <View style={{ flexDirection:"row", gap:10, marginBottom:16 }}>
        <Stat label="Day streak" value={streak} unit="days" color={C.accent}/>
        <Stat label="Runs done" value={runs.length} unit="" color={C.jog}/>
        <Stat label="Longest run" value={longest?Math.round(longest/60):0} unit="min" color={C.walk}/>
      </View>

      <View style={{ backgroundColor:C.panel, borderRadius:14, padding:14, marginBottom:16 }}>
        <Text style={{ color:C.ink, fontWeight:"700", marginBottom:8 }}>Log body weight</Text>
        <View style={{ flexDirection:"row", gap:8 }}>
          <TextInput value={w} onChangeText={setW} keyboardType="decimal-pad" placeholder="kg"
            placeholderTextColor={C.muted}
            style={{ flex:1, backgroundColor:C.panel2, borderColor:C.line, borderWidth:1,
              borderRadius:10, color:C.ink, padding:10, fontSize:15 }}/>
          <TouchableOpacity onPress={()=>{ const kg=parseFloat(w); if(kg){ addWeight(kg); setW(""); } }}
            style={{ backgroundColor:C.accent, borderRadius:10, paddingHorizontal:18, justifyContent:"center" }}>
            <Text style={{ color:"#04211a", fontWeight:"700" }}>Add</Text></TouchableOpacity>
        </View>
        {bodyWeights.length>0 && <Text style={{ color:C.muted, fontSize:12, marginTop:8 }}>
          Latest: {bodyWeights[bodyWeights.length-1].kg} kg · {bodyWeights.length} entries logged
        </Text>}
      </View>

      <Text style={{ color:C.ink, fontWeight:"700", marginBottom:8 }}>Recent sessions</Text>
      {entries.length===0 && <Text style={{ color:C.muted, fontSize:13 }}>
        Nothing logged yet. Finish a workout and it shows up here.</Text>}
      {entries.slice(0,30).map(([iso,v])=>(
        <View key={iso} style={{ flexDirection:"row", alignItems:"center", gap:10,
          backgroundColor:C.panel, borderRadius:10, padding:11, marginBottom:7 }}>
          <View style={{ width:8, height:8, borderRadius:4,
            backgroundColor: v.type==="run"?C.jog : v.type==="strength"?C.str : C.rest }}/>
          <Text style={{ color:C.ink, fontWeight:"700", fontSize:13, textTransform:"capitalize" }}>{v.type}</Text>
          <Text style={{ marginLeft:"auto", color:C.muted, fontSize:12 }}>
            {iso}{v.duration?` · ${Math.round(v.duration/60)} min`:""}{v.distance?` · ${v.distance} km`:""}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

function Stat({ label, value, unit, color }){
  return (
    <View style={{ flex:1, backgroundColor:C.panel, borderRadius:14, paddingVertical:14, alignItems:"center" }}>
      <Text style={{ fontSize:26, fontWeight:"800", color }}>{value}</Text>
      <Text style={{ fontSize:10, color:C.muted }}>{unit}</Text>
      <Text style={{ fontSize:11, color:C.muted, marginTop:2 }}>{label}</Text>
    </View>
  );
}
