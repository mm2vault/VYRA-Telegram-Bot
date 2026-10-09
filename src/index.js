require("dotenv").config();
const express = require("express");
const { Bot, InlineKeyboard } = require("grammy");

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("Missing TELEGRAM_BOT_TOKEN environment variable.");
  process.exit(1);
}

const bot = new Bot(token);
const app = express();
const port = Number(process.env.PORT || 3000);
const adminIds = new Set(
  (process.env.TELEGRAM_ADMIN_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);
const recentMessages = new Map();

const menuKeyboard = new InlineKeyboard()
  .text("📚 Komutlar", "menu:help")
  .text("💜 VYRA hakkında", "menu:about")
  .row()
  .text("🆔 Kimliğim", "menu:id")
  .text("🛡️ Topluluk kuralları", "menu:rules");

const homeKeyboard = {
  reply_markup: {
    keyboard: [[{ text: "📚 Yardım" }, { text: "💜 Hakkımızda" }], [{ text: "🆔 Kimliğim" }, { text: "⚡ Ping" }]],
    resize_keyboard: true,
    is_persistent: true
  }
};

const commandList = [
  { command: "start", description: "VYRA ana menüsünü aç" },
  { command: "help", description: "Komutları ve özellikleri gör" },
  { command: "about", description: "VYRA hakkında bilgi" },
  { command: "rules", description: "Topluluk kurallarını gör" },
  { command: "id", description: "Telegram kullanıcı ve sohbet kimliğini gör" },
  { command: "ping", description: "Bot bağlantısını kontrol et" },
  { command: "announce", description: "Yönetici duyurusu gönder" }
];

app.get("/", (_req, res) => res.status(200).send("💜 VYRA Telegram Bot is running."));
app.get("/health", (_req, res) => res.status(200).json({ ok: true, bot: "VYRA Telegram Bot" }));
app.listen(port, "0.0.0.0", () => console.log("Health server listening on " + port));

bot.command("start", async (ctx) => {
  const firstName = ctx.from?.first_name || "dostum";
  const message =
    "💜 VYRA'ya hoş geldin, " + firstName + "!\n\n" +
    "✦ Topluluğun mor neon merkezi.\n" +
    "✦ Komutlara aşağıdaki menüden ulaşabilirsin.\n\n" +
    "Hazırsan başlayalım. ⚡";
  await ctx.reply(message, { reply_markup: menuKeyboard });
  await ctx.reply("Hızlı menü de burada 👇", homeKeyboard);
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    "📚 VYRA • KOMUT MERKEZİ\n\n" +
    "/start — Ana menüyü aç\n" +
    "/help — Bu yardım ekranı\n" +
    "/about — VYRA hakkında\n" +
    "/rules — Topluluk kuralları\n" +
    "/id — Kullanıcı ve sohbet kimliğin\n" +
    "/ping — Bot bağlantısını test et\n\n" +
    "🛡️ Yönetici: /announce mesajın\n" +
    "Düğmeleri kullanarak da menüler arasında gezebilirsin.",
    { reply_markup: menuKeyboard }
  );
});

bot.command("about", async (ctx) => {
  await ctx.reply(
    "💜 VYRA HAKKINDA\n\n" +
    "VYRA; teknoloji, topluluk ve mor neon enerjisini bir araya getiren bağımsız bir projedir.\n\n" +
    "⚡ Sade. Hızlı. Topluluk odaklı.\n" +
    "Bir sorunla karşılaşırsan yöneticilere haber ver."
  );
});

bot.command("rules", async (ctx) => {
  await ctx.reply(
    "🛡️ VYRA TOPLULUK KURALLARI\n\n" +
    "1. Herkese saygılı davran.\n" +
    "2. Spam, flood ve istenmeyen reklam yapma.\n" +
    "3. Kişisel bilgilerini veya gizli anahtarlarını paylaşma.\n" +
    "4. Zararlı bağlantılara ve şüpheli dosyalara dikkat et.\n" +
    "5. Yönetici kararlarına ve Telegram kurallarına uy.\n\n" +
    "💜 Birlikte daha iyi bir topluluk oluşturabiliriz."
  );
});

bot.command("id", async (ctx) => {
  await ctx.reply(
    "🆔 VYRA • HESAP BİLGİLERİ\n\n" +
    "Kullanıcı ID: " + (ctx.from?.id ?? "bilinmiyor") + "\n" +
    "Sohbet ID: " + (ctx.chat?.id ?? "bilinmiyor") + "\n\n" +
    "Bu numaraları yalnızca gerektiğinde güvenilir yöneticilerle paylaş."
  );
});

