# Pact — iPhone checkout monitoring and blocking

Native SwiftUI, local Vision OCR, ReplayKit and Screen Time shielding. The iPhone app keeps recognition local. It now connects to the team's existing Photon API through a paired backend URL. Choosing Continue requests the linked friend's confirmation while the selected app stays blocked. See [setup and phone test steps](Docs/FRIEND_APPROVAL.md).

## What is implemented

- Existing English checkout phrase rules and two-adjacent-observation candidate detection, unchanged.
- Opt-in Screen Time authorization for the device owner and selection of **one shopping app**.
- ReplayKit applies a Managed Settings shield to that app after a confirmed checkout candidate.
- **iOS 26.4+ submenu:** tap **Choose what happens next** for **Drop purchase**, **Save for later**, or **Continue**. These are submenu rows, not three permanent buttons on the shield.
- A clearly labeled **15-second demo pause** starts when the shield or Pact’s pause view opens. A stored deadline survives view refreshes and process restarts. Early Continue taps leave the shield in place; eligible Continue requests friend approval; time passing never submits an order or removes the shield by itself.
- Drop and Save record the choice and close the shopping app, **keeping it blocked** until the user taps **Resume selected app**, turns blocking off, or stops monitoring. Save records a dated reminder only; the product, URL and price are not collected.
- Continue creates a pending friend-approval request after the 15-second pause; it **does not remove the shield**. Only a matching, unexpired, approved response from the authenticated backend records Continue and releases this block. The shopper must still complete any purchase themselves.
- Pending approval survives restarts. Drop or Save while waiting cancels the local continuation; a late confirmation cannot release that block. Expired, denied, mismatched and failed requests remain blocked.
- `ApprovalBackend.makeTransport()` loads the URL and separate Pact pairing key shared by the host and extensions. The adapter uses the existing `/check-in` API with a native metadata-only payload. See [backend setup and confirmation rules](Docs/FRIEND_APPROVAL.md).
- Local choice history, an explicit **Turn off blocking** recovery control, and an isolated **Preview pause UI** for designers and Simulator testing.

This blocks the whole selected app, not only its checkout button. The OCR reader cannot reliably identify the foreground app. For this prototype select one shopping app and test checkout there: signals in another app can also trigger a block of the selected app. Detection and shield delivery are asynchronous and **cannot guarantee interruption before every payment**. Protected screens, recognition mistakes and very fast actions can be missed.

## Requirements and current machine status

| Feature | Requirement | Status on the implementation Mac |
| --- | --- | --- |
| Core tests and native UI preview | Xcode 26.0+ | Available; core tests and unsigned app/extension builds pass |
| Real Screen Time blocking on iPhone | Paid Apple Developer team with Family Controls development profiles, iPhone authorization | **Blocked:** selected Personal Team does not support Family Controls |
| Three choices directly in the shield submenu | Xcode 26.4+ SDK, iOS 26.4+ on the phone | **Blocked:** installed Xcode is 26.0 |
| Running Xcode 26.4 | macOS 26.2+ | **Blocked:** Mac is currently on macOS 15.7.7 |

The source uses a Swift compiler guard for Xcode 26.4’s Swift 6.3, plus `if #available(iOS 26.4, *)`. With the current Xcode 26.0 build, the fallback shield offers **Drop purchase** and **Close app**; open Pact manually and tap **Open pause choices** for all three actions. Updating only the phone will not add submenu support: the app must be rebuilt with the newer SDK.

The iOS 26.4 branch is implemented from Apple’s documented initializer and action names, but **has not been compiled or device-tested with the 26.4 SDK** on this Mac. Do not treat a simulator preview or successful unsigned build as verification of system shielding.

## Run on a physical iPhone

