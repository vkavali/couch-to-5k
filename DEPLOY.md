# Deploying Couch → 5K

Two independent tracks. They do **not** depend on each other.

| Piece | Where it ships | Why |
|-------|----------------|-----|
| `app/` (Expo React Native) | **App Store + Play Store** via EAS | It's a native mobile app. It does **not** go on Railway. |
| `server/` (Express) | **Railway** | It's a web server. This is the only Railway-deployable piece. |

> Reality check on the server: it's a Garmin Health API **skeleton**. It boots, serves a
> status page + `/health`, and the Garmin OAuth routes return an honest `501` until you
> have a Garmin Developer Program (Health API) approval and real keys. Deploying it now
> gives you a live, healthy URL with no Garmin functionality yet — that's expected.

---

## Prerequisites (your accounts — I can't log in as you)

- A **GitHub** account (the repo has no remote yet).
- A **Railway** account → https://railway.app
- An **Expo** account → https://expo.dev (free)
- **Apple Developer** account ($99/yr) — you have this.
- **Google Play Developer** account ($25 one-time) — you have this.

---

## 0. Push the repo to GitHub (needed for the Railway path)

```bash
cd couch-to-5k
git add .
git commit -m "Prep: Railway-ready server, EAS-ready app, icons + deploy guide"
# create an EMPTY repo on github.com (no README), then:
git remote add origin https://github.com/<you>/couch-to-5k.git
git branch -M main
git push -u origin main
```

---

## Track A — Server on Railway

Already prepared: `server/railway.json` (Nixpacks build, `npm start`, health check on
`/health`), `engines.node >=20`, binds to `0.0.0.0`, and a real landing page at `/`.

### Dashboard (easiest)
1. Railway → **New Project → Deploy from GitHub repo** → pick `couch-to-5k`.
2. Open the service → **Settings → Root Directory** = `server`.
   (Critical — the repo root is not a Node app; `server/` is.)
3. Railway auto-detects Node and runs `npm start`. Wait for the deploy.
4. **Settings → Networking → Generate Domain** to get an HTTPS URL.
5. Visit the URL → status page. Check `/health` returns `{"ok":true}`.

### CLI (alternative)
```bash
npm i -g @railway/cli
railway login
cd server
railway init
railway up
```

### Environment variables (only when Garmin keys exist)
Railway → service → **Variables**:
```
GARMIN_CONSUMER_KEY=...
GARMIN_CONSUMER_SECRET=...
```
`PORT` is provided by Railway automatically — don't set it. Once set, the
`/auth/garmin/*` routes stop returning 501. Then register your Railway domain's
`/auth/garmin/callback` and `/webhooks/garmin` URLs in the Garmin developer portal.

---

## Track B — App on iOS + Android via EAS

Already prepared: `app/eas.json` (development / preview / production profiles),
`app/app.json` wired with icon, splash, Android adaptive icon, and bundle IDs.

> **Confirm the bundle ID.** It's currently `com.vkavali.couchto5k` (iOS
> `bundleIdentifier` + Android `package`). It must be unique and match the IDs you
> register in App Store Connect / Play Console. Change it in `app/app.json` if needed
> **before** your first build — changing it later means re-registering the app.

### One-time setup
```bash
cd app
npm install
npm i -g eas-cli
eas login
eas init           # creates the EAS project, fills extra.eas.projectId in app.json
```

### Build
```bash
# Cloud builds (no Xcode/Android Studio needed):
eas build --platform ios          # produces an .ipa
eas build --platform android      # produces an .aab (Play) — use 'preview' profile for an installable .apk
# or both:
eas build --platform all
```

### Submit to the stores
```bash
eas submit --platform ios         # uploads to App Store Connect / TestFlight
eas submit --platform android     # uploads to Play Console
```
Then finish store listings (screenshots, description, privacy) in App Store Connect
and the Play Console, and ship to TestFlight / internal testing first.

### Note on Bluetooth heart rate
The Devices tab's live HR needs `react-native-ble-plx`, which requires a **custom dev
build**, not Expo Go:
```bash
cd app
npm install react-native-ble-plx
eas build --profile development --platform ios   # or android
```
Plain `eas build` (preview/production) will still compile fine without it — the HR
feature is just inert until the dependency is added.

---

## What this prep changed

- `server/index.js` — binds `0.0.0.0`, added `/status`, serves a `public/` landing page
  + the run-form analyzer at `/analyzer.html`; Garmin routes now return honest 501s.
- `server/public/index.html`, `server/public/analyzer.html` — landing + analyzer.
- `server/railway.json`, `server/package.json` (`engines`) — Railway/Nixpacks config.
- `app/app.json` — icon/splash/adaptive-icon refs, real bundle IDs, web favicon, scheme.
- `app/eas.json` — EAS build + submit profiles.
- `app/assets/` — generated `icon.png` (opaque, Apple-safe), `adaptive-icon.png`,
  `splash.png`, `favicon.png`.

Nothing here touches the app's feature code; the screens and plan engine are untouched.
