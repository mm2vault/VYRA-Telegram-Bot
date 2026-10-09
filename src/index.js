require("dotenv").config();
const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const { Bot, InlineKeyboard } = require("grammy");
const { getDailyContent, isValidTime, getBakuDateTime } = require("./automation");
const { generatePost, answerCommunityQuestion } = require("./ai");

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
const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
const settingsPath = path.join(dataDir, "automation-settings.json");
const defaultSettings = {
  enabled: false,
  chatId: null,
  targetTitle: null,
  times: (process.env.AUTO_POST_TIMES || "10:00,15:00,20:00").split(",").map((value) => value.trim()).filter(isValidTime).slice(0, 3),
  lastPostedDate: null,
  lastPostedSlots: {}
};
let settings = { ...defaultSettings };
let postingNow = false;
const aiCooldowns = new Map();
const contentTopics = ["Yapay zekâ", "Dijital güvenlik", "Teknoloji ipucu", "Verimlilik", "VYRA topluluğu", "Dijital üretkenlik", "Güvenli internet"];

function isConfiguredAdmin(ctx) {
  return Boolean(ctx.from?.id && adminIds.has(String(ctx.from.id)));
}

async function requireAdmin(ctx) {
  // Explicitly configured owners are allowed in private chats and groups.
  if (isConfiguredAdmin(ctx)) return true;

  // In groups, also trust Telegram's native creator/administrator role.
  // Telegram has no group-admin role in a private chat, so private commands
  // still require the user's numeric ID in TELEGRAM_ADMIN_IDS.
  if (ctx.chat && ctx.chat.type !== "private" && ctx.from?.id) {
    try {
      const member = await bot.api.getChatMember(ctx.chat.id, ctx.from.id);
      if (member.status === "creator" || member.status === "administrator") return true;
    } catch (error) {
      console.warn("Could not verify Telegram group admin status:", error.message || error);
    }
  }

  await ctx.reply(
    "⛔ Yönetici yetkin doğrulanamadı. Komutu grupta dene; özel sohbette kullanmak için hosting Environment bölümündeki TELEGRAM_ADMIN_IDS değişkenine Telegram kullanıcı ID'ni ekle."
  );
  return false;
}

function loadSettings() {
  try {
    const saved = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    settings = {
      ...defaultSettings,
      ...saved,
      times: Array.isArray(saved.times) && saved.times.length ? saved.times.slice(0, 3).filter(isValidTime) : (isValidTime(saved.time) ? [saved.time, "15:00", "20:00"] : [...defaultSettings.times]),
      lastPostedSlots: saved.lastPostedSlots && typeof saved.lastPostedSlots === "object" ? saved.lastPostedSlots : {}
    };
  } catch (_) {
    settings = { ...defaultSettings };
  }
}

function saveSettings() {
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), { mode: 0o600 });
}

const mediaLibraryPath = path.join(dataDir, "media-library.json");
let mediaLibrary = { nextIndex: 0, items: [] };

function loadMediaLibrary() {
  try {
    const saved = JSON.parse(fs.readFileSync(mediaLibraryPath, "utf8"));
    mediaLibrary = {
      nextIndex: Number.isInteger(saved.nextIndex) && saved.nextIndex >= 0 ? saved.nextIndex : 0,
      items: Array.isArray(saved.items) ? saved.items.filter((item) => item && typeof item.fileId === "string") : []
    };
  } catch (_) {
    mediaLibrary = { nextIndex: 0, items: [] };
  }
}

function saveMediaLibrary() {
  fs.mkdirSync(path.dirname(mediaLibraryPath), { recursive: true });
  fs.writeFileSync(mediaLibraryPath, JSON.stringify(mediaLibrary, null, 2), { mode: 0o600 });
}

