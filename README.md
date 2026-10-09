# VYRA Telegram Bot 💜

A community bot for VYRA, built with Node.js and grammY.

## Features

- Polished Turkish welcome message with inline navigation buttons
- Persistent quick-reply keyboard for Help, About, ID and Ping
- Telegram command menu registered automatically at startup
- `/start`, `/help`, `/about`, `/rules`, `/id`, and `/ping`
- Welcome messages for new group members
- Lightweight group flood protection (delete-message permission is needed to remove messages)
- Admin-restricted `/announce` command
- `/health` and root health endpoints for hosting checks
- Graceful shutdown handling and bounded in-memory flood tracking

## Environment variables

- `TELEGRAM_BOT_TOKEN` — required; token from BotFather. Keep it secret.
- `TELEGRAM_ADMIN_IDS` — optional comma-separated Telegram numeric user IDs allowed to use `/announce`.
- `PORT` — optional; hosting platforms normally provide this automatically.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Set `TELEGRAM_BOT_TOKEN` in your environment. Never commit it to GitHub or send it in chat.
4. Run `npm start`.

## Hosting

The bot uses Telegram long polling and needs a continuously running process for reliable 24/7 responses. Check the service type and pricing before deploying; do not choose a paid plan unless you intend to pay.
