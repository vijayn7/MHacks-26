import asyncio
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import certifi

# python.org / uv Pythons on macOS ship without CA certs, which breaks the Agentverse mailbox.
os.environ.setdefault("SSL_CERT_FILE", certifi.where())

import requests
from uagents import Agent, Context, Protocol
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    EndSessionContent,
    TextContent,
    chat_protocol_spec,
)

HERE = Path(__file__).resolve().parent
env_file = HERE.parents[1] / ".env"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        key, sep, value = line.strip().partition("=")
        if sep and not key.startswith("#"):
            os.environ.setdefault(key.strip(), value.strip().strip("'\""))

API = os.environ.get("SNUFFED_API", "http://localhost:8787").rstrip("/")
ASI_KEY = os.environ.get("ASI_ONE_API_KEY", "")
REPO = "https://github.com/vijayn7/MHacks-26"
SITE = "https://snuffed.tech"

INSTALL = {
    "chrome": {
        "title": "Snuffed Chrome extension",
        "download": SITE,
        "steps": [
            f"On your computer, open {SITE} in Chrome and click \"download chrome extension\".",
            "Unzip the downloaded snuffed-chrome.zip.",
            "Open chrome://extensions, turn on Developer mode, click Load unpacked, and pick the unzipped folder.",
            "Visit a checkout over your limit. Snuffed holds the order and offers Drop, Save for later, Continue, or Ask my friend.",
        ],
    },
    "phone": {
        "title": "Snuffed phone app (iOS and Android)",
        "download": SITE,
        "steps": [
            f"On your phone, open {SITE} and tap \"download mobile\".",
            "Follow the install steps on that page for iOS or Android.",
            "Open the app. When Chrome pauses a checkout, the app shows the same pause so you can decide from your phone.",
        ],
    },
}

