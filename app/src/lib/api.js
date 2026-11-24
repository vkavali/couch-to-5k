// Optional account + sync against the Railway server. The app works fully without it.
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as AppleAuthentication from "expo-apple-authentication";

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "");
const TOKEN_KEY = "c25k.session";
const USER_KEY = "c25k.user";
const native = Platform.OS !== "web";

export const syncConfigured = () => !!API_URL;
export const appleAvailable = async () => Platform.OS === "ios" && syncConfigured() && (await AppleAuthentication.isAvailableAsync().catch(() => false));

export async function loadAccount() {
  if (!native) return null;
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    const user = JSON.parse((await SecureStore.getItemAsync(USER_KEY)) || "null");
    return token ? { token, user } : null;
  } catch { return null; }
}
async function call(path, { token, method = "GET", body } = {}) {
  const r = await fetch(`${API_URL}${path}`, { method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(json.error || `Server error ${r.status}`); e.status = r.status; throw e; }
  return json;
}
export async function signInWithApple() {
  const cred = await AppleAuthentication.signInAsync({ requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL] });
  const name = [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(" ") || undefined;
  const { token, user } = await call("/auth/apple", { method: "POST", body: { identityToken: cred.identityToken, name } });
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user || {}));
  return { token, user };
}
export async function signOut() {
  if (!native) return;
  await SecureStore.deleteItemAsync(TOKEN_KEY); await SecureStore.deleteItemAsync(USER_KEY);
}
export const pullState = (token) => call("/v2/state", { token }); // { state | null, updatedAt }
export const pushState = (token, state) => call("/v2/state", { token, method: "PUT", body: { state } });
export async function deleteAccount(token) { await call("/me", { token, method: "DELETE" }); await signOut(); }
