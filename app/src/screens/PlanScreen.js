import React, { useState } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useT, TYPE, typeColor } from "../ui/theme";
import { Screen, Card, H1, Label, Muted, Btn, Stepper, Ladder, Row, Tile } from "../ui/kit";
import { weekday, dayNum, fmtDate, STAGES, eventSummary } from "../engine";
import { useApp } from "../../App";

const WEEK_NAMES = ["This week", "Next week", "In two weeks"];

export default function PlanScreen() {
  const T = useT();
  const { plan, prog, inj, eta, act, today } = useApp();
  const [pick, setPick] = useState(null);
  const stage = pick ?? prog.stage;
  const weeks = [plan.slice(0, 7), plan.slice(7, 14), plan.slice(14, 21)];
  const runs = plan.filter((d) => d.type === "run").length;

  return (
    <Screen>
      <View style={{ gap: 2 }}><Label>Next 3 weeks</Label><H1>Plan</H1></View>
      <Muted>Rebuilt every day from your log. Days after today are a projection: they move when you log a match, miss a run, or report pain.</Muted>
      <Row>
        <Tile label="Runs planned" value={String(runs)} sub="next 21 days" />
        <Tile label="5K target" value={eta.done ? "Done" : fmtDate(eta.iso).slice(4)} sub={eta.done ? "" : `${eta.runsLeft} runs left`} />
      </Row>

      {weeks.map((wk, w) => (
        <Card key={w} style={{ gap: 0, paddingVertical: 8 }}>
          <View style={{ paddingVertical: 8 }}><Label>{WEEK_NAMES[w]}</Label></View>
          {wk.map((d, i) => {
            const c = typeColor(T, d.type), m = TYPE[d.type] || TYPE.rest;
            return (
              <View key={d.iso} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopWidth: 1, borderColor: T.line }}>
                <View style={{ width: 38, alignItems: "center" }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: T.muted }}>{weekday(d.iso).toUpperCase()}</Text>
                  <Text style={{ fontSize: 18, fontWeight: "800", color: T.ink }}>{dayNum(d.iso)}</Text>
                </View>
                <View style={{ width: 4, alignSelf: "stretch", borderRadius: 2, backgroundColor: d.type === "rest" ? T.line : c }} />
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={{ color: d.type === "rest" ? T.muted : T.ink, fontSize: 15.5, fontWeight: "700" }}>{d.title}{w === 0 && i === 0 ? " · today" : ""}</Text>
                  {d.event ? <Muted>{eventSummary(d.event)}, {d.load.level} load</Muted> : d.detail ? <Muted>{d.detail}</Muted> : null}
                  {d.reason ? <Muted>{d.reason}</Muted> : null}
                </View>
                <Ionicons name={d.done ? "checkmark-circle" : m.icon} size={20} color={d.done ? T.ok : d.type === "rest" ? T.muted : c} />
              </View>
            );
          })}
        </Card>
      ))}

      <Card>
        <Label>Stage ladder</Label>
        <Ladder stage={prog.stage} count={prog.count} />
        <Muted>Three good runs finish a stage. A run with pain of 4 or more, or one stopped early, does not count. Ten days off drops one stage, three weeks drops two.</Muted>
      </Card>

      <Card>
        <Label>Set my stage</Label>
        <Stepper label={STAGES[stage].note} value={stage} onChange={setPick} min={1} max={12} />
        {pick != null && pick !== prog.stage ? <Btn kind="soft" label={`Move to stage ${pick}`} onPress={() => { act("setStage", today, pick); setPick(null); }} /> : null}
        {inj ? <Muted>Running is on hold, so a new stage applies after the return.</Muted> : null}
      </Card>
    </Screen>
  );
}
