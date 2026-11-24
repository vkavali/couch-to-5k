import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useT } from "../ui/theme";
import { Screen, Card, H1, Label, Muted, Body, Btn, Chips, Row, Field, Stepper, Banner, Sheet } from "../ui/kit";
import { fmtDate, SLOTS, sumFoods, foodsOn, recommendMeals, searchFoods, entryFromFood, profileReady } from "../engine";
import { lookupBarcode } from "../lib/off";
import { useApp } from "../../App";

const slotNow = () => { const h = new Date().getHours(); return h < 11 ? "breakfast" : h < 15 ? "lunch" : h < 18 ? "snack" : "dinner"; };
const g = (n) => Math.round(n);

function Bar({ label, value, target, unit = "g", color }) {
  const T = useT();
  const pct = target ? Math.min(1, value / target) : 0;
  return (
    <View style={{ flex: 1, gap: 5 }}>
      <Label>{label}</Label>
      <Text style={{ color: T.ink, fontSize: 17, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{g(value)}<Text style={{ color: T.muted, fontSize: 13, fontWeight: "600" }}> / {target}{unit}</Text></Text>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: T.panel2, overflow: "hidden" }}><View style={{ height: 8, width: `${pct * 100}%`, backgroundColor: color || T.pitch }} /></View>
    </View>
  );
}

function ScanSheet({ visible, onClose, onFood }) {
  const T = useT();
  const [perm, ask] = useCameraPermissions();
  const [code, setCode] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState(null);
  const find = async (c) => {
    if (busy) return; setBusy(true); setErr(null);
    try { onFood(await lookupBarcode(c)); setCode(""); onClose(); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Scan a barcode">
      {perm?.granted ? (
        <View style={{ height: 260, borderRadius: 18, overflow: "hidden", backgroundColor: "#000" }}>
          <CameraView style={{ flex: 1 }} barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }} onBarcodeScanned={busy ? undefined : ({ data }) => find(data)} />
        </View>
      ) : <Btn kind="soft" label="Allow camera" icon="camera" onPress={ask} />}
      <Card>
        <Label>Or type the number</Label>
        <Row><Field value={code} onChangeText={setCode} placeholder="Barcode digits" keyboardType="number-pad" /><Btn label={busy ? "Looking…" : "Look up"} disabled={busy || code.length < 8} onPress={() => find(code)} style={{ flex: 1 }} /></Row>
      </Card>
      {err ? <Banner color={T.cherry} text={err} /> : null}
      <Muted>Looked up in Open Food Facts, a public database. Check the numbers against the pack before you rely on them.</Muted>
    </Sheet>
  );
}

