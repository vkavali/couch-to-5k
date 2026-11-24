import React, { useState } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useT, TYPE, typeColor } from "../ui/theme";
import { Screen, Card, H1, H2, Label, Body, Muted, Btn, Row, Tile, Banner, Stepper, Ladder } from "../ui/kit";
import { fmtDate, weekday, dayNum, areaLabel, eventSummary, LOAD_TEXT, STAGES, totalSecs, buildPhases, mmss } from "../engine";
import { useApp } from "../../App";
import Timer from "./Timer";
import { InjurySheet, CheckinCard, StrengthSheet, RehabCard } from "./Forms";

export default function TodayScreen({ navigation }) {
  const T = useT();
  const { state, today, plan, prog, inj, ret, eta, act } = useApp();
  const day = plan[0];
  const [timer, setTimer] = useState(false);
  const [strength, setStrength] = useState(false);
  const [report, setReport] = useState(false);
  const [startStage, setStartStage] = useState(1);
  const fresh = !state.sessions.length && !state.overrides.length && !inj;
  const lastSess = state.sessions[state.sessions.length - 1];
  const hurt = !inj && lastSess && (lastSess.pain || 0) >= 4 && !(state.injuries || []).some((i) => i.startIso >= lastSess.iso);
  const col = typeColor(T, day.type);
  const meta = TYPE[day.type] || TYPE.rest;

  return (
    <Screen>
      <View style={{ gap: 2 }}>
        <Label>{fmtDate(today)}</Label>
        <H1>{inj ? "Recovery first" : prog.finished5k ? "5K done" : `Stage ${prog.stage} of 12`}</H1>
      </View>

      {inj?.seeDoctor ? <Banner color={T.cherry} icon="medkit" text={inj.seeDoctor} /> : null}
      {hurt ? (
        <Banner color={T.cherry} text={`Your last session logged pain ${lastSess.pain}/10. Put running on hold until it settles.`}>
          <Btn label="Report pain" icon="bandage" color={T.cherry} onPress={() => setReport(true)} />
        </Banner>
      ) : null}
      {!inj && prog.dropped ? (
        <Banner icon="information-circle" color={T.gold} text={prog.dropped.reason === "injury"
          ? `Back from injury: restarting at stage ${prog.dropped.to} (was ${prog.dropped.from}).`
          : `Long break: restarting at stage ${prog.dropped.to} (was ${prog.dropped.from}) so the jump back is safe.`} />
      ) : null}

      {/* Today's session */}
      <Card style={{ padding: 0, overflow: "hidden", gap: 0 }}>
        <View style={{ backgroundColor: col, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Ionicons name={meta.icon} size={22} color={T.dark ? T.bg : "#FFFDF7"} />
          <Text style={{ flex: 1, color: T.dark ? T.bg : "#FFFDF7", fontWeight: "800", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>
            {day.done ? "Done today" : "Today"}</Text>
          {day.type === "run" && !day.done ? <Text style={{ color: T.dark ? T.bg : "#FFFDF7", fontWeight: "800" }}>{mmss(totalSecs(buildPhases(day.stage)))}</Text> : null}
        </View>
        <View style={{ padding: 16, gap: 10 }}>
          <Text style={{ color: T.ink, fontSize: 26, fontWeight: "800", letterSpacing: -0.3 }}>{day.title}</Text>
          {day.detail ? <Body>{day.detail}</Body> : null}
          {day.type === "run" && !day.done ? <Muted>Run {day.runOfStage} of 3 at this stage, plus a 5 min warm-up and cool-down walk.</Muted> : null}
          {day.event ? <Body>{eventSummary(day.event)}. {LOAD_TEXT[day.load.level]}.</Body> : null}
          {day.reason ? (
            <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
              <Ionicons name="information-circle-outline" size={18} color={T.muted} /><Muted style={{ flex: 1 }}>{day.reason}</Muted>
            </View>
          ) : null}
          {day.type === "rest" ? <Muted>Nothing to do. An easy walk is fine if you feel like it.</Muted> : null}
          {day.done ? <Muted>Logged. Next up is on the Plan tab.</Muted> : null}
          {!day.done && (day.type === "run" || day.type === "walkTest") ? <Btn label={day.type === "run" ? "Start run" : "Start walk test"} icon="play" color={col} onPress={() => setTimer(true)} /> : null}
          {!day.done && day.type === "strength" ? <Btn label="Start workout" icon="play" color={T.gold} onPress={() => setStrength(true)} /> : null}
          {(day.type === "match" || day.type === "nets") && !day.done ? <Btn kind="soft" label="Log what you did" icon="create" onPress={() => navigation.navigate("Log")} /> : null}
          {inj?.canClear ? <Btn label="Clear it and start the return" icon="checkmark-circle" onPress={() => act("clearInjury", today)} /> : null}
        </View>
      </Card>

      {inj ? (
        <>
          <Row>
            <Tile label={areaLabel(inj.injury.area)} value={`Day ${inj.day}`} sub={inj.injury.side && inj.injury.side !== "both" ? `${inj.injury.side} side` : "on hold"} color={T.warn} />
            <Tile label="Pain-free" value={`${inj.streak}/3`} sub="in a row" color={inj.canClear ? T.ok : T.ink} />
            <Tile label="Pain" value={inj.latestPain == null ? "–" : `${inj.latestPain}/10`} sub="latest" />
          </Row>
          <CheckinCard />
          <RehabCard items={inj.rehab} doneToday={day.done && day.type === "rehab"} onDone={() => act("addSession", { iso: today, kind: "rehab" })} />
          {inj.early ? <Muted>First two days: walking and heat only. Strength work for the area unlocks on day 3.</Muted> : null}
        </>
      ) : null}

      {fresh ? (
        <Card>
          <Label>Where are you starting?</Label>
          <Muted>New to running: leave it at 1. If you have been running, pick the stage you can finish comfortably today.</Muted>
          <Stepper label={STAGES[startStage].note} value={startStage} onChange={setStartStage} min={1} max={12} />
          {startStage > 1 ? <Btn kind="soft" label={`Start at stage ${startStage}`} onPress={() => act("setStage", today, startStage)} /> : null}
        </Card>
      ) : null}

      {/* Next 7 days: equal columns that fill the row */}
      <Card>
        <Label>Next 7 days</Label>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {plan.slice(0, 7).map((d, i) => {
            const c = typeColor(T, d.type), m = TYPE[d.type] || TYPE.rest;
            return (
              <View key={d.iso} style={{ flex: 1, alignItems: "center", gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: i === 0 ? T.panel2 : "transparent" }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: T.muted }}>{weekday(d.iso).toUpperCase()}</Text>
                <Text style={{ fontSize: 16, fontWeight: "800", color: T.ink }}>{dayNum(d.iso)}</Text>
                <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: d.type === "rest" ? "transparent" : c, borderWidth: d.type === "rest" ? 1.5 : 0, borderColor: T.line }}>
                  <Ionicons name={d.done ? "checkmark" : m.icon} size={16} color={d.type === "rest" ? T.muted : T.dark ? T.bg : "#FFFDF7"} />
                </View>
                <Text style={{ fontSize: 10.5, fontWeight: "700", color: T.muted }}>{m.short}</Text>
              </View>
            );
          })}
        </View>
      </Card>

      {!inj ? (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Label>Stage ladder</Label>
            <Text style={{ marginLeft: "auto", color: T.muted, fontSize: 13, fontWeight: "700" }}>{prog.count}/3 runs at stage {prog.stage}</Text>
          </View>
          <Ladder stage={prog.stage} count={prog.count} />
          {ret ? <Muted>{ret.phase === "walkTest" ? "Return step 1 of 3: pass the walk test." : `Return step ${2 + ret.done} of 3: easy return runs (${ret.done}/2 done).`}</Muted> : null}
        </Card>
      ) : null}

      <Row>
        <Tile label="5K target" value={eta.done ? "Done" : fmtDate(eta.iso).slice(4)} sub={eta.done ? "keep it going" : `about ${eta.weeks} weeks`} />
        <Tile label="Runs left" value={eta.done ? "0" : String(eta.runsLeft)} sub="at 3 a week" />
      </Row>

      {!inj ? <Btn kind="ghost" label="Something hurts" icon="bandage-outline" onPress={() => setReport(true)} /> : null}

      <Timer visible={timer} onClose={() => setTimer(false)} day={day} />
      <StrengthSheet visible={strength} onClose={() => setStrength(false)} day={day} />
      <InjurySheet visible={report} onClose={() => setReport(false)} />
    </Screen>
  );
}
