# Integrations

Impulse works with no third-party keys. External services add transport, not new rules.

## Google

Live when `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set. Otherwise the API returns 503 for `/api/auth/google/start` and the phone offers development sign-in. Development sign-in is labeled as such.

## AI

`AI_API_KEY` turns on an OpenAI-compatible chat call for insight summaries. The model must echo the server’s counts. If it invents a dollar amount when no price was stored, or the counts differ, the API discards the text and uses the deterministic summary. Onboarding questions are deterministic either way, and the stored result is a validated preference object. Narrative answers are dropped when the person refuses consent.

## SMS

`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM` make the API send the invite or approval link with Twilio. The credentials stay on the server. If they are missing, or the send fails, the response is `share` or `failed` and the phone opens the iOS Messages composer with the same link. iMessage has no open automated API, so that composer is the iMessage path.

## Notifications

When a saved purchase’s cooldown ends, the API writes an in-app notification if the person asked for one. Push delivery is not claimed without a push provider.

## What the extension cannot do

It can pause a supported checkout page in Chrome. It cannot block a native shop, a bank app, or every gambling payment. Monitoring is off when the person turns it off, and it only runs on domains they enabled.
