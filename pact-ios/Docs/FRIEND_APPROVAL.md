# Native Pact / Photon demo integration

The native app now shares the web extension's API server (`apps/api/src/index.ts`), Photon Cloud project and server-configured `FRIEND_HANDLE`. It posts to `/check-in` and polls that endpoint. Native Continue is gated on approval, unlike the browser's separate immediate Continue action. Existing iPhone recognition rules and the 15-second demo pause are unchanged.

## Set up the API on the Mac

From the MHacks-26 repository root:

```sh
npm ci
npm run dev:api
```

Keep the existing server-only `SPECTRUM_PROJECT_ID`, `SPECTRUM_PROJECT_SECRET`, `FRIEND_HANDLE` and `DATABASE_URL` in the ignored root `.env`. Use the already onboarded friend and existing project. Do not put these values in Xcode. `GEMINI_API_KEY` is used only by rule setup; this flow does not call Gemini. Spacetime is optional: native approval polling works without it.

Add `PACT_IOS_TOKEN` to `.env`, using at least 32 random characters (for example `openssl rand -hex 32`). This separate demo pairing key is the only credential entered in Pact. Restart the API after changing environment values. Use one API process for the demo; avoid running a second Photon consumer on a teammate's machine.

The API listens on port 8787. On the Mac, `scutil --get LocalHostName` gives the name for `http://NAME.local:8787`. Use the Mac's private LAN IP if mDNS is unavailable. An iPhone's `localhost` is the phone, not the Mac. Both must be on the same reachable network; campus Wi-Fi may isolate devices. A local hotspot can avoid that. Debug builds allow HTTP only for local hostnames/private IPv4 addresses; Release requires HTTPS. Do not expose this demo server publicly: browser endpoints remain the existing unauthenticated single-user demo.

## Connect the app

1. In Monitor, scroll to **Friend messaging**.
2. Enter the Mac backend URL and the value of `PACT_IOS_TOKEN`.
3. Tap **Save and check connection** and allow Local Network access if prompted. This calls only `/native/health`; it sends no message. It reports whether Photon initialized and whether Neon is configured, not proof of delivery to the friend.
4. Configure Screen Time and select one shopping app. This requires a signing team supporting Family Controls; a free Personal Team cannot install the blocker build.
5. Enable checkout blocking, then **Test blocker on selected app**. Open that app to verify the system shield.
6. With Xcode 26.0's fallback shield, return to Pact and open **Open pause choices**. Wait 15 seconds and choose **Continue · ask my friend**. The selected app stays blocked.
7. The linked friend receives a generic prompt. Reply **CONFIRM followed by the exact code in that prompt**, or **NO followed by the code**. A bare YES/CONFIRM cannot approve a native pause.
8. Pact checks about every five seconds while foreground or while its screen broadcast remains active. Return to Pact and tap **Check for reply** if needed. Only a matching approval releases the shield; it never makes a purchase.
9. For automatic detection, start the explicit screen broadcast and visit checkout in the selected app. Two adjacent checkout readings trigger the same flow.

Drop/Save keep the selected app blocked. On the OS shield they also close it. They cannot remove another app's cart or navigate out of checkout. Resume after Drop/Save, Turn off blocking, stopping capture, or revoking Screen Time remains an explicit local escape.

## Wire contract

All native routes require `Authorization: Bearer <PACT_IOS_TOKEN>` and return `Cache-Control: no-store`. This is one paired shopper/friend demo, not multi-user account authentication.

`POST /check-in`:

```json
{
  "source": "ios",
  "id": "REQUEST-UUID",
  "pauseId": "PAUSE-UUID",
  "createdAt": 1791072000000,
  "expiresAt": 1791072900000
}
```

Times are Unix milliseconds and lifetime is at most 15 minutes. No product, price, merchant, phone number, screen image or recognized text is submitted. `GET /check-in?source=ios&id=REQUEST-UUID` returns:

```json
{"source":"ios","id":"REQUEST-UUID","pauseId":"PAUSE-UUID","status":"sent"}
```

The wire states `sent`, `approved`, `rejected` map to native `pending`, `approved`, `denied`. Sent means the provider accepted the send, not delivered/read. The phone checks both IDs and source. Unknown states, missing requests, network failures and expiry never approve. `/native/health` returns native contract version, provider initialization and storage readiness without texting.

## Matching, retries and persistence

`apps/api/src/native-approvals.ts` owns the native state machine separately from the browser's legacy `waitingId`. Neon stores `native_check_ins`; without Neon, memory storage is explicitly reported and a restart loses requests safely (404, still blocked).

- Reserve the request before calling Photon; repeated or simultaneous app, broadcast and shield submissions do not resend it. Conflicting IDs/payloads fail.
- Persist the provider's message and conversation IDs. Requests with uncertain sends (including Photon's “until they respond” error) fail closed and are never automatically resent. Fix onboarding/service access, then start a new pause. A process crash during send may leave `sending`; this deliberately requires a new pause rather than risking duplicate messages.
- Accept only an inbound text from the configured friend in the matching DM with the exact request code and an unexpired pending request. The code differentiates simultaneous native and browser pauses. No LLM decides authorization.
- Atomically persist the terminal decision before exposing it to the phone. Duplicate messages cannot reverse it. Terminal statuses survive API restarts with Neon.
- A code-bearing reply never falls through into the browser's bare YES/NO resolver. Browser replies are now checked against the configured sender and exact decision words; the browser UI/POST shape is otherwise unchanged. Its legacy global waiting slot is still limited to one active browser pause.
- Drop/Save/Stop on the phone invalidate continuation locally. A delayed confirmation cannot release that or another pause. Server cancellation is not implemented, so a previously sent prompt may still exist.

URL and pairing key live in a protected, backup-excluded App Group file shared by the app and extensions. Network waits occur outside the state lock, and the state is revalidated when the reply arrives. Background execution is not guaranteed; open Pact as the fallback. The three shield submenu actions require building with Xcode 26.4+ and an iOS 26.4+ device.

## Verification

```sh
npm run test --workspace @secondthought/api
npm run typecheck --workspace @secondthought/api
swift test --package-path pact-ios
```

Backend fixtures cover concurrent submissions, wrong senders/conversations, ambiguous and stale replies, simultaneous pauses, rejection, expiry, conflicting retries and uncertain sends. Swift tests cover metadata-only HTTP requests, reply identity/status, local networking restrictions, and late approvals after Drop/Save/Stop. No fixture contacts Photon or sends messages. **Preview pause UI** remains an isolated in-memory simulation.

Actual Photon delivery, device shield appearance and background release must still be tested on a properly signed physical phone. Successful unit tests or unsigned builds do not prove these device behaviors.

References: [Photon SDK](https://github.com/photon-hq/spectrum-ts), [Apple local networking](https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity/nsallowslocalnetworking), [Apple Family Controls](https://developer.apple.com/documentation/xcode/configuring-family-controls).