async function sendDailyPost(chatId, slotNumber = 1) {
  const current = getBakuDateTime();
  const fallback = getDailyContent(new Date(Date.now() + (Math.max(1, slotNumber) - 1) * 86400000));
  const topic = contentTopics[(Math.max(1, slotNumber) - 1 + Math.floor(Date.now() / 86400000)) % contentTopics.length];
  let caption = fallback.caption.replace(/\*\*/g, "");
  let aiGenerated = false;
  if (process.env.GEMINI_API_KEY) {
    try { caption = await generatePost(topic, current.date, slotNumber); aiGenerated = true; }
    catch (error) { console.warn("AI post generation failed; using prepared caption:", error.message || error); }
  }
  if (mediaLibrary.items.length) {
    const index = mediaLibrary.nextIndex % mediaLibrary.items.length;
    const media = mediaLibrary.items[index];
    mediaLibrary.nextIndex = (index + 1) % mediaLibrary.items.length;
    saveMediaLibrary();
    await bot.api.sendPhoto(chatId, media.fileId, { caption: caption.slice(0, 1000) });
    return { image: true, topic, aiGenerated };
  }
  await bot.api.sendMessage(chatId, caption + "\n\n🖼️ Görsel havuzu boş. Bota özel mesajdan fotoğraf göndererek paylaşım havuzuna ekleyebilirsin.");
  return { image: false, topic, aiGenerated };
}

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
  { command: "image", description: "Yönetici: havuzdaki sıradaki resmi paylaş" },
  { command: "autopost_target", description: "Yönetici: hedef kanal seç, ör. /autopost_target @kanal" },
  { command: "media_status", description: "Yönetici: kayıtlı görsel sayısını gör" },
  { command: "autopost_on", description: "Yönetici: günlük paylaşımı aç ve bu grubu seç" },
  { command: "autopost_off", description: "Yönetici: günlük paylaşımı durdur" },
  { command: "autopost_status", description: "Yönetici: paylaşım durumunu gör" },
  { command: "autopost_time", description: "Yönetici: gönderi saatini ayarla" },
  { command: "autopost_times", description: "Yönetici: üç günlük paylaşım saatini gör" },
  { command: "ai_status", description: "Yönetici: AI bağlantı ayarını gör" },
  { command: "autopost_test", description: "Yönetici: test paylaşımı gönder" },
  { command: "announce", description: "Yönetici duyurusu gönder" }
];

app.get("/", (_req, res) => res.status(200).send("💜 VYRA Telegram Bot is running."));
app.get("/health", (_req, res) => res.status(200).json({ ok: true, bot: "VYRA Telegram Bot", automation: settings.enabled ? "enabled" : "disabled" }));
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
    "/start — Ana menü\n/help — Yardım\n/about — VYRA hakkında\n/rules — Kurallar\n/id — Kimlik bilgileri\n/ping — Bağlantı testi\n\n" +
    "🖼️ /image — Havuzdaki sıradaki resmi paylaş\n" +
    "/autopost_target @kanal — Hedef kanalı seç\n/media_status — Görsel havuzunu gör\n" +
    "📅 /autopost_on — Bu grupta günlük paylaşımı aç\n" +
    "/autopost_off — Otomatik paylaşımı durdur\n" +
    "/autopost_status — Durumu kontrol et\n" +
    "/autopost_time 10:30 — 1. saati ayarla\n/autopost_time 2 15:00 — 2. saati ayarla\n/autopost_times — Üç saati gör\n/ai_status — AI ayarı\n" +
    "/autopost_test — Test paylaşımı gönder\n\n" +
    "🛡️ Yönetici: /announce mesajın",
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
    "1. Herkese saygılı davran.\n2. Spam, flood ve istenmeyen reklam yapma.\n" +
    "3. Kişisel bilgilerini veya gizli anahtarlarını paylaşma.\n4. Zararlı bağlantılara ve şüpheli dosyalara dikkat et.\n" +
    "5. Yönetici kararlarına ve Telegram kurallarına uy.\n\n💜 Birlikte daha iyi bir topluluk oluşturabiliriz."
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

