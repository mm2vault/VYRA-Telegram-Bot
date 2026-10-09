# VYRA Telegram Bot 💜

Turkish-language VYRA community bot built with Node.js and grammY.

## Features

- Inline and quick-reply navigation menus
- Telegram command menu registered at startup
- `/start`, `/help`, `/about`, `/rules`, `/id`, and `/ping`
- New-member welcome messages
- Lightweight group flood protection (grant delete-message permission if you want it to delete flood messages)
- Admin-restricted announcements
- Admin-only AI image generation via `/image <description>`
- Admin-controlled daily automated technology, AI, digital-safety and VYRA posts
- Daily image generation with a text-only fallback if image generation temporarily fails
- Configurable daily posting time in the Asia/Baku timezone
- `/autopost_on`, `/autopost_off`, `/autopost_status`, `/autopost_time HH:MM`, `/autopost_test`
- `/health` and root health endpoints
- Graceful shutdown and automated helper tests

## Environment variables

Set these in your hosting provider's Environment/Secrets settings. Never commit tokens or API keys to GitHub.

- `TELEGRAM_BOT_TOKEN` — required; token from BotFather.
- `TELEGRAM_ADMIN_IDS` — recommended; comma-separated numeric Telegram user IDs allowed to use admin features, including image generation and schedule controls. Without this, admin commands are denied to everyone.
- `POLLINATIONS_API_KEY` — required for AI image generation; obtain a key from [Pollinations](https://enter.pollinations.ai/). The provider currently requires authentication. Check its dashboard for current free credits, usage limits and pricing; do not assume unlimited free generation.
- `POLLINATIONS_IMAGE_MODEL` — optional; defaults to `flux`.
- `AUTO_POST_TIME` — optional default posting time in 24-hour `HH:MM`, Baku time; defaults to `10:00`.
- `PORT` — optional; hosting platforms usually set this.

## Set up daily posts

1. Deploy the bot and configure the environment variables above.
2. Add the bot to your Telegram group. Give it permission to send messages and photos. Give it delete-message permission only if you want flood deletion.
3. In your target group, an admin whose Telegram numeric ID is in `TELEGRAM_ADMIN_IDS` sends `/autopost_on`. This saves that group as the target and enables daily posts.
4. Send `/autopost_time 10:30` to change the schedule to 10:30 in Baku time.
5. Send `/autopost_test` to test image generation and delivery.
6. Use `/autopost_status` to inspect the state, target chat and API-key configuration. Use `/autopost_off` to stop scheduled posts.
7. Send `/image a purple neon AI technology poster` to generate a custom image.

Daily posts rotate through a set of Turkish technology tips, AI reminders, digital-safety advice and VYRA community messages. They are not live news summaries; the scheduled copy is curated in the source code.

## Storage and hosting notes

- The bot uses Telegram long polling and must stay running for reliable 24/7 responses.
- The schedule state is saved to `data/automation-settings.json`. Hosts with ephemeral filesystems may lose this file after a redeploy or restart; if that happens, run `/autopost_on` again in the target group.
- Free hosting can sleep, restart or enforce usage limits. The scheduler checks every 15 seconds while the process is running, but no free host can guarantee that the bot is awake at the exact scheduled minute.
- Pollinations image generation needs an API key according to the provider's current docs. Free credits/limits may change; the bot reports provider errors and falls back to a text-only daily post if image generation fails.

## Local development and tests

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_IDS` and `POLLINATIONS_API_KEY` in your local environment (do not commit a `.env` file).
4. Run `npm test` to test the schedule/content helpers.
5. Run `npm start` to start the bot.

Automated tests cover the daily content helper, prompt formatting, time validation and Baku time formatting. They do not send messages to Telegram or call the external image provider; use `/autopost_test` in your group for a live integration check.
