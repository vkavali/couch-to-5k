import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useT } from "../ui/theme";
import { Screen, Card, H1, Label, Muted, Body, Btn, Chips, Toggle, Stepper, Row, Field } from "../ui/kit";
import { addDays, weekday, dayNum, fmtDate, eventLoad, eventSummary, LOAD_TEXT, areaLabel } from "../engine";
import { useApp } from "../../App";
import { InjurySheet, CheckinCard } from "./Forms";

export default function LogScreen() {
  const T = useT();
  const { state, today, act, inj } = useApp();
  const [tab, setTab] = useState("cricket");
  const [kind, setKind] = useState("match");
  const [when, setWhen] = useState("played");
  const [iso, setIso] = useState(today);
  const [bowlOvers, setBowl] = useState(0);
  const [batted, setBatted] = useState(false); const [fielded, setFielded] = useState(true); const [kept, setKept] = useState(false);
  const [minutes, setMinutes] = useState(60);
  const [kg, setKg] = useState("");
  const [report, setReport] = useState(false);

  const dates = when === "played" ? Array.from({ length: 8 }, (_, i) => addDays(today, -i)) : Array.from({ length: 14 }, (_, i) => addDays(today, i + 1));
  const pickWhen = (w) => { setWhen(w); setIso(w === "played" ? today : addDays(today, 1)); };
  const ev = { iso, kind, bowlOvers, played: when === "played", ...(kind === "nets" ? { minutes } : { batted, fielded, kept }) };
  const load = eventLoad(ev);
  const loadCol = { high: T.cherry, medium: T.gold, low: T.pitch }[load.level];
  const events = [...state.events].sort((a, b) => (a.iso < b.iso ? 1 : -1));
  const past = (state.injuries || []).filter((i) => i.clearedIso);

  return (
    <Screen>
      <View style={{ gap: 2 }}><Label>Feeds the plan</Label><H1>Log</H1></View>
      <Chips options={[{ key: "cricket", label: "Cricket" }, { key: "body", label: "Body" }]} value={tab} onChange={setTab} />

      {tab === "cricket" ? (
        <>
          <Card>
            <Chips options={[{ key: "match", label: "Match" }, { key: "nets", label: "Nets" }]} value={kind} onChange={setKind} />
            <Chips options={[{ key: "played", label: "Played" }, { key: "upcoming", label: "Not yet" }]} value={when} onChange={pickWhen} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {dates.map((d) => (
                <TouchableOpacity key={d} onPress={() => setIso(d)} accessibilityLabel={fmtDate(d)}
                  style={{ width: 52, paddingVertical: 8, borderRadius: 12, alignItems: "center", backgroundColor: iso === d ? T.pitch : T.panel2 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: iso === d ? T.onPitch : T.muted }}>{d === today ? "TODAY" : weekday(d).toUpperCase()}</Text>
                  <Text style={{ fontSize: 17, fontWeight: "800", color: iso === d ? T.onPitch : T.ink }}>{dayNum(d)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Stepper label={when === "played" ? "Overs bowled" : "Overs you expect to bowl"} value={bowlOvers} onChange={setBowl} max={20} />
            {kind === "nets" ? <Stepper label="Session length" value={minutes} onChange={setMinutes} step={15} min={15} max={240} unit="min" />
              : <Row><Toggle label="Batted" value={batted} onChange={setBatted} /><Toggle label="Fielded" value={fielded} onChange={setFielded} /><Toggle label="Kept" value={kept} onChange={setKept} /></Row>}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, backgroundColor: T.panel2 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: loadCol }} />
              <Body style={{ flex: 1, fontWeight: "700" }}>{LOAD_TEXT[load.level]}</Body>
            </View>
            <Btn label={`Save ${kind} on ${fmtDate(iso)}`} icon="checkmark" onPress={() => act("saveEvent", ev)} />
          </Card>
          <Card style={{ gap: 0 }}>
            <Label>Cricket days</Label>
            {!events.length ? <Muted style={{ paddingTop: 8 }}>None yet. Add matches and nets so runs are planned around them.</Muted> : null}
            {events.slice(0, 12).map((e, i) => {
              const l = eventLoad(e);
              return (
                <View key={e.iso} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: T.line, marginTop: i ? 0 : 8 }}>
                  <View style={{ flex: 1 }}>
                    <Body style={{ fontWeight: "700" }}>{fmtDate(e.iso)} · {e.kind === "nets" ? "Nets" : "Match"}{e.iso > today ? " (upcoming)" : ""}</Body>
                    <Muted>{eventSummary(e)}, {l.level} load</Muted>
                  </View>
                  <TouchableOpacity onPress={() => act("removeEvent", e.iso)} accessibilityLabel={`Delete ${fmtDate(e.iso)}`} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="trash-outline" size={19} color={T.muted} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </Card>
        </>
      ) : (
        <>
          {inj ? (
            <>
              <Card>
                <Label>On hold</Label>
                <Body style={{ fontWeight: "700" }}>{areaLabel(inj.injury.area)}{inj.injury.side && inj.injury.side !== "both" ? `, ${inj.injury.side}` : ""} · day {inj.day}</Body>
                <Muted>Since {fmtDate(inj.injury.startIso)}. Clears after 3 pain-free check-ins in a row.</Muted>
                {inj.canClear ? <Btn label="Clear it and start the return" onPress={() => act("clearInjury", today)} /> : null}
              </Card>
              <CheckinCard compact />
            </>
          ) : (
            <Card>
              <Label>Pain or injury</Label>
              <Muted>Report pain as soon as it shows up. The plan holds running and builds the way back.</Muted>
              <Btn kind="soft" label="Something hurts" icon="bandage-outline" onPress={() => setReport(true)} />
            </Card>
          )}
          {past.length ? (
            <Card style={{ gap: 4 }}>
              <Label>Past holds</Label>
              {past.map((i) => <Muted key={i.id}>{areaLabel(i.area)}: {fmtDate(i.startIso)} to {fmtDate(i.clearedIso)}</Muted>)}
            </Card>
          ) : null}
          <Card>
            <Label>Body weight</Label>
            <Row><Field value={kg} onChangeText={setKg} placeholder="kg" /><Btn label="Save" disabled={!(Number(kg) > 0)} onPress={() => { act("addWeight", today, Number(kg)); setKg(""); }} style={{ flex: 1 }} /></Row>
            {state.weights.slice(-3).reverse().map((w) => <Muted key={w.iso}>{fmtDate(w.iso)}: {w.kg} kg</Muted>)}
          </Card>
        </>
      )}
      <InjurySheet visible={report} onClose={() => setReport(false)} />
    </Screen>
  );
}