bot.command("image", async (ctx) => {
  if (!(await requireAdmin(ctx))) return;
  if (!mediaLibrary.items.length) {
    return ctx.reply("🖼️ Görsel havuzu henüz boş. Bana özel sohbetten fotoğraf gönder; ardından /image ile sıradaki resmi paylaşabilirsin.");
  }
  try {
    const result = await sendDailyPost(ctx.chat.id);
    await ctx.reply("✅ Havuzdaki görsel ve VYRA metni paylaşıldı. Konu: " + result.topic);
  } catch (error) {
    console.error("Manual media post failed:", error.message || error);
    await ctx.reply("❌ Görsel gönderilemedi: " + (error.message || "Bilinmeyen hata"));
  }
});

bot.command("autopost_target", async (ctx) => {
  if (!(await requireAdmin(ctx))) return;
  const target = String(ctx.match || "").trim();
  if (!target) return ctx.reply("Kullanım: /autopost_target @kanal_kullaniciadi\nBotu kanalda yönetici yapıp bu komutu özel sohbetinde gönder.");
  try {
    const chat = await bot.api.getChat(target);
    const member = await bot.api.getChatMember(chat.id, bot.botInfo.id);
    if (member.status !== "administrator" && member.status !== "creator") {
      return ctx.reply("⛔ Bot bu kanalda yönetici değil. Önce botu kanala ekleyip gönderi paylaşma yetkisi ver.");
    }
    settings.chatId = chat.id;
    settings.targetTitle = chat.title || chat.username || String(chat.id);
    saveSettings();
    await ctx.reply("📢 Hedef kanal seçildi: " + settings.targetTitle + "\nŞimdi /autopost_on ile otomatik paylaşımı açabilirsin.");
  } catch (error) {
    await ctx.reply("❌ Kanal bulunamadı veya botun erişimi yok. @kanal_kullaniciadi doğru mu ve bot kanalda yönetici mi?\n" + (error.message || ""));
  }
});

bot.command("media_status", async (ctx) => {
  if (!(await requireAdmin(ctx))) return;
  await ctx.reply("🖼️ VYRA görsel havuzu\n\nKayıtlı fotoğraf: " + mediaLibrary.items.length + "\nHedef: " + (settings.targetTitle || settings.chatId || "seçilmedi") + "\n\nYeni fotoğraf eklemek için bota özel mesajdan fotoğraf gönder.");
});

bot.on("message:photo", async (ctx, next) => {
  if (ctx.chat.type !== "private" || !isConfiguredAdmin(ctx)) return next();
  const photo = ctx.message.photo?.[ctx.message.photo.length - 1];
  if (!photo?.file_id) return next();
  const duplicate = mediaLibrary.items.some((item) => item.fileId === photo.file_id);
  if (!duplicate) {
    mediaLibrary.items.push({ fileId: photo.file_id, addedAt: new Date().toISOString() });
    saveMediaLibrary();
  }
  await ctx.reply((duplicate ? "ℹ️ Bu fotoğraf zaten kayıtlı. " : "✅ Fotoğraf görsel havuzuna eklendi. ") +
    "\nToplam fotoğraf: " + mediaLibrary.items.length + "\nBot seçilen kanalda bu görselleri sırayla VYRA metinleriyle paylaşacak.");
});

bot.command("autopost_on", async (ctx) => {
  if (!(await requireAdmin(ctx))) return;
  if (ctx.chat.type === "private" && !settings.chatId) {
    return ctx.reply("Önce /autopost_target @kanal_kullaniciadi ile hedef kanalı seç. Botun o kanalda yönetici olması gerekir.");
  }
  if (ctx.chat.type !== "private") {
    settings.chatId = ctx.chat.id;
    settings.targetTitle = ctx.chat.title || ctx.chat.username || String(ctx.chat.id);
  }
  settings.enabled = true;
  saveSettings();
  await ctx.reply(
    "💜 Günlük otomatik paylaşım AÇIK!\n\n" +
    "🖼️ Görsel havuzundaki fotoğraf sırayla seçilir.\n" +
    "✍️ Her gönderiye AI ile üretilen VYRA metni eklenir (AI kapalıysa hazır metin).\n" +
    "🕒 Saatler: " + settings.times.join(", ") + " (Bakü saati)\n" +
    "📍 Hedef: " + (settings.targetTitle || settings.chatId) + "\n\n" +
    "Test için /autopost_test yaz."
  );
});

