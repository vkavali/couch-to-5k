# Couch → 5K

A native iPhone/Android training app for a 12-week couch-to-5K plan: guided
interval run timer, dumbbell strength tracker, progress logging, on-device
heart-rate (Bluetooth), and an optional Garmin Connect sync backend.

Day 1 of the plan is **23 Jun 2026**; the app figures out today's workout automatically.

```
couch-to-5k/
├── app/        Expo React Native app (the phone app)
└── server/     Node/Express backend for Garmin Health API sync (optional)
```

## Run the app

```bash
cd app
npm install
npx expo start          # scan the QR code with Expo Go on your phone
```

This runs everything except Bluetooth heart rate (Expo Go has no native BLE).
The plan, timer, strength tracker, and logging all work in Expo Go.

### Enable on-device heart rate (iPhone included)

BLE needs a custom dev build, not Expo Go:

```bash
cd app
npm install react-native-ble-plx
npx expo run:ios        # or: npx expo run:android
```

Then on the **Devices** tab, tap *Connect monitor* and pick your Bluetooth
heart-rate strap. Some Garmin watches work if you enable "Broadcast HR".

## Run the Garmin sync backend (optional)

Direct Garmin Connect sync (runs, HR, sleep) is **not possible from the phone
app alone** — it needs Garmin's Health API, which requires:

1. An approved **Garmin Developer Program** account (apply at
   developer.garmin.com/health-api — approval is required and not instant).
2. A consumer key/secret, placed in `server/.env`.
3. This server deployed with HTTPS, its callback + webhook URLs registered in
   the Garmin portal.

```bash
cd server
npm install
cp .env.example .env    # add your Garmin keys
npm start
```

`server/index.js` lays out the full OAuth + webhook flow with TODOs marking
exactly where Garmin's signed requests go.

## What's done vs. next

Done: plan engine, Today screen, guided interval run timer with phase ring,
strength workout + rest timer, progress/streak/body-weight logging (persisted),
Devices screen, BLE HR service, Garmin backend skeleton.

Next: wire BLE HR readings into the run timer + finish-log, build out the
Garmin OAuth calls, add charts, and push notifications for daily workouts.

## Push this to GitHub

This folder is already a git repo with an initial commit. Create an empty repo
on GitHub (no README), then:

```bash
git remote add origin https://github.com/<you>/couch-to-5k.git
git branch -M main
git push -u origin main
```
