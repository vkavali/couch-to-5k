# Decision log — Couch to 5K v2

Each entry: what, why, pros, cons. Thresholds are training rules chosen for caution,
not medical advice. Change them here and in `app/test/engine.test.js` together.

| # | What | Why | Pros | Cons |
|---|------|-----|------|------|
| D1 | Fresh rebuild in this repo, v0.1.0 screens removed | vv chose it; the 1.1.0 code is not on GitHub | Clean engine, no dead calendar code | 1.1.0 features (nutrition, accounts) are not carried over |
| D2 | Progress is 12 stages, 3 good runs per stage, not calendar weeks | The old plan assumed Day 1 = 23 Jun 2026 and broke after any break | Survives breaks, injuries and busy weeks | Finish date is an estimate |
| D3 | Current stage is derived by replaying the log, never stored | Editing or deleting history cannot corrupt the plan | One source of truth | Recomputed on each render (cheap) |
| D4 | Gap rule: 10+ days off drops 1 stage, 21+ drops 2, 42+ drops 4 | Fitness fades; resuming at the old stage is how injuries start | Safe restart without starting over | Thresholds are conservative guesses |
| D5 | A run with pain 4+/10 or stopped early does not count | Progressing through pain caused the shin and hip problems | Stage only moves on clean runs | User may repeat a stage |
| D6 | Reporting pain puts all running on hold | Deterministic and simple to trust | No running on an injury | Cannot keep running on a minor niggle |
| D7 | Hold clears after 3 check-ins in a row with pain 0-1 and free movement | Needs evidence, not a feeling on one good day | Clear target shown as 0/3 | Missing a check-in day resets the streak |
| D8 | Return = 30 min walk test, then 2 easy runs two stages lower, max 2 runs in week one | Graded return | Lower re-injury risk | Slower than the user may want |
| D9 | "Get it examined" flag at pain 7+, no improvement by day 5, or day 14 | App must not replace an exam | Escalates the cases that need it | May over-flag |
| D10 | Cricket load computed from roles (overs, batted, fielded, kept, nets minutes) | Carried from 1.1.0: load is computed, one event has many roles | No guessing by the user | Weights are simple |
| D11 | High load blocks runs the day before, on and after; medium blocks the day after; never run two days in a row | Carried from v0.1.0 game-day logic, tightened | Legs recover around matches | Busy weeks get 2 runs |
| D12 | During hold and return, strength is upper body and core only | Keep load off the injured leg | Still trains | Less leg strength work |
| D13 | Timer uses the wall clock | v0.1.0 counted ticks and drifted when the phone locked | Correct in the background | No background audio cue yet |
| D14 | Dates are local, not UTC | v0.1.0 rolled to tomorrow in the evening in US time zones | Correct day at 11pm | None |
| D15 | Cricket palette (cream, pitch green, cherry, willow, gold), light and dark | Carried from the approved 1.1.0 design direction | One token file | Rebuilt from memory of that palette, not the DESIGN.md file |
| D16 | 4 tabs (Today, Plan, Log, Progress); Strength, Games and Devices folded in | Six tabs hid the main action | Today answers "what do I do now" | Heart-rate connect is lower on Progress |
| D17 | No new native dependencies; web deps added for a browser preview | Lower build risk | Preview and screenshots without a phone | Vibration only, no haptics/audio library |
| D18 | Food targets: Mifflin-St Jeor resting energy x 1.35, plus the planned session's energy | Standard, published method; targets follow the training plan | More food on run and match days automatically | Estimates, typically within about 10% |
| D19 | Fat loss deficit is 20% capped at 500 kcal, never below resting energy or 1500/1200 kcal, removed on high-load cricket days and when weight falls faster than 1% a week | Carried from the 1.1.0 coach rules: fuelling beats cutting | Hard to under-eat by following the app | Slower loss than aggressive plans |
| D20 | Protein 2.0 g/kg when losing, 1.8 otherwise, on a reference weight capped at BMI 27 | Protects muscle in a deficit without inflating at higher body weight | Simple | Vegetarian days land near 90-95% of it |
| D21 | Meals are recommended from templates and scaled to the target; user taps Ate this or Swap | Carried from 1.1.0: meals are recommended, not selected | One tap to log a day | 18 templates, limited variety |
| D22 | Built-in food list plus Open Food Facts barcode lookup, shown for confirmation before logging | Free, no key, works offline for staples | No account or cost | Crowd-sourced data can be wrong; list values are rounded averages |
| D23 | No AI in meal planning | Spec file not available; rules are testable and free to run | Deterministic, offline | Less flexible than the 1.1.0 design |
| D24 | GPS in the foreground with the screen kept awake; drop points with accuracy over 30 m, moves under 3 m, speeds over 8 m/s | Avoids the background-location permission and App Store review burden | Simple, private | Phone must stay unlocked during outdoor runs |
| D25 | Treadmill is the default run mode | vv runs on a treadmill at home | No GPS prompt for indoor runs | Outdoor needs one tap |
| D26 | Sync stores one JSON document per user at `/v2/state`; the phone pulls, merges record by record (newest write wins, deletes kept as tombstones), then pushes | Keeps the 1.1.0 `/state` tables untouched; merge is a pure tested function | Two devices cannot silently overwrite each other's records | Whole document is sent each time (small for one user) |
| D27 | Account is optional and Sign in with Apple only; token kept in the iOS Keychain; delete account in the app | Carried from 1.1.0 (Apple on Railway, no Supabase); App Store rule 5.1.1 | Works fully offline without an account | No Android or web sign-in |
