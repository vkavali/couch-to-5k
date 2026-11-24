# CLAUDE.md — Couch to 5K v2 (fresh rebuild, Nov 2026)

v2 replaces the v0.1.0 app. The fixed 84-day calendar is gone: the plan is rebuilt
every day from the user's log. Read `DECISIONS.md` before changing any rule.

## Layout
- `app/src/engine/` — pure JS, no React. Owns every training and safety rule.
  - `stages.js` 12-stage ladder · `progress.js` stage derived by replaying the log
  - `injury.js` hold, check-ins, return steps · `load.js` cricket load from roles
  - `schedule.js` forward plan (`buildPlan`) · `state.js` reducers, v1 migration, stats
  - `nutrition.js` + `foods.js` food targets and recommended meals · `sync.js` two-device merge · `geo.js` GPS distance
- `app/src/screens/` — Today, Plan, Food, Log, Progress, plus `Timer.js`, `Forms.js`, `SettingsSheet.js`
- `app/src/lib/` — `gps.js` (expo-location), `off.js` (Open Food Facts barcode lookup), `api.js` (Apple sign-in, sync), `hr.js`, `store.js`
- `app/src/ui/` — `theme.js` tokens (light/dark), `kit.js` shared components
- `app/test/engine.test.js` — rule tests (21).
- `server/` — the 1.1.0 server plus `GET/PUT /v2/state` and table `state_v2` for this app. The v1 `/state` routes and tables are untouched; do not change them, the TestFlight 1.1.0 app may still use them.

## Run
```bash
cd app && npm install
npm test                 # engine rules, must pass before any commit
npx expo start           # Expo Go on the phone
npx expo export -p ios   # bundle check
npx expo export -p web   # browser preview build
# server: needs a Postgres; skipped without DATABASE_URL
cd ../server && DATABASE_URL=postgres://... PGSSL=off SESSION_SECRET=x npm test
```
Accounts are optional. Set `EXPO_PUBLIC_API_URL` (see `app/.env.example`) to the Railway URL to turn sync on.

## Rules for changes
- Screens never decide training. They display what `buildPlan` returns.
- A new rule needs a test in `engine.test.js` and a line in `DECISIONS.md`.
- Dates are local ISO strings from `engine/dates.js`. Never use `toISOString()` for a day.
- Colors come from `useT()`. Rows of tiles, chips and day columns use `flex: 1` so they fill the row.
- Storage key is `c25k:v2`; `fitlog:v1` is migrated on first load and left in place.
- Heart rate needs an installed dev build (`react-native-ble-plx`), not Expo Go.

## Not done yet
1. Not yet run on a physical iPhone. Engine and server are tested; screens are checked in a browser build; iOS only bundles.
2. GPS, barcode camera and Sign in with Apple cannot run in the browser, so they are untested end to end. All three need an installed dev or TestFlight build (not Expo Go for Apple sign-in).
3. GPS is foreground only: the screen stays awake during a run. No background location.
4. Live heart rate inside the run timer; audio cues; daily notifications.
5. Garmin sync (gated on Garmin developer approval).
6. Meals come from fixed rules and a built-in list of 34 foods. No AI meal generation; the 1.1.0 NUTRITION.md spec was not available.
