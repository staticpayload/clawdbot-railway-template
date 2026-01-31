# MadBull Railway Template

> Your AI gateway that never stops charging. 🐂

One-click deploy **MadBull** (powered by [OpenClaw](https://github.com/openclaw/openclaw)) on Railway with a web-based setup wizard. No terminal required.

## What you get

- **AI Gateway + Control UI** served at `/`
- **Setup Wizard** at `/setup` (password-protected, modern dark UI)
- **Persistent state** via Railway Volume — config, credentials, and memory survive redeploys
- **Backup export/import** from `/setup` for easy migration
- **Channel support** — Telegram, Discord, Slack bots configured from the browser

## Deploy

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/madbull-railway)

### Required setup

1. Click **Deploy on Railway** above
2. Add a **Volume** mounted at `/data`
3. Set these **Variables**:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SETUP_PASSWORD` | Yes | — | Password to access `/setup` |
| `PORT` | Yes | `8080` | Must match Railway's HTTP Proxy port |
| `OPENCLAW_STATE_DIR` | Recommended | `~/.openclaw` | Set to `/data/.openclaw` for persistence |
| `OPENCLAW_WORKSPACE_DIR` | Recommended | (state dir)/workspace | Set to `/data/workspace` |
| `OPENCLAW_GATEWAY_TOKEN` | Optional | Auto-generated | Admin token for the gateway |

4. Enable **Public Networking** (HTTP Proxy on port 8080)
5. Deploy, then visit `https://<your-domain>/setup`

## Getting chat tokens

### Telegram
1. Message **@BotFather** on Telegram
2. Run `/newbot` and follow the prompts
3. Copy the token (looks like `123456789:AA...`) and paste into `/setup`

### Discord
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. New Application → Bot → Add Bot
3. **Enable MESSAGE CONTENT INTENT** (Bot → Privileged Gateway Intents) or the bot will crash
4. Copy the Bot Token and paste into `/setup`
5. Invite to your server via OAuth2 URL Generator (scopes: `bot`, `applications.commands`)

### Slack
1. Create a Slack App at [api.slack.com](https://api.slack.com/apps)
2. Get both the Bot Token (`xoxb-...`) and App Token (`xapp-...`)
3. Paste into `/setup`

## Local development

```bash
docker build -t madbull-railway .

docker run --rm -p 8080:8080 \
  -e PORT=8080 \
  -e SETUP_PASSWORD=test \
  -e OPENCLAW_STATE_DIR=/data/.openclaw \
  -e OPENCLAW_WORKSPACE_DIR=/data/workspace \
  -v $(pwd)/.tmpdata:/data \
  madbull-railway

# open http://localhost:8080/setup (password: test)
```

## How it works

The container runs a wrapper Express server that:
1. Protects `/setup` with `SETUP_PASSWORD` (Basic Auth)
2. Runs `openclaw onboard --non-interactive` during setup
3. Starts the OpenClaw gateway on an internal port
4. Reverse-proxies all traffic (including WebSockets) to the gateway

After setup, `/` is your fully functional AI gateway.

## Upstream

This is a rebranded fork of [clawdbot-railway-template](https://github.com/vignesh07/clawdbot-railway-template). Upstream updates can be merged with `git fetch upstream && git merge upstream/main`.

## License

MIT
