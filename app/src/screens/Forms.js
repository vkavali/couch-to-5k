// Small sheets shared by Today and Log: report an injury, daily check-in, strength, rehab.
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useT } from "../ui/theme";
import { Sheet, Card, Btn, Label, Muted, Body, PainScale, Chips, Toggle, Row } from "../ui/kit";
import { AREAS, EXERCISES, mmss } from "../engine";
import { useApp } from "../../App";

export function InjurySheet({ visible, onClose }) {
  const { act, today } = useApp();
  const [area, setArea] = useState("hip"); const [side, setSide] = useState("left"); const [pain, setPain] = useState(5);
  return (
    <Sheet visible={visible} onClose={onClose} title="Report pain">
      <Card>
        <Label>Where</Label>
        <Chips options={AREAS.slice(0, 3)} value={area} onChange={setArea} />
        <Chips options={AREAS.slice(3)} value={area} onChange={setArea} />
        <Label>Side</Label>
        <Chips options={[{ key: "left", label: "Left" }, { key: "right", label: "Right" }, { key: "both", label: "Both" }]} value={side} onChange={setSide} />
        <Label>Pain right now</Label>
        <PainScale value={pain} onChange={setPain} />
      </Card>
      <Muted>Running goes on hold. It comes back after 3 pain-free days in a row, a 30 minute walk test, and two easy return runs. This is a training rule, not a diagnosis.</Muted>
      <Btn label="Put running on hold" icon="bandage" onPress={() => { act("reportInjury", { area, side, startIso: today, pain }); onClose(); }} />
    </Sheet>
  );
}

export function CheckinCard({ compact }) {
  const T = useT();
  const { act, today, inj, state } = useApp();
  const existing = state.checkins.find((c) => c.iso === today);
  const [pain, setPain] = useState(existing ? existing.pain : null);
  const [bendOk, setBendOk] = useState(existing ? existing.bendOk : false);
  useEffect(() => { setPain(existing ? existing.pain : null); setBendOk(existing ? existing.bendOk : false); }, [today, existing?.pain, existing?.bendOk]);
  if (!inj) return null;
  const dirty = pain != null && (!existing || existing.pain !== pain || existing.bendOk !== bendOk);
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Label>{inj.checkedInToday ? "Today's check-in saved" : "Daily check-in"}</Label>
        <Text style={{ marginLeft: "auto", color: T.muted, fontSize: 13, fontWeight: "700" }}>Pain-free days {inj.streak}/3</Text>
      </View>
      <PainScale value={pain} onChange={setPain} />
      <Row><Toggle label="Bends and moves freely" value={bendOk} onChange={setBendOk} /></Row>
      {dirty ? <Btn label={existing ? "Update check-in" : "Save check-in"} onPress={() => act("checkin", { iso: today, pain, bendOk })} /> : null}
      {!compact ? <Muted>A pain-free day is pain 0 or 1 with free movement.</Muted> : null}
    </Card>
  );
}

function CheckList({ items, done, setDone }) {
  const T = useT();
  return items.map(([name, how], i) => (
    <TouchableOpacity key={name} onPress={() => setDone({ ...done, [i]: !done[i] })} accessibilityRole="checkbox" accessibilityState={{ checked: !!done[i] }}
      style={{ flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: T.line }}>
      <Ionicons name={done[i] ? "checkmark-circle" : "ellipse-outline"} size={26} color={done[i] ? T.pitch : T.muted} />
      <View style={{ flex: 1 }}><Body style={{ fontWeight: "700" }}>{name}</Body><Muted>{how}</Muted></View>
    </TouchableOpacity>
  ));
}

export function StrengthSheet({ visible, onClose, day }) {
  const T = useT();
  const { act, today } = useApp();
  const light = !!day?.light;
  const list = EXERCISES.filter((e) => !light || e[2] !== "legs");
  const [round, setRound] = useState(1); const [done, setDone] = useState({}); const [rest, setRest] = useState(0);
  useEffect(() => { if (visible) { setRound(1); setDone({}); setRest(0); } }, [visible]);
  useEffect(() => { if (rest <= 0) return; const id = setTimeout(() => setRest((r) => r - 1), 1000); return () => clearTimeout(id); }, [rest]);
  const all = list.every((_, i) => done[i]);
  const next = () => {
    if (round >= 3) { act("addSession", { iso: today, kind: "strength", light }); onClose(); }
    else { setRound(round + 1); setDone({}); setRest(60); }
  };
  return (
    <Sheet visible={visible} onClose={onClose} title={light ? "Strength, light" : "Strength"}>
      <Row>
        {[1, 2, 3].map((n) => (
          <View key={n} style={{ flex: 1, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: n < round ? T.pitch : n === round ? T.gold : T.panel2 }}>
            <Text style={{ fontWeight: "800", color: n <= round ? "#FFFDF7" : T.muted }}>Round {n}</Text>
          </View>
        ))}
      </Row>
      {light ? <Muted>Legs are left out today: upper body and core only.</Muted> : null}
      {rest > 0 ? <Card><Label>Rest</Label><Text style={{ color: T.ink, fontSize: 44, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{mmss(rest)}</Text><Btn kind="soft" label="Skip rest" onPress={() => setRest(0)} /></Card> : null}
      <Card><CheckList items={list} done={done} setDone={setDone} /></Card>
      <Btn label={round >= 3 ? "Finish workout" : `Finish round ${round}`} onPress={next} disabled={!all} color={T.gold} />
    </Sheet>
  );
}

export function RehabCard({ items, onDone, doneToday }) {
  const [done, setDone] = useState({});
  if (!items) return null;
  return (
    <Card>
      <Label>Today's recovery work</Label>
      <CheckList items={items} done={doneToday ? Object.fromEntries(items.map((_, i) => [i, true])) : done} setDone={setDone} />
      {!doneToday ? <Btn kind="soft" label="Mark done" icon="checkmark" disabled={!items.every((_, i) => done[i])} onPress={onDone} /> : null}
    </Card>
  );
}
