import React from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView, TextInput, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useT, S } from "./theme";

export const Screen = ({ children }) => {
  const T = useT();
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView contentContainerStyle={{ padding: S.pad, paddingBottom: 40, gap: S.gap, width: "100%", maxWidth: 560, alignSelf: "center" }}
        keyboardShouldPersistTaps="handled">{children}</ScrollView>
    </SafeAreaView>
  );
};
export const Card = ({ children, style, tone }) => {
  const T = useT();
  return <View style={[{ backgroundColor: tone || T.panel, borderRadius: S.r, padding: S.pad, borderWidth: 1, borderColor: T.line, gap: 10 }, style]}>{children}</View>;
};
export const H1 = ({ children }) => { const T = useT(); return <Text style={{ color: T.ink, fontSize: 30, fontWeight: "800", letterSpacing: -0.5 }}>{children}</Text>; };
export const H2 = ({ children, color }) => { const T = useT(); return <Text style={{ color: color || T.ink, fontSize: 19, fontWeight: "800" }}>{children}</Text>; };
export const Label = ({ children, color }) => { const T = useT(); return <Text style={{ color: color || T.muted, fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" }}>{children}</Text>; };
export const Body = ({ children, color, style }) => { const T = useT(); return <Text style={[{ color: color || T.ink, fontSize: 15, lineHeight: 21 }, style]}>{children}</Text>; };
export const Muted = ({ children, style }) => { const T = useT(); return <Text style={[{ color: T.muted, fontSize: 13.5, lineHeight: 19 }, style]}>{children}</Text>; };

export function Btn({ label, onPress, kind = "primary", icon, color, disabled, style }) {
  const T = useT();
  const bg = kind === "primary" ? color || T.pitch : kind === "soft" ? T.panel2 : "transparent";
  const fg = kind === "primary" ? (color && color !== T.pitch ? "#FFFDF7" : T.onPitch) : color || T.ink;
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label}
      style={[{ minHeight: 50, borderRadius: 14, backgroundColor: bg, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        paddingHorizontal: 16, opacity: disabled ? 0.4 : 1, borderWidth: kind === "ghost" ? 1 : 0, borderColor: T.line }, style]}>
      {icon ? <Ionicons name={icon} size={19} color={fg} /> : null}
      <Text style={{ color: fg, fontSize: 16, fontWeight: "800" }}>{label}</Text>
    </TouchableOpacity>
  );
}
// Equal-width chips that always fill their row.
export function Chips({ options, value, onChange, color }) {
  const T = useT();
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {options.map((o) => {
        const k = o.key ?? o, on = value === k;
        return (
          <TouchableOpacity key={String(k)} onPress={() => onChange(k)} accessibilityRole="button" accessibilityState={{ selected: on }}
            style={{ flex: 1, minHeight: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
              backgroundColor: on ? color || T.pitch : T.panel2 }}>
            <Text numberOfLines={1} style={{ color: on ? (color ? "#FFFDF7" : T.onPitch) : T.ink, fontWeight: "700", fontSize: 14 }}>{o.label ?? String(o)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
export function Toggle({ label, value, onChange }) {
  const T = useT();
  return (
    <TouchableOpacity onPress={() => onChange(!value)} accessibilityRole="checkbox" accessibilityState={{ checked: !!value }}
      style={{ flex: 1, minHeight: 44, borderRadius: 12, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center",
        backgroundColor: value ? T.pitch : T.panel2 }}>
      <Ionicons name={value ? "checkmark-circle" : "ellipse-outline"} size={17} color={value ? T.onPitch : T.muted} />
      <Text style={{ color: value ? T.onPitch : T.ink, fontWeight: "700", fontSize: 14 }}>{label}</Text>
    </TouchableOpacity>
  );
}
export function Stepper({ label, value, onChange, step = 1, min = 0, max = 99, unit }) {
  const T = useT();
  const B = ({ d, icon }) => (
    <TouchableOpacity onPress={() => onChange(Math.min(max, Math.max(min, value + d)))} accessibilityLabel={`${label} ${d > 0 ? "more" : "less"}`}
      style={{ width: 48, height: 44, borderRadius: 12, backgroundColor: T.panel2, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={icon} size={20} color={T.ink} />
    </TouchableOpacity>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Text style={{ flex: 1, color: T.ink, fontSize: 15, fontWeight: "600" }}>{label}</Text>
      <B d={-step} icon="remove" />
      <Text style={{ minWidth: 64, textAlign: "center", color: T.ink, fontSize: 18, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{value}{unit ? ` ${unit}` : ""}</Text>
      <B d={step} icon="add" />
    </View>
  );
}
// 0 to 10 pain scale, one tap.
export function PainScale({ value, onChange }) {
  const T = useT();
  const col = (n) => (n <= 1 ? T.ok : n <= 3 ? T.gold : n <= 6 ? T.warn : T.cherry);
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {Array.from({ length: 11 }, (_, n) => (
          <TouchableOpacity key={n} onPress={() => onChange(n)} accessibilityLabel={`Pain ${n} of 10`}
            style={{ flex: 1, height: 44, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: value === n ? col(n) : T.panel2 }}>
            <Text style={{ color: value === n ? "#FFFDF7" : T.ink, fontWeight: "800", fontSize: 14 }}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Muted>No pain</Muted><Muted>Worst</Muted></View>
    </View>
  );
}
export function Tile({ label, value, sub, color }) {
  const T = useT();
  return (
    <View style={{ flex: 1, backgroundColor: T.panel, borderRadius: S.r, borderWidth: 1, borderColor: T.line, padding: 14, gap: 2 }}>
      <Label>{label}</Label>
      <Text style={{ color: color || T.ink, fontSize: 26, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{value}</Text>
      {sub ? <Muted>{sub}</Muted> : null}
    </View>
  );
}
export const Row = ({ children, style }) => <View style={[{ flexDirection: "row", gap: S.gap }, style]}>{children}</View>;
export function Banner({ icon = "alert-circle", text, color, children }) {
  const T = useT(); const c = color || T.warn;
  return (
    <View style={{ borderRadius: S.r, padding: 14, gap: 10, backgroundColor: T.panel, borderWidth: 1.5, borderColor: c }}>
      <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
        <Ionicons name={icon} size={20} color={c} />
        <Text style={{ flex: 1, color: T.ink, fontSize: 14.5, lineHeight: 20, fontWeight: "600" }}>{text}</Text>
      </View>
      {children}
    </View>
  );
}
export function Field({ value, onChangeText, placeholder, keyboardType = "decimal-pad", style }) {
  const T = useT();
  return <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={T.muted} keyboardType={keyboardType}
    style={[{ flex: 1, minWidth: 0, minHeight: 48, borderRadius: 12, backgroundColor: T.panel2, color: T.ink, paddingHorizontal: 14, fontSize: 16 }, style]} />;
}
export function Sheet({ visible, title, onClose, children }) {
  const T = useT();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle={Platform.OS === "ios" ? "pageSheet" : undefined}>
      <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: S.pad, paddingVertical: 12, width: "100%", maxWidth: 560, alignSelf: "center" }}>
          <Text style={{ flex: 1, color: T.ink, fontSize: 20, fontWeight: "800" }}>{title}</Text>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: T.panel2, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="close" size={22} color={T.ink} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: S.pad, paddingTop: 4, paddingBottom: 40, gap: S.gap, width: "100%", maxWidth: 560, alignSelf: "center" }} keyboardShouldPersistTaps="handled">
          {visible ? children : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
// 12-segment stage ladder that fills the row.
export function Ladder({ stage, count, perStage = 3 }) {
  const T = useT();
  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {Array.from({ length: 12 }, (_, i) => {
        const n = i + 1, full = n < stage, cur = n === stage;
        return (
          <View key={n} style={{ flex: 1, gap: 4, alignItems: "center" }}>
            <View style={{ alignSelf: "stretch", height: 10, borderRadius: 5, backgroundColor: T.panel2, overflow: "hidden" }}>
              <View style={{ height: 10, width: full ? "100%" : cur ? `${(count / perStage) * 100}%` : "0%", backgroundColor: T.pitch }} />
            </View>
            <Text style={{ fontSize: 11, fontWeight: cur ? "800" : "500", color: cur ? T.ink : T.muted }}>{n}</Text>
          </View>
        );
      })}
    </View>
  );
}
