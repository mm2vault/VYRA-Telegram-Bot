require("dotenv").config();
const express = require("express");
const { Bot } = require("grammy");

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("Missing TELEGRAM_BOT_TOKEN environment variable.");
  process.exit(1);
}

const bot = new Bot(token);
const app = express();
const port = Number(process.env.PORT || 3000);
const adminIds = new Set((process.env.TELEGRAM_ADMIN_IDS || "")
  .split(",").map(v => v.trim()).filter(Boolean));
const recentMessages = new Map();

app.get("/", (_req, res) => res.status(200).send("VYRA Telegram Bot is running."));
app.get("/health", (_req, res) => res.status(200).json({ ok: true, bot: "VYRA Telegram Bot" }));
app.listen(port, "0.0.0.0", () => console.log(`Health server listening on ${port}`));

bot.command("start", async (ctx) => {
  const firstName = ctx.from?.first_name || "friend";
  await ctx.reply(
    `💜 Welcome to VYRA, ${firstName}!\n\n✨ Your purple-neon community bot is online.\n\n/help — see commands\n/about — learn about VYRA`,
    { reply_markup: { keyboard: [[{ text: "/help" }, { text: "/about" }]], resize_keyboard: true } }
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    "💜 VYRA BOT — Commands\n\n/start — Start the bot\n/help — Show help\n/about — About VYRA\n/id — Show your Telegram ID\n\nGroup admins can use /announce followed by a message."
  );
});

bot.command("about", (ctx) => ctx.reply("💜 VYRA is a community project built with a purple-neon spirit. Thanks for being here!"));
bot.command("id", (ctx) => ctx.reply(`Your Telegram ID: ${ctx.from?.id ?? "unknown"}\nChat ID: ${ctx.chat?.id ?? "unknown"}`));

bot.command("announce", async (ctx) => {
  if (!adminIds.has(String(ctx.from?.id))) {
    return ctx.reply("⛔ This command is reserved for VYRA admins.");
  }
  const text = ctx.match?.trim();
  if (!text) return ctx.reply("Usage: /announce Your announcement");
  await ctx.api.sendMessage(ctx.chat.id, `📢 VYRA ANNOUNCEMENT\n\n${text}`);
});

bot.on("message:new_chat_members", async (ctx) => {
  const names = ctx.message.new_chat_members.map((m) => m.first_name).join(", ");
  await ctx.reply(`💜 Welcome to the VYRA community, ${names}! Please be respectful and enjoy your stay.`);
});

// Lightweight per-user flood protection. It deletes repeated rapid messages only when the bot has permission.
bot.on("message", async (ctx, next) => {
  const message = ctx.message;
  if (!message || message.new_chat_members || message.from?.is_bot) return next();
  const key = `${ctx.chat.id}:${ctx.from?.id}`;
  const now = Date.now();
  const previous = recentMessages.get(key) || [];
  const fresh = previous.filter((time) => now - time < 5000);
  fresh.push(now);
  recentMessages.set(key, fresh);
  if (fresh.length > 7 && ctx.chat.type !== "private") {
    try { await ctx.deleteMessage(); } catch (_) {}
    return;
  }
  return next();
});

bot.catch((err) => console.error("Telegram bot error:", err.message || err));

(async () => {
  try {
    await bot.start({ onStart: (info) => console.log(`VYRA Telegram Bot started as @${info.username}`) });
  } catch (error) {
    console.error("Failed to start Telegram bot:", error);
    process.exit(1);
  }
})();

async function shutdown(signal) {
  console.log(`${signal} received, stopping bot...`);
  try { await bot.stop(); } catch (_) {}
  process.exit(0);
}
process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
