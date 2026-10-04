# Pact — iPhone monitoring prototype

A native SwiftUI prototype for voluntary, local screen awareness before a purchase. Built for Xcode 26 and iOS 17+. It contains an iPhone app and a ReplayKit Broadcast Upload Extension. Despite Apple's extension name, **this implementation never uploads anything**.

## Implemented

- A native monitoring dashboard, session signals, privacy controls, and synthetic-screen preview.
- An actual `RPSystemBroadcastPickerView`. Starting capture requires the user's action and Apple's confirmation. Capture never starts on launch.
- A `RPBroadcastSampleHandler` that processes video buffers with Apple Vision OCR, throttled to at most one frame per second with one frame in flight. Captured frames are scaled to a maximum 1,280-pixel edge before OCR to bound recognition work.
- English checkout heuristics using combinations of signals, receipt exclusion, and two-observation candidate stabilization.
- Shared App Group session status, heartbeat, stop requests, and fixed shopping labels. No raw text, screenshot, audio, amount, card number, or address is written to the shared snapshot.
- Suppression of Pact's own screen while it is visible. This app cannot reliably identify every foreground third-party app.
- Sample product, checkout, and receipt images rendered on-device and processed by the **same actual Vision reader**. Sample results are separate from live-session counters.
- A shopping interrupt. Shortcuts can open Pact when a chosen shopping app opens. The pause card offers drop, save for later, continue, and ask my friend. Drop, save, and continue start a 15-minute quiet period so returning to the store does not immediately open Pact again. Ask my friend opens Messages with a generic note. The card does not know the item or the price.

This milestone recognizes possible checkout screens and can interrupt when a shopping app opens. It does **not** shield apps, prevent payment, infer impulsivity, move money, or use a remote AI service. The interrupt is a Shortcut you create. It is not a Screen Time shield, and the shopper can switch back to the store without choosing.

## Open and run

Open `Pact.xcodeproj` and select the **Pact** scheme. There are no external package dependencies.

### Simulator preview

Select an iPhone simulator and run. Open **See what Pact can recognize** to exercise local OCR on synthetic screens. The UI explicitly labels simulator mode; a simulator preview is not evidence of cross-app capture working on a phone.

### Physical iPhone capture

1. In `Config/Shared.xcconfig`, set `PACT_BUNDLE_PREFIX` to a unique identifier (currently `com.francisco.pact`). The runtime App Group and extension bundle identifier derive from that prefix. Both `App/Pact.entitlements` and `BroadcastExtension/Broadcast.entitlements` use the explicit App Group `group.com.francisco.pact` for provisioning; update both to the same `group.<prefix>` if you change the prefix.
2. Set your Apple Developer team in `Config/Shared.xcconfig` and use that same team for **both** `Pact` and `PactBroadcast` in Xcode (target-specific settings override the shared setting). Use a team that supports App Groups. Xcode must provision both targets and the exact same `group.<prefix>` App Group; this may require developer-account capability setup. The project does not contain credentials or a hard-coded team.
3. Enable Developer Mode on your iPhone if Xcode requests it. Connect the phone, select it as the run destination, and build/run **Pact**.
4. In Pact, tap the visible broadcast icon next to **Enable monitoring**. Choose **Pact · Local monitoring**, leave the microphone off, and confirm **Start Broadcast** in Apple's sheet.
5. Open a shopping app with non-sensitive demo data. Browse a product, then enter checkout without completing a purchase.
6. Return to Pact's **Signals** tab. Check the number of processed frames and recent fixed shopping labels. The most recent shopping labels remain visible for up to 60 seconds while the session is healthy; they clear on stop. Unresponsive capture is never displayed as live.
7. Stop from the iPhone recording indicator, Control Center, or **Stop monitoring** in Pact. The in-app stop command is asynchronous. ReplayKit may present the message “You stopped Pact monitoring” because its extension-side termination API takes an error/reason object. If the extension is unresponsive, use the system recording control.

The extension receives full-display frames while the session is enabled, not just shopping apps. App-level allowlisting is not implemented. Audio buffers, if delivered by iOS, are immediately discarded. Some apps or protected screens will not yield usable content.

## Shopping interrupt

Pact registers the URL `pact://pause` and two Shortcuts actions:

