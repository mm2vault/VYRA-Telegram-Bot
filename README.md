# VYRA Telegram Bot 💜

A Node.js Telegram bot for the VYRA community.

## Features
- `/start`, `/help`, `/about`, and `/id`
- Welcome messages for new group members
- Basic group flood protection (the bot needs permission to delete messages)
- Admin-only `/announce` command
- Health endpoint at `/health`

## Environment variables
- `TELEGRAM_BOT_TOKEN` — required; token from BotFather. Keep it secret.
- `TELEGRAM_ADMIN_IDS` — optional comma-separated Telegram user IDs allowed to use announcements.
- `PORT` — optional; hosting platforms normally provide this automatically.

## Run locally
1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Set `TELEGRAM_BOT_TOKEN` in your environment. Do not commit it to GitHub.
4. Run `npm start`.

## Hosting note
The bot currently uses Telegram long polling. It needs a continuously running process. A web service that sleeps when idle may stop responding until it wakes, so confirm the selected Render service type and plan before relying on it for 24/7 operation.
