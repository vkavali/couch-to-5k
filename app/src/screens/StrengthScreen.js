import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useLog } from "../../App";
import { C } from "../lib/theme";
import { EXERCISES, isoDay, mmss } from "../lib/plan";

export default function StrengthScreen(){
  const { logDay } = useLog();
  const [round, setRound] = useState(1);
  const [checks, setChecks] = useState({});
  const [rest, setRest] = useState(0);
  const restRef = useRef(null);

  useEffect(()=>()=>clearInterval(restRef.current),[]);
  const startRest = ()=>{
    setRest(60); clearInterval(restRef.current);
    restRef.current = setInterval(()=>setRest(r=>{
      if(r<=1){ clearInterval(restRef.current); return 0; } return r-1; }), 1000);
  };
  const key = (r,i)=>`${r}-${i}`;
  const roundDone = EXERCISES.every((_,i)=>checks[key(round,i)]);

  return (
    <ScrollView style={{ flex:1, backgroundColor:C.bg }} contentContainerStyle={{ padding:18 }}>
      <View style={{ flexDirection:"row", alignItems:"center", marginBottom:12 }}>
        <Text style={{ color:C.ink, fontSize:18, fontWeight:"800" }}>Round {round} of 3</Text>
        {rest>0 && <Text style={{ marginLeft:"auto", color:C.str, fontWeight:"800",
          backgroundColor:C.panel, paddingHorizontal:12, paddingVertical:6, borderRadius:10 }}>
          Rest {mmss(rest)}</Text>}
      </View>

      {EXERCISES.map(([name,how],i)=>{
        const on = checks[key(round,i)];
        return (
          <TouchableOpacity key={i} onPress={()=>setChecks(c=>({ ...c, [key(round,i)]:!on }))}
            style={{ flexDirection:"row", gap:12, backgroundColor:C.panel, borderRadius:12,
              padding:12, marginBottom:8, borderLeftWidth:4, borderLeftColor: on?C.accent:C.str }}>
            <View style={{ width:22, height:22, borderRadius:6, marginTop:1,
              borderWidth:2, borderColor: on?C.accent:C.muted,
              backgroundColor: on?C.accent:"transparent", alignItems:"center", justifyContent:"center" }}>
              {on && <Text style={{ color:"#04211a", fontWeight:"900" }}>✓</Text>}
            </View>
            <View style={{ flex:1 }}>
              <Text style={{ fontWeight:"700", color: on?C.muted:C.ink,
                textDecorationLine: on?"line-through":"none" }}>{name}</Text>
              <Text style={{ color:C.muted, fontSize:12, lineHeight:18 }}>{how}</Text>
            </View>
          </TouchableOpacity>
        );
      })}

      <View style={{ flexDirection:"row", gap:10, marginTop:8 }}>
        <TouchableOpacity onPress={startRest} style={{ flex:1, padding:12, borderRadius:12,
          borderWidth:1, borderColor:C.line, alignItems:"center" }}>
          <Text style={{ color:C.ink, fontWeight:"700" }}>Rest 60 sec</Text></TouchableOpacity>
        {round<3 ? (
          <TouchableOpacity disabled={!roundDone} onPress={()=>setRound(r=>r+1)}
            style={{ flex:1, padding:12, borderRadius:12, alignItems:"center",
              backgroundColor: roundDone?C.str:C.panel2 }}>
            <Text style={{ color: roundDone?"#0a0820":C.muted, fontWeight:"700" }}>Next round</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={()=>logDay(isoDay(new Date()),{ type:"strength", done:true })}
            style={{ flex:1, padding:12, borderRadius:12, alignItems:"center", backgroundColor:C.accent }}>
            <Text style={{ color:"#04211a", fontWeight:"800" }}>Finish & log</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={{ color:C.muted, fontSize:11, marginTop:12, lineHeight:18 }}>
        Use a weight you control. When 12 reps feels easy, go heavier next time.
      </Text>
    </ScrollView>
  );
}