- **Should Interrupt** stays in the background and returns true when the 15-minute quiet period is over.
- **Open Pause** brings Pact forward and shows the pause card. During a quiet period it explains that this is not a new pause.

On the iPhone, open the Monitor tab and follow **Shopping interrupt**, or set it up directly in Shortcuts:

1. Automation → plus → App. Pick the shopping app, choose Is Opened, and turn off Ask Before Running.
2. Add Pact's **Should Interrupt** action.
3. Add **If**, and run it when Should Interrupt is true.
4. Inside If, add Pact's **Open Pause** action. Leave Otherwise empty.

Repeat for each shopping app. **Preview the pause** on the Monitor tab opens the same card without a shortcut. A preview choice also starts the quiet period. **End quiet period** clears it.

Ask my friend uses an optional phone number stored only on the device. With no number, Messages opens so the shopper can pick a recipient. The note never includes an item name or a price.

## Architecture

```text
Explicit user action → iOS system broadcast picker
                              ↓
                    ReplayKit extension
                              ↓
              video only · one frame in flight
                              ↓
                  Apple Vision OCR (local)
                              ↓
             rules → fixed labels → stabilization
                              ↓
        App Group snapshot (status, labels, counters)
                              ↓
                   SwiftUI session dashboard
```

`Core/` contains the platform-independent classifier and session state. `Platform/` contains Vision and App Group storage. `BroadcastExtension/` owns capture processing; it does not depend on the host app remaining in the foreground. `App/` contains the native interface and synthetic fixtures.

Files in the App Group use complete file protection and are excluded from backup. Only the latest snapshot and small session-control files are stored. The extension clears old fixed shopping labels while running; the host also suppresses stale labels after an abrupt extension exit. Stale snapshot bytes can remain until overwritten or cleared with **Privacy → Clear local session summary**. The host refreshes only while active; it does not maintain a background polling loop.

## Verify

Core recognition, privacy, and state-transition tests:

```sh
swift test
```

Build app and extension without signing:

```sh
xcodebuild -project Pact.xcodeproj -scheme Pact \
  -configuration Debug -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath /tmp/pact-ios-build CODE_SIGNING_ALLOWED=NO build
```

After installing the simulator build, run real Vision OCR against the three synthetic fixtures:

```sh
xcrun simctl launch booted dev.pact.monitor --ocr-self-test
xcrun simctl get_app_container booted dev.pact.monitor data
```

Read `Documents/ocr-verification.json` in the returned container. Each fixture must report `passed: true`. If you changed the bundle prefix, use that identifier instead. `--preview-checkout` opens the clearly labeled sample preview for UI inspection. These diagnostics do not start a broadcast.

Regenerate the committed Xcode project after adding source files:

```sh
python3 Scripts/generate_project.py
```

The generator uses only Python's standard library. Before regenerating after manually changing Xcode settings, copy those changes into `Config/Shared.xcconfig` or the generator.

## Device validation still required

Verified during implementation on this Mac: unsigned builds for both iPhoneOS 26 and iPhoneSimulator 26, 16 passing core tests, and real Vision OCR correctly classifying all three synthetic fixtures in the iPhone 17 Pro simulator. The monitoring and recognition-preview screens were rendered and visually inspected. These results do not validate physical-device broadcast behavior.

- Confirm the extension appears in Apple's picker with your signing configuration.
- Confirm foreground/background transitions, paused capture, orientation changes, and actual OCR on your chosen shopping apps.
- Confirm both system stop and in-app stop, interrupted sessions, and App Group protection when the phone locks.
- Measure extension memory, battery impact, detection delay, false alarms, and missed screens on real devices. ReplayKit extensions have constrained resources; simulator OCR does not establish production suitability.
- Test whole app flows including cart, delivery, express checkout, account settings, and receipts. Current rules are prototype heuristics, not a validated classifier or a universal checkout detector.

The installed SDK is Xcode 26. ReplayKit is used deliberately instead of depending on the newer iOS 27 ScreenCaptureKit sample. App Store distribution and review of this use case have not been validated.

## Apple references

- [System broadcast picker](https://developer.apple.com/documentation/replaykit/rpsystembroadcastpickerview)
- [Broadcast sample handler](https://developer.apple.com/documentation/replaykit/rpbroadcastsamplehandler)
- [On-device text recognition](https://developer.apple.com/documentation/vision/recognizing-text-in-images)
