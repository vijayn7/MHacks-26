# Snuffed Onboarding Agent

![tag:innovationlab](https://img.shields.io/badge/innovationlab-3D8BD3)
![tag:hackathon](https://img.shields.io/badge/hackathon-5F43F1)

Sets you up with Snuffed, an opt-in shopping pause tool, entirely inside a chat. Tell it what you tend to impulse-buy and it:

1. Turns your words into a spending rule (Gemini parses it into structured settings).
2. Shows you the settings and saves them to your account only after you confirm. The Chrome extension starts enforcing the rule right away.
3. Sends you to [snuffed.tech](https://snuffed.tech) to download the Chrome extension and the phone companion app, with install steps.
4. Reads back the live rule to confirm setup worked.

A trusted friend can be pinged over iMessage during a pause for support. The friend never approves or blocks a purchase.

Try: "I keep buying stuff on Amazon late at night. Help me set up Snuffed."

- Name: `snuffed-onboarding`
- Address: `agent1qwd7ye702w6vhl7r7j6gmlu7n42cxyxl2tjf0gs5z8qvf5mqrw5xszpsku8`
- Protocol: Agent Chat Protocol
- Source: https://github.com/vijayn7/MHacks-26/tree/main/apps/agent

## Run it

Python 3.10 to 3.13. From the repo root:

```bash
npm install && npm run dev:api          # Snuffed API on :8787
cd apps/agent
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python agent.py
```

Repo-root `.env` needs `AGENT_SEED` (any long secret string, fixes the agent address), `ASI_ONE_API_KEY` (from https://asi1.ai/dashboard/api-keys), and the API's `GEMINI_API_KEY` and `DATABASE_URL`. Optional: `SNUFFED_API` (default `http://localhost:8787`) and `AGENT_PORT` (default `8001`).

On first run, open the Agent inspector link from the log, click Connect, choose Mailbox, then Finish. The agent then appears on Agentverse and can be found through ASI:One.

## Tools

| Tool | Action |
| --- | --- |
| `parse_rule` | `POST /rules/parse`, Gemini turns rule text into settings |
| `save_rule` | `POST /rules/confirm`, saves to Neon, extension picks it up |
| `get_active_rule` | `GET /rules/active`, verifies the live rule |
| `get_install_steps` | snuffed.tech download and install steps for `chrome` or `phone` |

The ASI:One `asi1` model plans the conversation and picks the tools.
