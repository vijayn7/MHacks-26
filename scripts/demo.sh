#!/usr/bin/env bash
# Drives a whole account through the running API: onboarding, extension pairing,
# a checkout intervention, a trusted-contact approval, and a challenge.
# Usage: pnpm dev:web in one shell, then bash scripts/demo.sh
set -euo pipefail
API="${API:-http://localhost:3000}"
j() { python3 -c 'import sys,json;d=json.load(sys.stdin);
import functools
p=sys.argv[1].split(".")
for k in p:
  d=d[int(k)] if k.isdigit() else d[k]
print(d)' "$1"; }
post() { curl -sf -X POST "$API/api/$1" -H 'content-type: application/json' ${TOKEN:+-H "authorization: Bearer $TOKEN"} -d "${2:-{\}}"; }
get()  { curl -sf "$API/api/$1" ${TOKEN:+-H "authorization: Bearer $TOKEN"}; }
step() { printf '\n\033[1m== %s\033[0m\n' "$1"; }

step 'health'
get health

step 'sign in'
TOKEN=''
me=$(post auth/dev '{"displayName":"Demo Owner","email":"demo@example.com"}')
TOKEN=$(echo "$me" | j token); USER=$(echo "$me" | j userId)
echo "user $USER"

step 'onboarding'
post onboarding '{"message":"I keep buying sneakers late at night when I am bored"}' | head -c 400; echo
post onboarding/finish '{"categories":["shopping"],"triggers":["late night","boredom"],"goals":["save for rent"],"recommendedLevel":"medium","chosenLevel":"high","wantsTrustedContact":true,"consentToStore":true}' | head -c 300; echo

step 'pair the extension'
code=$(post extension/pair-code | j code)
ext=$(curl -sf -X POST "$API/api/extension/pair" -H 'content-type: application/json' -d "{\"code\":\"$code\",\"deviceLabel\":\"Chrome on this laptop\"}")
EXT=$(echo "$ext" | j token)
curl -sf "$API/api/extension/bootstrap" -H "authorization: Bearer $EXT" | head -c 400; echo

step 'checkout intervention: save for later'
post interventions '{"idempotencyKey":"demo-checkout-0001","url":"https://www.amazon.com/gp/cart/checkout","itemName":"Running shoes","amountCents":14900,"decision":"save","reflectionCompleted":true}' | head -c 400; echo
step 'the same event replayed is ignored'
post interventions '{"idempotencyKey":"demo-checkout-0001","url":"https://www.amazon.com/gp/cart/checkout","itemName":"Running shoes","amountCents":14900,"decision":"save","reflectionCompleted":true}' | head -c 200; echo

step 'a second checkout, dropped'
post interventions '{"idempotencyKey":"demo-checkout-0002","url":"https://www.bestbuy.com/checkout/r/payment","itemName":"Headphones","amountCents":24900,"decision":"drop","reflectionCompleted":true}' | head -c 300; echo

step 'trusted contact and an approval request'
contact=$(post trusted '{"displayName":"Sam (trusted)","phone":"+15555550123"}')
echo "$contact" | head -c 400; echo
CID=$(echo "$contact" | j id)
TRUST_URL=$(echo "$contact" | j url)
echo "Sam opens $TRUST_URL and accepts — no account needed"
curl -sf -X POST "$API/api/trusted/accept" -H 'content-type: application/json' -d "{\"token\":\"${TRUST_URL##*/}\"}" | head -c 200; echo

iv=$(post interventions '{"idempotencyKey":"demo-checkout-0003","url":"https://www.amazon.com/gp/buy/checkout","itemName":"Monitor","amountCents":32900,"decision":"continue","reflectionCompleted":true,"shareDetails":true}')
echo "$iv" | head -c 300; echo
IID=$(echo "$iv" | j interventionId)
ap=$(post approvals "{\"interventionId\":\"$IID\",\"contactId\":\"$CID\"}")
echo "$ap" | head -c 500; echo
LINK=$(echo "$ap" | j url)
APID=$(echo "$ap" | j id)
echo "approval link: $LINK"

step 'the trusted contact approves (no account, no login)'
ATOK="${LINK##*/}"
curl -sf -X POST "$API/api/approvals/preview" -H 'content-type: application/json' -d "{\"token\":\"$ATOK\"}" | head -c 300; echo
curl -sf -X POST "$API/api/approvals/respond" -H 'content-type: application/json' -d "{\"token\":\"$ATOK\",\"decision\":\"approve\"}" | head -c 300; echo
step 'the same link cannot be replayed'
curl -s -X POST "$API/api/approvals/respond" -H 'content-type: application/json' -d "{\"token\":\"$ATOK\",\"decision\":\"decline\"}" | head -c 200; echo

step 'challenge'
post challenges '{"title":"Sleep on it","goalType":"defer","goalCount":3,"days":7}' | head -c 300; echo

step 'home (what the phone shows)'
get home | python3 -m json.tool | head -40

step 'saved for later'
get saved | head -c 500; echo

step 'insights'
get insights | head -c 600; echo

step 'change feed'
rev=$(get changes | j revision)
echo "revision $rev — clients long-poll /api/changes?revision=$rev and only refetch when it moves"

step 'another account cannot read this one'
other=$(post auth/dev '{"displayName":"Stranger"}')
OT=$(echo "$other" | j token)
curl -s -o /dev/null -w 'stranger reading this approval: HTTP %{http_code}\n' "$API/api/approvals/$APID" -H "authorization: Bearer $OT"