SYSTEM = f"""You are the Snuffed onboarding agent. Snuffed is an opt-in shopping pause tool:
the shopper writes their own spending rule, a Chrome extension holds matching checkouts for a cooling-off
moment, and the shopper can optionally ask a trusted friend for support over iMessage. The friend never
approves or vetoes a purchase; only the shopper decides.

Your job is to take a new user from "I want to stop impulse buying" to a saved rule and installed extension/app.
Work through these steps, one short message at a time:
1. Learn what trips them up: which stores, what dollar amount, what times of day, how long a pause should last.
2. Turn their words into one rule sentence and call parse_rule. Show the proposed settings in plain words
   (amount, pause minutes, stores, schedule) and ask them to confirm or edit.
3. Only after they explicitly say yes, call save_rule. Use cooldownMinutes from the proposal as pauseMinutes;
   if it is missing, ask them (suggest 15). If minAmount is missing, ask them for one.
   If parse_rule fails, extract the amount and minutes yourself, confirm with the user, then call save_rule.
   save_rule saves the amount and pause length. The extension enforces them at all hours on the stores already
   in their plan (call get_active_rule for its domains). When you ask for confirmation, say exactly that; do not
   promise that a schedule or a new store will be enforced.
4. Ask whether they shop on desktop Chrome, their phone, or both, then call get_install_steps for each and walk
   them through it. Always send them to {SITE} to download; never tell shoppers to clone the repo or run npm.
5. Call get_active_rule to verify the saved rule is live and tell them what will happen at their next checkout.

Rules: never call save_rule without explicit confirmation. Never judge a purchase or make mental-health claims.
Friends only see a generic check-in by default; no item, price, or store is shared unless the shopper chooses.
If a tool returns an error, say what failed in one line and offer the next best step. Keep replies short.
Source code and docs: {REPO}"""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "parse_rule",
            "description": "Convert the shopper's plain-language spending rule into proposed structured settings (via Gemini). Does not save anything.",
            "parameters": {
                "type": "object",
                "properties": {"text": {"type": "string", "description": "The rule in the shopper's words, e.g. 'pause anything over $50 on amazon after 9pm for 20 minutes'."}},
                "required": ["text"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "save_rule",
            "description": "Save the confirmed rule to the shopper's Snuffed account. The Chrome extension starts enforcing it immediately. Only call after the shopper explicitly confirms.",
            "parameters": {
                "type": "object",
                "properties": {
                    "minAmount": {"type": "number", "description": "Pause checkouts at or above this dollar amount."},
                    "pauseMinutes": {"type": "integer", "description": "Length of the cooling-off pause in minutes."},
                    "summary": {"type": "string", "description": "One-sentence restatement of the rule."},
                },
                "required": ["minAmount", "pauseMinutes", "summary"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_active_rule",
            "description": "Read the rule the extension is currently enforcing, to verify setup.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_install_steps",
            "description": "Get the download link and install steps for a Snuffed surface.",
            "parameters": {
                "type": "object",
                "properties": {"surface": {"type": "string", "enum": list(INSTALL)}},
                "required": ["surface"],
            },
        },
    },
]


def call_api(method: str, path: str, body: dict | None = None) -> dict:
    try:
        res = requests.request(method, API + path, json=body, timeout=40)
    except requests.RequestException:
        return {"error": "Snuffed API is unreachable"}
    try:
        data = res.json()
    except ValueError:
        data = {}
    if not res.ok:
        return {"error": data.get("error", f"http_{res.status_code}")}
    return data


def run_tool(name: str, args: dict) -> dict:
    if name == "parse_rule":
        return call_api("POST", "/rules/parse", {"text": args["text"]})
    if name == "save_rule":
        return call_api("POST", "/rules/confirm", {
            "minAmount": float(args["minAmount"]),
            "pauseMinutes": int(args["pauseMinutes"]),
            "summary": args["summary"],
        })
    if name == "get_active_rule":
        return call_api("GET", "/rules/active")
    if name == "get_install_steps":
        return INSTALL.get(args.get("surface"), {"error": f"surfaces: {', '.join(INSTALL)}"})
    return {"error": f"unknown tool {name}"}


def think(history: list[dict]) -> str:
    for _ in range(8):
        res = requests.post(
            "https://api.asi1.ai/v1/chat/completions",
            headers={"Authorization": f"Bearer {ASI_KEY}"},
            json={"model": "asi1", "messages": [{"role": "system", "content": SYSTEM}, *history], "tools": TOOLS},
            timeout=90,
        )
        res.raise_for_status()
        msg = res.json()["choices"][0]["message"]
        calls = msg.get("tool_calls") or []
        history.append({"role": "assistant", "content": msg.get("content") or "", **({"tool_calls": calls} if calls else {})})
        if not calls:
            return msg.get("content") or "Done."
        for call in calls:
            try:
                result = run_tool(call["function"]["name"], json.loads(call["function"]["arguments"] or "{}"))
            except Exception as error:
                result = {"error": str(error)}
            history.append({"role": "tool", "tool_call_id": call["id"], "content": json.dumps(result)})
    return "That took more steps than expected. Tell me where you are and I'll pick up from there."


def text_message(text: str) -> ChatMessage:
    return ChatMessage(timestamp=datetime.now(timezone.utc), msg_id=uuid4(), content=[TextContent(type="text", text=text)])


agent = Agent(
    name="snuffed-onboarding",
    seed=os.environ["AGENT_SEED"],
    port=int(os.environ.get("AGENT_PORT", "8001")),
    mailbox=True,
    publish_agent_details=True,
    readme_path=str(HERE / "README.md"),
)
chat = Protocol(spec=chat_protocol_spec)
# ponytail: in-memory per-sender history, unbounded; move to ctx.storage with trimming if the agent stays up long-term
sessions: dict[str, list[dict]] = {}


@chat.on_message(ChatMessage)
async def on_chat(ctx: Context, sender: str, msg: ChatMessage):
    await ctx.send(sender, ChatAcknowledgement(timestamp=datetime.now(timezone.utc), acknowledged_msg_id=msg.msg_id))
    if any(isinstance(item, EndSessionContent) for item in msg.content):
        sessions.pop(sender, None)
    text = " ".join(item.text for item in msg.content if isinstance(item, TextContent)).strip()
    if not text:
        return
    history = sessions.setdefault(sender, [])
    history.append({"role": "user", "content": text})
    try:
        reply = await asyncio.to_thread(think, history)
    except Exception:
        ctx.logger.exception("think failed")
        reply = "I hit a snag reaching my planner. Send that again in a moment."
    await ctx.send(sender, text_message(reply))


@chat.on_message(ChatAcknowledgement)
async def on_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    pass


agent.include(chat, publish_manifest=True)

if __name__ == "__main__":
    agent.run()