1. Use Xcode 26.4+ on a compatible Mac for the submenu. A teammate’s compatible Mac and paid development team can be used for the hackathon.
2. Open `Pact.xcodeproj`, choose scheme **Pact**, and select your iPhone as the run destination.
3. Set the **same paid development team** for all four targets: **Pact**, **PactBroadcast**, **PactShieldConfiguration**, and **PactShieldAction**. Use automatic signing. Family Controls and App Groups must be provisioned for the app and its extensions. A free Personal Team cannot sign this blocker build.
4. Keep all four entitlements files on the same explicit App Group, currently `group.com.francisco.pact`. `Config/Shared.xcconfig` sets `PACT_BUNDLE_PREFIX`, the runtime group and default team. If changing the bundle prefix, change the group in every entitlements file as well. Target-specific team settings override the shared default.
5. Enable Developer Mode on the phone if requested, then press **Command–R**.
6. In Pact’s **Monitor** tab, scroll to **Checkout blocking**, tap **Allow Screen Time access**, and approve the system authorization.
7. Choose **exactly one shopping app**. Do not select whole categories, websites or Pact itself. Save, then tap **Enable checkout blocking**.
8. First tap **Test blocker on selected app**, then open that app. This deliberately applies a real test shield without starting capture. On iOS 26.4 with the new SDK build, open the secondary-button menu and verify Drop and Save close the app while retaining the shield. Continue must leave it blocked and show a pending request in Pact. First configure **Friend messaging** using the [backend setup](Docs/FRIEND_APPROVAL.md); the friend must reply with the exact confirmation code. Use Turn off blocking to recover. Repeat the test from Pact for each choice.
9. For live detection, resume the selected app, then tap Pact’s broadcast icon beside **Enable monitoring**. Choose **Pact · Local monitoring**, keep the microphone off, and tap **Start Broadcast**.
10. Enter checkout in the selected shopping app using non-sensitive test data. Do not make a purchase. The unchanged reader requires two adjacent matching readings before creating a pause and applying the shield.
11. To exit, use **Turn off blocking** in Pact. **Stop monitoring** also releases the shield. If the extension is unresponsive, stop the broadcast using the iPhone recording indicator and open Pact to turn blocking off. Screen Time access can also be revoked in iOS Settings.

Stopping a broadcast may show ReplayKit’s termination-reason message. Force-killing an extension is not a reliable cleanup mechanism: an existing shield can remain until explicitly released. Disabling Pact does not modify any other app’s Screen Time rules.

Family Controls needs a development-capable paid team for device testing. Apple’s separate distribution approval is required for TestFlight/App Store distribution; it is not proof of development signing access.

## Simulator and UI/UX work

Select an iPhone simulator and run **Pact**. **Preview pause UI** exercises the real local pause state transitions in memory with synthetic data and all three choices; it does not apply a Screen Time shield. Wait 15 seconds, choose **Continue · ask my friend**, then **Simulate CONFIRM reply** to see the approved outcome. Reopen to test a decline or choose Drop/Save while waiting. Simulation controls exist only in this isolated preview; they never alter the live block or send a text. **See what Pact can recognize** runs Vision on synthetic product, checkout and receipt screens. Neither preview starts a broadcast or writes live intervention history.

The new UI lives in `App/CheckoutPauseView.swift`. `CheckoutPauseView` receives a pause, current time and action callbacks; it has no Screen Time, storage or OCR side effects. `BlockingModel` connects UI to the shared state. Designers can replace the SwiftUI views without changing the classifier or decision validation. The OS shield itself must use Apple’s `ShieldConfiguration` layout.

## Architecture and privacy

```text
User authorizes Screen Time → chooses one app → enables blocking
User starts ReplayKit → local Vision OCR → unchanged classifier/stabilizer
                                              ↓
                             App Group intervention transaction
                                              ↓
                           named ManagedSettingsStore → OS shield
                                              ↓
                  Drop / Save → close app, persist choice, retain shield
                  Continue → persist pending request, retain shield
                                      ↓
                    authenticated backend → Photon → friend reply
                                      ↓
                  matched approval → record Continue → release shield
```

- `Core/ScreenAnalysis.swift`: unchanged recognition rules and candidate stabilization.
- `Core/CheckoutIntervention.swift`: cooldown, decisions, event IDs, repeat suppression and bounded history.
- `Core/FriendApproval.swift` and `Core/ApprovalCoordinator.swift`: request identity, approval state, HTTP contract and shared synchronization.
- `Platform/ApprovalBackend.swift`: shared protected pairing settings and backend factory; no Photon credentials in the app.
- `Core/InterventionStore.swift`: atomic file writes and cross-process locking. A concurrent capture update cannot overwrite a shield decision.
- `Platform/CheckoutBlocker.swift`: the named Screen Time store and reconciliation with shared state.
- `BroadcastExtension/`: OCR/candidate path and shield application; graceful stop/error cleanup.
- `ShieldConfigurationExtension/`: Apple’s shield appearance and the 26.4 submenu.
- `ShieldActionExtension/`: action mapping and authoritative deadline checks.
- `App/`: authorization, app picker, recovery controls, history and replaceable SwiftUI.

No screenshots, audio, recognized text, addresses, product names or URLs are persisted or sent to the approval service. Pause-event scoring now stores a backend-assigned demo amount in Neon; the iPhone does not recognize or upload real prices. The approval client sends only request/pause IDs and timestamps; friend identity and Photon secrets belong to the backend. Shared metadata contains fixed signal labels, timestamps, session/candidate IDs, choice events and a Screen Time opaque app token. Save stores a reminder, not an item bookmark. History is capped at 100 pauses; clearing completed history retains an outstanding block so it can still be resolved. App Group files use complete file protection and are excluded from backup.

