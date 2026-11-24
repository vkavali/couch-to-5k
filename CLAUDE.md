# CLAUDE.md — Couch to 5K v2 (fresh rebuild, Nov 2026)

v2 replaces the v0.1.0 app. The fixed 84-day calendar is gone: the plan is rebuilt
every day from the user's log. Read `DECISIONS.md` before changing any rule.

## Layout
- `app/src/engine/` — pure JS, no React. Owns every training and safety rule.
  - `stages.js` 12-stage ladder · `progress.js` stage derived by replaying the log
  - `injury.js` hold, check-ins, return steps · `load.js` cricket load from roles
  - `schedule.js` forward plan (`buildPlan`) · `state.js` reducers, v1 migration, stats
- `app/src/screens/` — Today, Plan, Log, Progress, plus `Timer.js` and `Forms.js` sheets
- `app/src/ui/` — `theme.js` tokens (light/dark), `kit.js` shared components
- `app/test/engine.test.js` — rule tests. `server/` is unchanged from v0.1.0.

## Run
```bash
cd app && npm install
npm test                 # engine rules, must pass before any commit
npx expo start           # Expo Go on the phone
npx expo export -p ios   # bundle check
npx expo export -p web   # browser preview build
```

## Rules for changes
- Screens never decide training. They display what `buildPlan` returns.
- A new rule needs a test in `engine.test.js` and a line in `DECISIONS.md`.
- Dates are local ISO strings from `engine/dates.js`. Never use `toISOString()` for a day.
- Colors come from `useT()`. Rows of tiles, chips and day columns use `flex: 1` so they fill the row.
- Storage key is `c25k:v2`; `fitlog:v1` is migrated on first load and left in place.
- Heart rate needs an installed dev build (`react-native-ble-plx`), not Expo Go.

## Not done yet
1. Live heart rate inside the run timer (strap connect works on the Progress tab only).
2. Audio cues and keep-screen-awake during a run (vibration only today).
3. Daily notification for the session and the injury check-in.
4. Garmin sync (still gated on Garmin developer approval; `server/` skeleton).
5. Not yet run on a physical iPhone: bundles for iOS and tested in a browser build only.
6. Features from the separate 1.1.0 "Cover Drive" codebase (nutrition, meal planning,
   accounts) are not in this repo.