bot.command("autopost_off", async (ctx) => {
  if (!(await requireAdmin(ctx))) return;
  settings.enabled = false;
  saveSettings();
  await ctx.reply("⏸️ Günlük otomatik paylaşım durduruldu. Ayarlar korunuyor; tekrar açmak için grupta /autopost_on yaz.");
});

bot.command("autopost_status", async (ctx) => {
  if (!(await requireAdmin(ctx))) return;
  const target = settings.chatId === null ? "Henüz hedef seçilmedi" : (settings.targetTitle || String(settings.chatId));
  const last = settings.lastPostedDate || "Henüz paylaşım yapılmadı";
  await ctx.reply(
    "📅 VYRA • OTOMATİK PAYLAŞIM\n\n" +
    "Durum: " + (settings.enabled ? "🟢 Açık" : "⚪ Kapalı") + "\n" +
    "Saatler: " + settings.times.join(", ") + " (Bakü saati)\n" +
    "Hedef sohbet: " + target + "\n" +
    "Son başarılı paylaşım: " + last + "\n" +
    "Görsel havuzu: " + mediaLibrary.items.length + " fotoğraf\n\n" +
    "Komutlar: /autopost_target @kanal, /autopost_on, /autopost_off, /autopost_time 2 15:00, /autopost_times, /ai_status, /autopost_test, /media_status"
  );
});

bot.command("autopost_time", async (ctx) => {
  if (!(await requireAdmin(ctx))) return;
  const args = String(ctx.match || "").trim().split(/\s+/).filter(Boolean);
  let slot = 1;
  let time;
  if (args.length === 1) time = args[0];
  else if (args.length === 2 && /^[1-3]$/.test(args[0])) { slot = Number(args[0]); time = args[1]; }
  if (!isValidTime(time)) return ctx.reply("⏰ Kullanım: /autopost_time 10:00 veya /autopost_time 2 15:00");
  while (settings.times.length < 3) settings.times.push(["10:00", "15:00", "20:00"][settings.times.length]);
  settings.times[slot - 1] = time;
  settings.times.sort();
  saveSettings();
  await ctx.reply("⏰ Paylaşım saatleri (Bakü): " + settings.times.join(", "));
});

bot.command("autopost_test", async (ctx) => {
  if (!(await requireAdmin(ctx))) return;
  await ctx.reply("🧪 Test paylaşımı hazırlanıyor...");
  try {
    const result = await sendDailyPost(ctx.chat.id);
    await ctx.reply(result.image
      ? "✅ Test başarılı: görsel ve açıklama gönderildi. Konu: " + result.topic
      : "⚠️ Metin gönderildi; görsel havuzu boş. Bota özel mesajdan fotoğraf gönderip yeniden dene.");
  } catch (error) {
    console.error("Auto-post test failed:", error.message || error);
    await ctx.reply("❌ Test başarısız: " + (error.message || "Bilinmeyen hata"));
  }
});