After resolving a checkout, Pact suppresses another pause for the same apparent checkout visit. Two browsing/cart/confirmation readings rearm the intervention; Pact’s own screen and unknown frames do not. This is duplicate suppression, not a change to the recognition phrases or candidate thresholds. A new broadcast session can arm a new pause.

## Verification

```sh
swift test

xcodebuild -project Pact.xcodeproj -scheme Pact \
  -configuration Debug -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath /tmp/pact-shield-simulator CODE_SIGNING_ALLOWED=NO build

xcodebuild -project Pact.xcodeproj -scheme Pact \
  -configuration Debug -destination 'generic/platform=iOS' \
  -derivedDataPath /tmp/pact-shield-device-unsigned CODE_SIGNING_ALLOWED=NO build
```

The core tests cover the unchanged classifier, two-observation detection, cooldown boundaries, persistence, repeated actions, rearming, all three outcomes, explicit recovery, bounded history, corrupt-file errors and concurrent writes, plus pending/denied/expired approval, late replies after Drop/Save/Stop, duplicate replies, backward-compatible persistence, HTTP authentication and request matching.

After installing a simulator build, these launch arguments support UI and OCR checks:

```sh
xcrun simctl launch booted com.francisco.pact --preview-pause
xcrun simctl launch booted com.francisco.pact --preview-friend-pending
xcrun simctl launch booted com.francisco.pact --preview-checkout
xcrun simctl launch booted com.francisco.pact --ocr-self-test
xcrun simctl get_app_container booted com.francisco.pact data
```

OCR verification writes `Documents/ocr-verification.json` inside that app container. Use your bundle identifier if the prefix changed.

Regenerate the project after adding Swift files with `python3 Scripts/generate_project.py`. The generator preserves existing target build-setting overrides, including development teams, and adds all four targets. Review signing if moving to a different team.

Still required on a properly signed iOS 26.4+ device: test shield appearance while another app is foreground, the actual submenu callback mapping, early Continue, Continue leaving the shield applied, a real Photon confirmation releasing only its matching block, Drop/Save closing behavior, repeated candidate suppression, stop/revoke cleanup, device locking, process termination, and capture latency. No full-screen blocking has been verified on the physical phone yet because development signing is currently unavailable.

## Approval synchronization

With Friend messaging configured, the shield action attempts submission, the active ReplayKit extension retries/checks every five seconds, and Pact checks while foreground. The backend reserves stable request IDs before sending because these processes can overlap. No always-running background app or guaranteed instant unlock is assumed: if capture stops or an extension is suspended, open Pact to sync. Explicitly stopping monitoring or turning blocking off remains a user-controlled escape.

Drop/Save can close the shopping app from a shield action, but cannot navigate that app away from checkout or clear its cart. An explicit Resume may reveal the same checkout. Only the one application selected in Apple's picker is shielded; this is not automatic identification of every payment app.

## Apple references

- [Shield submenu (iOS 26.4+)](https://developer.apple.com/documentation/managedsettingsui/shieldconfiguration/secondarybuttonsubmenuitems)
- [Shield actions](https://developer.apple.com/documentation/managedsettings/shieldaction)
- [Xcode 26.4 requirements](https://developer.apple.com/documentation/xcode-release-notes/xcode-26_4-release-notes)
- [Family Controls setup and signing](https://developer.apple.com/documentation/xcode/configuring-family-controls)
- [Individual Screen Time authorization and shared settings stores](https://developer.apple.com/videos/play/wwdc2022/110336/)
- [System broadcast picker](https://developer.apple.com/documentation/replaykit/rpsystembroadcastpickerview)
- [Broadcast sample handler](https://developer.apple.com/documentation/replaykit/rpbroadcastsamplehandler)

## Price-based scoring

Pause metadata and choices are queued separately from local UI history and retried after connection failures. The backend assigns a demo price (default $64.99), records the event and updates the paired demo user’s score atomically in Neon. Asking the friend deducts points; Drop earns 2 points per dollar and Save earns 0.25. The check-in penalty is 0.5 points per dollar. Each action is counted once, and Drop/Save are mutually exclusive rewards for a pause. Whole points are rounded by the backend.

`PauseScoreCard` shows the synced total; its display is independent of the scoring service. UI previews never send scoring events. See [shared scoring design and API](../docs/SCORING.md) for schema, configuration and tests.
