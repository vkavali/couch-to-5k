# CLAUDE.md — project handoff

Read this first. It's the context for continuing the **Couch → 5K** app, which was
scaffolded in a separate chat. Pick up from "Next steps" below.

## What this is
A native iPhone/Android app for a 12-week couch-to-5K training plan, plus an
optional backend for Garmin Connect sync.

- `app/` — Expo React Native app (the phone app). Runs in Expo Go today.
- `server/` — Node/Express skeleton for Garmin's Health API (OAuth + webhooks).

## How to run
```bash
cd app && npm install && npx expo start     # scan QR with Expo Go
```
Backend (optional): `cd server && npm install && cp .env.example .env && npm start`

## Key facts & constraints (don't re-litigate these)
- **Plan Day 1 = 23 Jun 2026** (`app/src/lib/plan.js` → `START`). The app derives
  today's workout from this date. Plan is 84 days: each week is Run, Strength,
  Rest, Run, Strength, Long run, Rest.
- **Heart rate** uses the standard BLE Heart Rate profile (`app/src/lib/hr.js`).
  It requires a **custom dev build** (`npx expo run:ios`/`run:android` after
  `npm install react-native-ble-plx`) — it does NOT work in Expo Go. On a dev
  build it works on iPhone too.
- **Garmin sync** is impossible from the app alone. It needs an approved Garmin
  Developer Program (Health API) account + the `server/` backend deployed with
  HTTPS. The OAuth 1.0a flow is stubbed with TODOs in `server/index.js`.
- State persists via AsyncStorage (`app/src/lib/store.js`), key `fitlog:v1`.

## What's already done
- Plan engine + helpers (`lib/plan.js`)
- Today screen (auto-selects the day's workout, browse any day, mark complete)
- Guided interval **run timer** with phase ring + warm-up/cool-down sequencing
  (`screens/RunTimerScreen.js`), with a finish-log for time/distance/notes
- Strength workout: 3-round tracker + 60s rest timer (`screens/StrengthScreen.js`)
- Progress: streak, runs done, longest run, body-weight log, history
- Devices screen + BLE HR service + Garmin backend skeleton

## Next steps (in priority order)
1. **Wire live HR into the run timer.** Move HR connection into shared state (a
   context or zustand store), feed BPM into `RunTimerScreen`, and capture
   avg/max HR into the finish-log record.
2. **Audio/haptic cues** on phase changes in the run timer (expo-haptics +
   expo-av), since the web version had beeps and the RN port doesn't yet.
3. **Charts** on the Progress screen (body weight + run duration over time) using
   `react-native-svg` (already a dependency).
4. **Daily workout notifications** (expo-notifications).
5. **Garmin OAuth**: implement the real OAuth 1.0a request-token/access-token
   calls and the webhook handler in `server/index.js`. Gated on Garmin dev
   approval — leave as TODO until keys exist.

## Conventions
- Theme tokens live in `app/src/lib/theme.js` (`C.*`). Use them, don't hardcode colors.
- Keep screens functional and small; shared logic goes in `lib/`.
- All files are plain `.js` with JSX (Metro handles it).
