import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useLog } from "../../App";
import { C } from "../lib/theme";
import { buildPhases, weekOf, todayIndex, mmss, RECIPES } from "../lib/plan";

export default function RunTimerScreen(){
  const { logRunToday } = useLog();
  const wk = weekOf(Math.max(0, Math.min(83, todayIndex())));
  const phasesRef = useRef(buildPhases(wk));
  const [pi, setPi] = useState(0);
  const [left, setLeft] = useState(phasesRef.current[0].secs);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(()=>{
    phasesRef.current = buildPhases(wk);
    setPi(0); setLeft(phasesRef.current[0].secs);
    setRunning(false); setElapsed(0); setFinished(false);
  },[wk]);

  useEffect(()=>{
    if(!running) return;
    const id = setInterval(()=>{
      setLeft(l=>{
        if(l>1){ setElapsed(e=>e+1); return l-1; }
        setElapsed(e=>e+1);
        setPi(prev=>{
          const next = prev+1;
          if(next >= phasesRef.current.length){ setRunning(false); setFinished(true); return prev; }
          setTimeout(()=>setLeft(phasesRef.current[next].secs), 0);
          return next;
        });
        return 0;
      });
    }, 1000);
    return ()=>clearInterval(id);
  },[running]);

  const cur = phasesRef.current[pi];
  const total = phasesRef.current.reduce((a,p)=>a+p.secs,0);
  const phaseColor = cur.kind==="jog" ? C.jog : C.walk;
  const frac = cur.secs ? (cur.secs-left)/cur.secs : 0;
  const R = 120, CIRC = 2*Math.PI*R;

  const reset = ()=>{ setRunning(false); setPi(0);
    setLeft(phasesRef.current[0].secs); setElapsed(0); setFinished(false); };
  const skip = ()=> setPi(prev=>{
    const next = prev+1;
    if(next >= phasesRef.current.length){ setRunning(false); setFinished(true); return prev; }
    setTimeout(()=>setLeft(phasesRef.current[next].secs), 0); return next;
  });

  if(finished) return <FinishLog wk={wk} elapsed={elapsed}
    onLog={(rec)=>logRunToday(rec)} onAgain={reset}/>;

  return (
    <ScrollView style={{ flex:1, backgroundColor:C.bg }}
      contentContainerStyle={{ padding:18, alignItems:"center" }}>
      <Text style={{ color:C.muted, fontSize:12, marginBottom:6 }}>
        Week {wk} · {RECIPES[wk].note}
      </Text>

      <View style={{ width:280, height:280, alignItems:"center", justifyContent:"center" }}>
        <Svg width={280} height={280} style={{ position:"absolute", transform:[{ rotate:"-90deg" }] }}>
          <Circle cx={140} cy={140} r={R} stroke={C.panel2} strokeWidth={16} fill="none"/>
          <Circle cx={140} cy={140} r={R} stroke={phaseColor} strokeWidth={16} fill="none"
            strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC*(1-frac)}/>
        </Svg>
        <Text style={{ color:phaseColor, fontWeight:"800", letterSpacing:2, fontSize:13 }}>
          {cur.kind.toUpperCase()}</Text>
        <Text style={{ color:C.ink, fontSize:54, fontWeight:"800" }}>{mmss(left)}</Text>
        <Text style={{ color:C.muted, fontSize:12, maxWidth:170, textAlign:"center" }}>{cur.label}</Text>
      </View>

      <Text style={{ color:C.muted, fontSize:12, marginTop:6 }}>
        Total {mmss(elapsed)} / {mmss(total)} planned · phase {pi+1}/{phasesRef.current.length}
      </Text>

      <View style={{ flexDirection:"row", gap:14, marginTop:18, alignItems:"center" }}>
        <Round onPress={reset} label="↺"/>
        <TouchableOpacity onPress={()=>setRunning(r=>!r)}
          style={{ width:84, height:84, borderRadius:42, backgroundColor:phaseColor,
            alignItems:"center", justifyContent:"center" }}>
          <Text style={{ fontSize:30, color:"#06151f" }}>{running ? "❚❚" : "▶"}</Text>
        </TouchableOpacity>
        <Round onPress={skip} label="⏭"/>
      </View>

      <TouchableOpacity onPress={()=>setFinished(true)} style={{ marginTop:16 }}>
        <Text style={{ color:C.muted, fontSize:12, textDecorationLine:"underline" }}>End & log now</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Round({ onPress, label }){
  return (
    <TouchableOpacity onPress={onPress} style={{ width:60, height:60, borderRadius:30,
      borderWidth:1, borderColor:C.line, backgroundColor:C.panel,
      alignItems:"center", justifyContent:"center" }}>
      <Text style={{ color:C.ink, fontSize:20 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function FinishLog({ wk, elapsed, onLog, onAgain }){
  const [dist, setDist] = useState(wk>=10 ? "5" : "");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const inp = { backgroundColor:C.panel2, borderColor:C.line, borderWidth:1, borderRadius:10,
    color:C.ink, padding:11, fontSize:15, marginTop:4 };
  return (
    <ScrollView style={{ flex:1, backgroundColor:C.bg }} contentContainerStyle={{ padding:18 }}>
      <View style={{ alignItems:"center", marginVertical:14 }}>
        <Text style={{ fontSize:44 }}>🏁</Text>
        <Text style={{ color:C.ink, fontSize:20, fontWeight:"800" }}>Run done</Text>
        <Text style={{ color:C.muted, fontSize:13 }}>{mmss(elapsed)} moving · Week {wk}</Text>
      </View>
      <Text style={{ color:C.muted, fontSize:13 }}>Distance (km, optional)</Text>
      <TextInput value={dist} onChangeText={setDist} keyboardType="decimal-pad"
        placeholder="e.g. 3.2" placeholderTextColor={C.muted} style={inp}/>
      <Text style={{ color:C.muted, fontSize:13, marginTop:10 }}>How did it feel?</Text>
      <TextInput value={notes} onChangeText={setNotes} placeholder="easy / tough / legs sore…"
        placeholderTextColor={C.muted} style={inp}/>
      {!saved ? (
        <TouchableOpacity onPress={()=>{ onLog({ duration:elapsed,
          distance: dist?parseFloat(dist):null, notes }); setSaved(true); }}
          style={{ marginTop:16, padding:13, borderRadius:12, backgroundColor:C.accent, alignItems:"center" }}>
          <Text style={{ color:"#04211a", fontWeight:"800" }}>Save to log</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ alignItems:"center", marginTop:16 }}>
          <Text style={{ color:C.accent, fontWeight:"700", marginBottom:10 }}>Saved ✓</Text>
          <TouchableOpacity onPress={onAgain} style={{ borderWidth:1, borderColor:C.line,
            borderRadius:10, paddingVertical:10, paddingHorizontal:16 }}>
            <Text style={{ color:C.ink }}>Reset timer</Text></TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}
