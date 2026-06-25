# Native iOS build (Xcode) — Couch → 5K

This app is Expo-managed. To ship a **native** iOS build you first generate the
native `ios/` project, then archive & upload from the **Xcode GUI** (no
`xcodebuild` CLI needed).

Bundle identifier: **`com.vkavali.couchto5k`** (already set in `app.json`).
Run all commands on your **Mac** (the native iOS project can't be generated on Linux).

## 1. Generate the native iOS project

```bash
cd app
npm install                 # installs Expo + RN toolchain
npx expo prebuild -p ios    # creates app/ios/ (Xcode workspace + Podfile)
cd ios && pod install       # installs CocoaPods deps, creates the .xcworkspace
```

This produces `app/ios/couchto5k.xcworkspace`. (`ios/` is gitignored — it's a
generated artifact you regenerate per machine.)

## 2. Open in Xcode

```bash
open app/ios/couchto5k.xcworkspace
```

Always open the **`.xcworkspace`**, not the `.xcodeproj` (CocoaPods requires it).

## 3. Signing (one-time)

1. Select the **couchto5k** target → **Signing & Capabilities** tab.
2. **Team** → your Apple Developer team.
3. Leave **Automatically manage signing** checked. Confirm
   **Bundle Identifier** reads `com.vkavali.couchto5k`. Xcode registers the App
   ID with your account on first build.

## 4. Archive

1. Top device selector → **Any iOS Device (arm64)** (not a simulator — you can't
   archive for a simulator target).
2. Menu **Product → Archive**. Wait for the build; the **Organizer** opens when done.

## 5. Upload to App Store Connect / TestFlight

In the Organizer, with the new archive selected:

1. **Distribute App** → **App Store Connect** → **Upload**.
2. Keep the defaults (automatic signing, upload symbols) → **Upload**.
3. The build appears in App Store Connect → your app → **TestFlight** after
   processing (a few minutes). Add it to a TestFlight group to install on your phone.

> First time only: create the app record in App Store Connect
> (apps → **+** → New App) with bundle ID `com.vkavali.couchto5k` before the
> upload can attach to it.

## Note on Bluetooth heart rate

Live BLE HR needs `react-native-ble-plx`, which only works in a native build
(not Expo Go). Add it before prebuild if you want HR in this build:

```bash
cd app && npm install react-native-ble-plx
npx expo prebuild -p ios --clean && cd ios && pod install
```

Without it the Devices tab's live HR is simply inert; everything else works.