bot.command("announce", async (ctx) => {
  if (!(await requireAdmin(ctx))) return;
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

// AI answers only direct questions: private chat, reply to the bot, or explicit @mention.
bot.on("message:text", async (ctx, next) => {
  const text = String(ctx.message.text || "").trim();
  if (!text || text.startsWith("/")) return next();
  const botUsername = bot.botInfo?.username;
  const isPrivate = ctx.chat.type === "private";
  const isReplyToBot = ctx.message.reply_to_message?.from?.id === bot.botInfo?.id;
  const isMention = botUsername ? text.toLowerCase().includes("@" + botUsername.toLowerCase()) : false;
  if (!isPrivate && !isReplyToBot && !isMention) return next();

  const key = ctx.chat.id + ":" + ctx.from.id;
  const now = Date.now();
  if (now - (aiCooldowns.get(key) || 0) < 8000) {
    await ctx.reply("💜 Birkaç saniye bekle, sorularını sırayla yanıtlayayım.");
    return;
  }
  aiCooldowns.set(key, now);
  if (aiCooldowns.size > 3000) {
    for (const [storedKey, timestamp] of aiCooldowns) {
      if (now - timestamp > 60000) aiCooldowns.delete(storedKey);
      if (aiCooldowns.size <= 2000) break;
    }
  }

  if (!process.env.GEMINI_API_KEY) {
    await ctx.reply("🤖 AI cevaplama şu an ayarlı değil. Yönetici Gemini API anahtarını hosting'in Secrets/Environment bölümüne eklemeli.");
    return;
  }
  const question = botUsername
    ? text.split(/\\s+/).filter((part) => part.toLowerCase() !== "@" + botUsername.toLowerCase()).join(" ").trim()
    : text;
  if (!question) {
    await ctx.reply("💜 Sorunu da yaz, yardımcı olayım.");
    return;
  }
  try {
    await ctx.replyWithChatAction("typing");
    const answer = await answerCommunityQuestion(question, { chatTitle: ctx.chat.title });
    await ctx.reply(answer, { reply_to_message_id: ctx.message.message_id });
  } catch (error) {
    console.warn("AI community answer failed:", error.message || error);
    await ctx.reply("⚠️ Şu an yanıt hazırlayamadım. Biraz sonra tekrar dene.");
  }
});

bot.command("autopost_times", async (ctx) => {
  if (!(await requireAdmin(ctx))) return;
  await ctx.reply("🕒 Günlük otomatik paylaşım saatleri (Bakü):\n" +
    settings.times.map((time, index) => (index + 1) + ". " + time).join("\n") +
    "\n\nSaat değiştirmek için /autopost_time 2 15:00 yaz.");
});

bot.command("ai_status", async (ctx) => {
  if (!(await requireAdmin(ctx))) return;
  await ctx.reply("🤖 VYRA AI durumu\n\n" +
    "Gemini API anahtarı: " + (process.env.GEMINI_API_KEY ? "tanımlı" : "tanımlı değil") + "\n" +
    "Model: " + (process.env.GEMINI_MODEL || "gemini-2.5-flash") + "\n" +
    "AI anahtarı hiçbir zaman bu komutta gösterilmez.");
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

async function runSchedulerTick() {
  if (!settings.enabled || !settings.chatId || postingNow) return;
  const current = getBakuDateTime();
  const times = Array.isArray(settings.times) && settings.times.length ? settings.times : ["10:00", "15:00", "20:00"];
  settings.lastPostedSlots = settings.lastPostedSlots || {};
  const dueIndex = times.findIndex((time, index) => current.time >= time && settings.lastPostedSlots[current.date + ":" + (index + 1)] !== true);
  if (dueIndex < 0) return;
  const slotNumber = dueIndex + 1;
  const slotKey = current.date + ":" + slotNumber;
  postingNow = true;
  try {
    const result = await sendDailyPost(settings.chatId, slotNumber);
    settings.lastPostedSlots[slotKey] = true;
    settings.lastPostedDate = current.date;
    saveSettings();
    console.log("Scheduled post sent:", current.date, "slot:", slotNumber, result.topic, "image:", result.image, "ai:", result.aiGenerated);
  } catch (error) {
    console.error("Scheduled post failed; scheduler will retry:", error.message || error);
  } finally { postingNow = false; }
}

bot.catch((error) => console.error("Telegram bot error:", error.message || error));

(async () => {
  loadSettings();
  loadMediaLibrary();
  if (!Array.isArray(settings.times) || !settings.times.length) settings.times = [...defaultSettings.times];
  settings.times = settings.times.filter(isValidTime).slice(0, 3);
  while (settings.times.length < 3) settings.times.push(["10:00", "15:00", "20:00"][settings.times.length]);
  try {
    await bot.api.setMyCommands(commandList);
  } catch (error) {
    console.warn("Could not set Telegram command menu:", error.message || error);
  }

  // Start the scheduler before long polling: bot.start() remains pending while the bot runs.
  setInterval(() => { runSchedulerTick().catch((error) => console.error("Scheduler tick error:", error)); }, 15000);
  console.log("Daily scheduler ready. Timezone: Asia/Baku; times: " + settings.times.join(", "));
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