bot.command("ping", async (ctx) => {
  await ctx.reply("⚡ VYRA bağlantısı aktif!\n💜 Bot yanıt veriyor.");
});

bot.hears("📚 Yardım", (ctx) => ctx.reply("📚 Komutlar için /help yaz.", { reply_markup: menuKeyboard }));
bot.hears("💜 Hakkımızda", (ctx) => ctx.reply("💜 VYRA hakkında bilgi için /about yaz."));
bot.hears("🆔 Kimliğim", (ctx) => ctx.reply("🆔 Kullanıcı ID: " + (ctx.from?.id ?? "bilinmiyor") + "\nSohbet ID: " + (ctx.chat?.id ?? "bilinmiyor")));
bot.hears("⚡ Ping", (ctx) => ctx.reply("⚡ VYRA bağlantısı aktif!"));

bot.callbackQuery("menu:help", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("📚 Komutlar\n\n/start — Ana menü\n/help — Yardım\n/about — VYRA hakkında\n/rules — Kurallar\n/id — Kimlik bilgileri\n/ping — Bağlantı testi");
});
bot.callbackQuery("menu:about", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("💜 VYRA; teknoloji ve topluluğu mor neon enerjisiyle birleştiren bağımsız bir projedir. ⚡");
});
bot.callbackQuery("menu:id", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("🆔 Kullanıcı ID: " + (ctx.from?.id ?? "bilinmiyor") + "\nSohbet ID: " + (ctx.chat?.id ?? "bilinmiyor"));
});
bot.callbackQuery("menu:rules", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("🛡️ Saygılı ol, spam yapma, gizli bilgilerini paylaşma ve şüpheli bağlantılara dikkat et. 💜");
});

bot.command("announce", async (ctx) => {
  if (!adminIds.has(String(ctx.from?.id))) {
    return ctx.reply("⛔ Bu komut yalnızca yetkili VYRA yöneticileri içindir.");
  }
  const announcement = ctx.match?.trim();
  if (!announcement) return ctx.reply("Kullanım: /announce Duyuru metni");
  await ctx.reply("📢 VYRA DUYURUSU\n\n" + announcement);
});

bot.on("message:new_chat_members", async (ctx) => {
  const names = ctx.message.new_chat_members.map((member) => member.first_name).join(", ");
  await ctx.reply(
    "💜 VYRA topluluğuna hoş geldin, " + names + "!\n\n" +
    "Kurallara göz atmak için /rules yaz. Keyifli vakit geçir! ⚡"
  );
});

// Lightweight flood protection for groups. The bot needs delete-message permission to remove messages.
bot.on("message", async (ctx, next) => {
  const message = ctx.message;
  if (!message || message.new_chat_members || message.from?.is_bot || ctx.chat.type === "private") return next();

  const key = ctx.chat.id + ":" + (ctx.from?.id ?? "unknown");
  const now = Date.now();
  const previous = recentMessages.get(key) || [];
  const fresh = previous.filter((timestamp) => now - timestamp < 5000);
  fresh.push(now);
  recentMessages.set(key, fresh);

  // Keep the in-memory map bounded in long-running processes.
  if (recentMessages.size > 5000) {
    for (const [storedKey, timestamps] of recentMessages) {
      if (!timestamps.length || now - timestamps[timestamps.length - 1] > 60000) recentMessages.delete(storedKey);
      if (recentMessages.size <= 4000) break;
    }
  }

  if (fresh.length > 7) {
    try { await ctx.deleteMessage(); } catch (_) {}
    return;
  }
  return next();
});

bot.catch((error) => console.error("Telegram bot error:", error.message || error));

(async () => {
  try {
    await bot.api.setMyCommands(commandList);
  } catch (error) {
    console.warn("Could not set Telegram command menu:", error.message || error);
  }

  try {
    await bot.start({
      onStart: (info) => console.log("VYRA Telegram Bot started as @" + info.username)
    });
  } catch (error) {
    console.error("Failed to start Telegram bot:", error);
    process.exit(1);
  }
})();

async function shutdown(signal) {
  console.log(signal + " received, stopping bot...");
  try { await bot.stop(); } catch (_) {}
  process.exit(0);
}
process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
