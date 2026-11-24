// Profile (drives food targets) and the optional account.
import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { useT } from "../ui/theme";
import { Sheet, Card, Btn, Label, Muted, Body, Chips, Stepper, Row, Field, Banner } from "../ui/kit";
import { GOALS, DIETS, latestWeight } from "../engine";
import { appleAvailable, syncConfigured } from "../lib/api";
import { useApp } from "../../App";

const ago = (ms) => { const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? "just now" : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`; };

export default function SettingsSheet({ visible, onClose }) {
  const T = useT();
  const { state, today, act, account, sync, signIn, signOut, remove, syncNow } = useApp();
  const p = state.profile || {};
  const [kg, setKg] = useState("");
  const [apple, setApple] = useState(false);
  const [err, setErr] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => { if (visible) { setKg(""); setErr(null); setConfirmDelete(false); appleAvailable().then(setApple); } }, [visible]);
  const set = (patch) => act("setProfile", patch);
  const w = latestWeight(state);
  const doSignIn = async () => { setErr(null); try { await signIn(); } catch (e) { if (e.code !== "ERR_REQUEST_CANCELED") setErr(e.message || "Sign-in failed"); } };

  return (
    <Sheet visible={visible} onClose={onClose} title="Profile and account">
      <Card>
        <Label>About you</Label>
        <Muted>Used only to work out your food targets. Stays on this phone unless you sign in.</Muted>
        <Chips options={[{ key: "m", label: "Male" }, { key: "f", label: "Female" }]} value={p.sex} onChange={(sex) => set({ sex })} />
        <Stepper label="Age" value={p.age || 30} onChange={(age) => set({ age })} min={18} max={90} />
        <Stepper label="Height" value={p.heightCm || 170} onChange={(heightCm) => set({ heightCm })} min={130} max={220} unit="cm" />
        {!p.age || !p.heightCm ? <Btn kind="soft" label="Use these values" onPress={() => set({ age: p.age || 30, heightCm: p.heightCm || 170 })} /> : null}
        <Label>Weight{w ? `: ${w} kg` : ""}</Label>
        <Row><Field value={kg} onChangeText={setKg} placeholder="kg" /><Btn label={w ? "Update" : "Save"} disabled={!(Number(kg) > 20)} onPress={() => { act("addWeight", today, Number(kg)); setKg(""); }} style={{ flex: 1 }} /></Row>
      </Card>
      <Card>
        <Label>Goal</Label>
        <Chips options={GOALS} value={p.goal || "maintain"} onChange={(goal) => set({ goal })} />
        <Label>Diet</Label>
        <Chips options={DIETS} value={p.diet || "any"} onChange={(diet) => set({ diet })} />
        <Muted>Fat loss runs a deficit of at most 500 kcal a day, never below your resting needs, and pauses on heavy cricket days.</Muted>
      </Card>

      <Card>
        <Label>Account and backup</Label>
        {!syncConfigured() ? <Muted>This build is not connected to a server, so everything stays on this phone.</Muted>
          : account ? (
            <>
              <Body style={{ fontWeight: "700" }}>{account.user?.email || account.user?.name || "Signed in with Apple"}</Body>
              <Muted>{sync.status === "syncing" ? "Syncing…" : sync.status === "error" ? `Sync problem: ${sync.error}` : sync.at ? `Backed up ${ago(sync.at)}` : "Signed in"}</Muted>
              <Row><Btn kind="soft" label="Sync now" icon="sync" onPress={syncNow} style={{ flex: 1 }} /><Btn kind="soft" label="Sign out" onPress={signOut} style={{ flex: 1 }} /></Row>
              {!confirmDelete ? <Btn kind="ghost" label="Delete account and server data" color={T.cherry} onPress={() => setConfirmDelete(true)} />
                : <Banner color={T.cherry} text="This removes your account and everything stored on the server. Data on this phone stays.">
                    <Row><Btn kind="soft" label="Keep it" onPress={() => setConfirmDelete(false)} style={{ flex: 1 }} /><Btn label="Delete" color={T.cherry} onPress={() => remove().catch((e) => setErr(e.message))} style={{ flex: 1 }} /></Row>
                  </Banner>}
            </>
          ) : apple ? (
            <>
              <Muted>Optional. Signing in backs up your log and keeps two devices in step.</Muted>
              <AppleAuthentication.AppleAuthenticationButton buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={T.dark ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={14} style={{ height: 50 }} onPress={doSignIn} />
            </>
          ) : <Muted>Sign in with Apple works in the installed iPhone build, not in Expo Go or the browser preview.</Muted>}
        {sync.error && !account ? <Muted>{sync.error}</Muted> : null}
        {err ? <Banner color={T.cherry} text={err} /> : null}
      </Card>
    </Sheet>
  );
}
