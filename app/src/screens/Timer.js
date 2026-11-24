// Guided run / walk-test timer. Uses the wall clock, so it stays correct when the
// phone locks or the app is in the background (v0.1.0 counted ticks and drifted).
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Vibration } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useT } from "../ui/theme";
import { Sheet, Card, Btn, Row, Label, Muted, H2, PainScale, Chips, Field, Banner } from "../ui/kit";
import { buildPhases, walkTestPhases, totalSecs, mmss } from "../engine";
import { useApp } from "../../App";

const EFFORT = [{ key: 3, label: "Easy" }, { key: 5, label: "Steady" }, { key: 7, label: "Hard" }, { key: 9, label: "Max" }];

export default function Timer({ visible, onClose, day }) {
  const T = useT();
  const { act, today } = useApp();
  const walk = day?.type === "walkTest";
  const ph = useMemo(() => (!day ? [] : walk ? walkTestPhases() : day.stage ? buildPhases(day.stage) : []), [day?.stage, walk]);
  const [elapsed, setElapsed] = useState(0); // real seconds moved
  const [offset, setOffset] = useState(0); // seconds skipped
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const clock = useRef({ start: 0, base: 0 });
  const lastPhase = useRef(0);
  const [km, setKm] = useState(""); const [rpe, setRpe] = useState(5); const [pain, setPain] = useState(0);

  useEffect(() => {
    if (!visible || !day) return;
    setElapsed(0); setOffset(0); setRunning(false); setDone(false); setKm(""); setRpe(5); setPain(0);
    clock.current = { start: 0, base: 0 }; lastPhase.current = 0;
  }, [visible, day?.iso, day?.stage, walk]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed(clock.current.base + (Date.now() - clock.current.start) / 1000), 250);
    return () => clearInterval(id);
  }, [running]);

  const total = totalSecs(ph);
  const pos = Math.min(total, elapsed + offset);
  let idx = 0, acc = 0;
  while (idx < ph.length - 1 && pos >= acc + ph[idx].secs) { acc += ph[idx].secs; idx++; }
  const cur = ph[idx] || { label: "", kind: "walk", secs: 1 };
  const left = Math.max(0, acc + cur.secs - pos);

  useEffect(() => { if (idx !== lastPhase.current) { lastPhase.current = idx; Vibration.vibrate(400); } }, [idx]);
  useEffect(() => { if (total > 0 && pos >= total && !done) { setRunning(false); setDone(true); Vibration.vibrate([0, 400, 200, 400]); } }, [pos, total, done]);

  const toggle = () => {
    if (running) { clock.current.base = elapsed; setRunning(false); }
    else { clock.current = { start: Date.now(), base: elapsed }; setRunning(true); }
  };
  const skip = () => setOffset((o) => o + left);
  const finishEarly = () => { clock.current.base = elapsed; setRunning(false); setDone(true); };
  const save = () => {
    const completed = pos >= total;
    act("addSession", { iso: today, kind: walk ? "walkTest" : "run", stage: day.stage, secs: Math.round(elapsed), km: Number(km) || 0, rpe, pain, completed });
    onClose();
  };

  const col = cur.kind === "jog" ? T.cherry : T.pitch;
  const R = 118, C = 2 * Math.PI * R, frac = cur.secs ? 1 - left / cur.secs : 0;

  return (
    <Sheet visible={visible} onClose={onClose} title={walk ? "Walk test" : day ? `Stage ${day.stage} run` : ""}>
      {!done ? (
        <>
          <View style={{ alignItems: "center", paddingVertical: 8 }}>
            <Svg width={270} height={270} viewBox="0 0 270 270">
              <Circle cx={135} cy={135} r={R} stroke={T.panel2} strokeWidth={16} fill="none" />
              <Circle cx={135} cy={135} r={R} stroke={col} strokeWidth={16} fill="none" strokeLinecap="round"
                strokeDasharray={`${C} ${C}`} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 135 135)" />
            </Svg>
            <View style={{ position: "absolute", top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
              <Label color={col}>{cur.kind === "jog" ? "Jog" : "Walk"}</Label>
              <Text style={{ color: T.ink, fontSize: 62, fontWeight: "800", fontVariant: ["tabular-nums"], letterSpacing: -1 }}>{mmss(left)}</Text>
              <Muted>{cur.label}</Muted>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 3 }}>
            {ph.map((p, i) => (
              <View key={i} style={{ flex: p.secs, height: 8, borderRadius: 4, backgroundColor: i < idx ? T.muted : i === idx ? (p.kind === "jog" ? T.cherry : T.pitch) : T.panel2 }} />
            ))}
          </View>
          <Row>
            <Card style={{ flex: 1 }}><Label>Elapsed</Label><H2>{mmss(elapsed)}</H2></Card>
            <Card style={{ flex: 1 }}><Label>Left</Label><H2>{mmss(total - pos)}</H2></Card>
            <Card style={{ flex: 1 }}><Label>Step</Label><H2>{idx + 1}/{ph.length}</H2></Card>
          </Row>
          <Btn label={running ? "Pause" : elapsed > 0 ? "Resume" : "Start"} icon={running ? "pause" : "play"} onPress={toggle} color={col} />
          <Row>
            <Btn kind="soft" label="Skip step" icon="play-skip-forward" onPress={skip} style={{ flex: 1 }} />
            <Btn kind="soft" label="Finish now" icon="flag" onPress={finishEarly} disabled={elapsed < 1} style={{ flex: 1 }} />
          </Row>
          <Muted>{walk ? "Brisk, flat, 30 minutes. Stop if pain passes 2 out of 10." : "Easy pace: you should be able to talk. Sharp pain means stop and walk."}</Muted>
        </>
      ) : (
        <>
          <Card>
            <Label>{pos >= total ? "Finished" : "Stopped early"}</Label>
            <H2>{mmss(elapsed)} moving</H2>
            {pos < total && !walk ? <Muted>Stopped early, so this one will not count toward the stage.</Muted> : null}
          </Card>
          <Card>
            <Label>Pain during or after</Label>
            <PainScale value={pain} onChange={setPain} />
            {!walk ? (<><Label>Effort</Label><Chips options={EFFORT} value={rpe} onChange={setRpe} />
              <Label>Distance, optional</Label><Row><Field value={km} onChangeText={setKm} placeholder="km" /></Row></>) : null}
          </Card>
          {walk && pain > 1 ? <Banner text="Pain above 1 means the test is not passed yet. Give it another day and retest." /> : null}
          {!walk && pain >= 4 ? <Banner color={T.cherry} text="Pain of 4 or more: this run will not count, and Today will ask you to report it." /> : null}
          <Btn label="Save" icon="checkmark" onPress={save} />
        </>
      )}
    </Sheet>
  );
}