export default function FoodScreen() {
  const T = useT();
  const { state, today, plan, targets: t, act, openSettings } = useApp();
  const day = plan[0];
  const eaten = foodsOn(state, today);
  const tot = sumFoods(eaten);
  const meals = recommendMeals(state, today, day, t);
  const [q, setQ] = useState(""); const [slot, setSlot] = useState(slotNow());
  const [pick, setPick] = useState(null); const [qty, setQty] = useState(1);
  const [custom, setCustom] = useState(false); const [cn, setCn] = useState(""); const [ck, setCk] = useState(""); const [cp, setCp] = useState("");
  const [scan, setScan] = useState(false);
  const log = (entry, s = slot) => act("addFood", { iso: today, slot: s, ...entry });
  const results = q.trim() ? searchFoods(q).slice(0, 6) : [];
  const left = t ? t.kcal - tot.kcal : 0;

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        <View style={{ flex: 1, gap: 2 }}><Label>{fmtDate(today)} · {day.title}</Label><H1>Food</H1></View>
        <TouchableOpacity onPress={openSettings} accessibilityLabel="Profile and account" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: T.panel2, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="person" size={20} color={T.ink} />
        </TouchableOpacity>
      </View>

      {!profileReady(state) ? (
        <Card>
          <Label>Set up your targets</Label>
          <Muted>Add sex, age, height and weight once. Targets then follow each day's training: more on run and match days, a small deficit on quiet days if fat loss is the goal.</Muted>
          <Btn label="Add profile" icon="person" onPress={openSettings} />
        </Card>
      ) : (
        <>
          <Card>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
              <Text style={{ color: T.ink, fontSize: 40, fontWeight: "800", letterSpacing: -1, fontVariant: ["tabular-nums"] }}>{g(tot.kcal)}</Text>
              <Text style={{ color: T.muted, fontSize: 16, fontWeight: "700", paddingBottom: 7 }}>of {t.kcal} kcal</Text>
              <Text style={{ marginLeft: "auto", color: left >= 0 ? T.pitch : T.cherry, fontSize: 15, fontWeight: "800", paddingBottom: 7 }}>{left >= 0 ? `${g(left)} left` : `${g(-left)} over`}</Text>
            </View>
            <View style={{ height: 12, borderRadius: 6, backgroundColor: T.panel2, overflow: "hidden" }}><View style={{ height: 12, width: `${Math.min(1, tot.kcal / t.kcal) * 100}%`, backgroundColor: left >= 0 ? T.pitch : T.cherry }} /></View>
            <Row><Bar label="Protein" value={tot.p} target={t.protein} color={T.cherry} /><Bar label="Carbs" value={tot.c} target={t.carbs} color={T.gold} /><Bar label="Fat" value={tot.f} target={t.fat} color={T.willow} /></Row>
            <Muted>Resting {t.bmr} · day total {t.tdee}{t.exercise ? ` (training +${t.exercise})` : ""}{t.adj ? ` · goal ${t.adj > 0 ? "+" : ""}${t.adj}` : ""} · water {t.water} L</Muted>
            {t.note ? <Muted style={{ color: T.gold, fontWeight: "700" }}>{t.note}</Muted> : null}
          </Card>

          <Label>Recommended today</Label>
          {meals.map((m) => {
            const logged = eaten.filter((e) => e.slot === m.slot);
            return (
              <Card key={m.slot}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Label>{m.label}</Label>
                  <Text style={{ marginLeft: "auto", color: T.muted, fontSize: 13, fontWeight: "700" }}>{logged.length ? `${g(sumFoods(logged).kcal)} kcal logged` : `${g(m.total.kcal)} kcal · ${g(m.total.p)} g protein`}</Text>
                </View>
                {logged.length ? logged.map((e) => (
                  <View key={e.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Ionicons name="checkmark-circle" size={18} color={T.pitch} />
                    <Body style={{ flex: 1 }}>{e.qty && e.qty !== 1 ? `${e.qty} × ` : ""}{e.name}</Body>
                    <Muted>{e.kcal} kcal</Muted>
                    <TouchableOpacity onPress={() => act("removeFood", e.id)} accessibilityLabel={`Remove ${e.name}`} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}><Ionicons name="close" size={18} color={T.muted} /></TouchableOpacity>
                  </View>
                )) : (
                  <>
                    <Text style={{ color: T.ink, fontSize: 18, fontWeight: "800" }}>{m.name}</Text>
                    {m.items.map((i) => <Muted key={i.foodId}>{i.qty} × {i.name} ({i.serving})</Muted>)}
                    {m.tip ? <View style={{ flexDirection: "row", gap: 8 }}><Ionicons name="time-outline" size={17} color={T.gold} /><Muted style={{ flex: 1 }}>{m.tip}</Muted></View> : null}
                    <Row><Btn label="Ate this" icon="checkmark" onPress={() => m.items.forEach((i) => log(i, m.slot))} style={{ flex: 2 }} /><Btn kind="soft" label="Swap" icon="shuffle" onPress={() => act("swapMeal", today, m.slot)} style={{ flex: 1 }} /></Row>
                  </>
                )}
              </Card>
            );
          })}
        </>
      )}

      <Card>
        <Label>Add something else</Label>
        <Chips options={SLOTS.map((s) => ({ key: s.key, label: s.label }))} value={slot} onChange={setSlot} />
        <Row><Field value={q} onChangeText={(v) => { setQ(v); setPick(null); }} placeholder="Search foods" keyboardType="default" /></Row>
        {results.map((f) => (
          <TouchableOpacity key={f.id} onPress={() => { setPick(f); setQty(1); setQ(""); }} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8, borderTopWidth: 1, borderColor: T.line }}>
            <View style={{ flex: 1 }}><Body style={{ fontWeight: "700" }}>{f.name}</Body><Muted>{f.serving} · {f.kcal} kcal · {f.p} g protein</Muted></View>
            <Ionicons name="add-circle" size={24} color={T.pitch} />
          </TouchableOpacity>
        ))}
        {q.trim() && !results.length ? <Muted>Not in the built-in list. Scan the pack or add it as a custom food.</Muted> : null}
        {pick ? (
          <View style={{ gap: 10, padding: 12, borderRadius: 12, backgroundColor: T.panel2 }}>
            <Body style={{ fontWeight: "700" }}>{pick.name}</Body>
            <Stepper label={`Servings of ${pick.serving}`} value={qty} onChange={setQty} step={0.5} min={0.5} max={10} />
            <Btn label={`Add ${Math.round(pick.kcal * qty)} kcal`} onPress={() => { log(entryFromFood(pick, qty)); setPick(null); }} />
          </View>
        ) : null}
        <Row>
          <Btn kind="soft" label="Scan barcode" icon="barcode" onPress={() => setScan(true)} style={{ flex: 1 }} />
          <Btn kind="soft" label="Custom" icon="create" onPress={() => setCustom(!custom)} style={{ flex: 1 }} />
        </Row>
        {custom ? (
          <View style={{ gap: 10 }}>
            <Row><Field value={cn} onChangeText={setCn} placeholder="Name" keyboardType="default" /></Row>
            <Row><Field value={ck} onChangeText={setCk} placeholder="kcal" /><Field value={cp} onChangeText={setCp} placeholder="protein g" /></Row>
            <Btn label="Add custom food" disabled={!cn.trim() || !(Number(ck) > 0)} onPress={() => { log({ name: cn.trim(), qty: 1, kcal: Math.round(Number(ck)), p: Number(cp) || 0, c: 0, f: 0 }); setCn(""); setCk(""); setCp(""); setCustom(false); }} />
          </View>
        ) : null}
      </Card>

      {eaten.length ? (
        <Card style={{ gap: 0 }}>
          <Label>Logged today</Label>
          {eaten.map((e, i) => (
            <View key={e.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderColor: T.line, marginTop: i ? 0 : 8 }}>
              <View style={{ flex: 1 }}><Body style={{ fontWeight: "700" }}>{e.qty && e.qty !== 1 ? `${e.qty} × ` : ""}{e.name}</Body><Muted>{e.slot} · {e.kcal} kcal · {g(e.p)} g protein</Muted></View>
              <TouchableOpacity onPress={() => act("removeFood", e.id)} accessibilityLabel={`Remove ${e.name}`} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}><Ionicons name="trash-outline" size={19} color={T.muted} /></TouchableOpacity>
            </View>
          ))}
        </Card>
      ) : null}
      <Muted>Food values are rounded averages and targets are estimates from standard formulas. They are a guide for a healthy adult, not medical advice.</Muted>
      <ScanSheet visible={scan} onClose={() => setScan(false)} onFood={(f) => { setPick(f); setQty(1); }} />
    </Screen>
  );
}
