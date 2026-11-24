import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Svg, { Polyline, Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useT, TYPE, typeColor } from "../ui/theme";
import { Screen, Card, H1, Label, Muted, Body, Btn, Row, Tile, Ladder } from "../ui/kit";
import { stats, fmtDate, mmss } from "../engine";
import { isBleAvailable, connectHeartRate } from "../lib/hr";
import { useApp } from "../../App";

const NAMES = { run: "Run", strength: "Strength", walkTest: "Walk test", rehab: "Recovery work" };

function WeightChart({ weights }) {
  const T = useT();
  const [w, setW] = useState(0);
  if (weights.length < 2) return <Muted>Log your weight twice on the Log tab to see the trend.</Muted>;
  const H = 110, vals = weights.map((x) => x.kg), lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
  const pts = weights.map((x, i) => [8 + (i / (weights.length - 1)) * Math.max(0, w - 16), 10 + (1 - (x.kg - lo) / span) * (H - 20)]);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: H }}>
      {w > 0 ? (
        <Svg width={w} height={H}>
          <Polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={T.pitch} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
          {pts.map((p, i) => <Circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 5 : 3} fill={T.pitch} />)}
        </Svg>
      ) : null}
    </View>
  );
}

export default function ProgressScreen() {
  const T = useT();
  const { state, today, prog, act } = useApp();
  const st = stats(state, today);
  const [hr, setHr] = useState(null); const [status, setStatus] = useState("idle");
  const ble = isBleAvailable();
  const connect = async () => {
    if (!ble) return setStatus("nobuild");
    setStatus("connecting");
    try { await connectHeartRate((bpm) => { setHr(bpm); setStatus("connected"); }, () => setStatus("error")); } catch { setStatus("error"); }
  };
  const hrText = { idle: "Not connected", connecting: "Scanning…", connected: `${hr ?? "--"} bpm`, error: "Could not connect", nobuild: "Needs the installed app build" }[status];
  const history = [...state.sessions].reverse().slice(0, 20);
  const w = state.weights;

  return (
    <Screen>
      <View style={{ gap: 2 }}><Label>Since you started</Label><H1>Progress</H1></View>
      <Row><Tile label="Runs" value={String(st.runs)} sub={`${st.strength} strength`} /><Tile label="Distance" value={`${st.km}`} sub="km logged" /></Row>
      <Row><Tile label="Longest run" value={mmss(st.longest)} sub="moving time" /><Tile label="Active weeks" value={String(st.weeks)} sub="in a row, 2+ runs" /></Row>

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Label>Stage {prog.stage} of 12</Label>
          <Text style={{ marginLeft: "auto", color: T.muted, fontSize: 13, fontWeight: "700" }}>{prog.count}/3 runs</Text>
        </View>
        <Ladder stage={prog.stage} count={prog.count} />
      </Card>

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Label>Body weight</Label>
          {w.length ? <Text style={{ marginLeft: "auto", color: T.ink, fontSize: 15, fontWeight: "800" }}>{w[w.length - 1].kg} kg</Text> : null}
        </View>
        <WeightChart weights={w.slice(-30)} />
      </Card>

      <Card style={{ gap: 0 }}>
        <Label>History</Label>
        {!history.length ? <Muted style={{ paddingTop: 8 }}>Finished sessions show up here.</Muted> : null}
        {history.map((s, i) => (
          <View key={s.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: T.line, marginTop: i ? 0 : 8 }}>
            <Ionicons name={(TYPE[s.kind] || TYPE.rest).icon} size={20} color={typeColor(T, s.kind)} />
            <View style={{ flex: 1 }}>
              <Body style={{ fontWeight: "700" }}>{NAMES[s.kind] || s.kind}{s.kind === "run" ? `, stage ${s.stage}` : ""}{s.completed === false ? " (stopped early)" : ""}</Body>
              <Muted>{fmtDate(s.iso)}{s.secs ? ` · ${mmss(s.secs)}` : ""}{s.km ? ` · ${s.km} km` : ""}{s.pain ? ` · pain ${s.pain}/10` : ""}</Muted>
            </View>
            <TouchableOpacity onPress={() => act("removeSession", s.id)} accessibilityLabel="Delete session" style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="trash-outline" size={19} color={T.muted} />
            </TouchableOpacity>
          </View>
        ))}
      </Card>

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Label>Heart-rate strap</Label>
          <Text style={{ marginLeft: "auto", color: status === "connected" ? T.ok : T.muted, fontSize: 13, fontWeight: "700" }}>{hrText}</Text>
        </View>
        <Muted>Any standard Bluetooth strap, or a Garmin watch with Broadcast HR turned on. Works in the installed build, not in Expo Go or the web preview.</Muted>
        <Btn kind="soft" label={status === "connected" ? "Reconnect" : "Connect"} icon="heart" onPress={connect} />
      </Card>
    </Screen>
  );
}
