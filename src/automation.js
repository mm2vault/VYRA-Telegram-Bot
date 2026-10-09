const DAILY_CONTENT = [
  {
    topic: "Yapay zekâ ipucu",
    caption: "🧠 **Günün AI İpucu**\n\nYapay zekâdan daha iyi sonuç almak için isteğini net yaz: rolünü, hedefini, istediğin formatı ve kısıtlarını belirt.\n\n💜 VYRA ile teknoloji gündemini takipte kal!",
    visual: "a premium futuristic AI assistant concept, glowing neural network, deep violet and electric purple neon, elegant high contrast editorial technology poster, no words, no letters, square composition"
  },
  {
    topic: "Teknoloji",
    caption: "⚡ **Teknoloji Notu**\n\nYeni bir uygulamayı kullanmadan önce gizlilik izinlerini kontrol et. Yalnızca gerçekten gerekli izinleri açık tut.\n\n🛡️ Güvenli teknoloji, daha iyi topluluk.",
    visual: "a sleek futuristic cybersecurity concept, glowing shield and abstract data streams, deep purple neon and midnight black, premium editorial technology art, no text, square composition"
  },
  {
    topic: "Dijital güvenlik",
    caption: "🔐 **Mini Güvenlik Rehberi**\n\nHer hesapta farklı ve güçlü parola kullan; mümkünse iki aşamalı doğrulamayı etkinleştir. Parolanı veya bot token'ını kimseyle paylaşma.\n\n💜 Güvende kal, VYRA'da kal.",
    visual: "minimal premium digital security poster artwork, luminous violet shield, abstract secure network nodes, dark charcoal background, elegant purple neon lighting, no text, square composition"
  },
  {
    topic: "VYRA topluluğu",
    caption: "💜 **VYRA Günlük Notu**\n\nTeknoloji, yaratıcılık ve topluluk enerjisi burada buluşuyor. Bugün öğrendiğin yeni bir uygulama veya ipucunu grupla paylaş!\n\n#VYRA #Teknoloji",
    visual: "a premium futuristic community of glowing abstract digital avatars connected by violet light trails, deep purple neon, sophisticated dark background, clean editorial art, no logos, no text, square composition"
  },
  {
    topic: "Verimlilik",
    caption: "🚀 **Küçük Verimlilik İpucu**\n\nBir işe başlamadan önce en önemli tek adımı belirle. 20 dakika odaklan, ardından kısa bir mola ver. Küçük ilerleme de ilerlemedir.\n\n⚡ Günün güzel geçsin!",
    visual: "a futuristic productivity concept with luminous violet orbiting geometric shapes and a glowing focus point, premium minimal technology illustration, dark purple background, no text, square composition"
  },
  {
    topic: "Yapay zekâ farkındalığı",
    caption: "🤖 **AI Hatırlatması**\n\nYapay zekâ yanıtlarını önemli kararlar öncesinde kontrol et. Kaynakları doğrula ve özel bilgilerini herkese açık araçlara yazma.\n\n💜 Akıllı kullan, güvenli kal.",
    visual: "abstract responsible artificial intelligence concept, glowing violet brain made of connected points, subtle data lines, elegant premium dark technology art, no text, square composition"
  },
  {
    topic: "Haftalık keşif",
    caption: "✨ **Dijital Keşif Zamanı**\n\nBugün işini kolaylaştıran bir kısayol, uygulama veya araç keşfet. En sevdiğin ücretsiz teknoloji aracını yorumlara bırak!\n\n💜 VYRA topluluğunda paylaşalım.",
    visual: "a curated collection of futuristic digital tools represented by elegant glowing violet geometric icons, deep black and purple palette, premium editorial illustration, no readable text, square composition"
  }
];

function getDailyContent(date = new Date()) {
  const dayNumber = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000);
  return DAILY_CONTENT[((dayNumber % DAILY_CONTENT.length) + DAILY_CONTENT.length) % DAILY_CONTENT.length];
}

function buildImagePrompt(userPrompt) {
  const clean = String(userPrompt || "").trim().slice(0, 700);
  return [
    "Create a polished, high-quality square social media image for VYRA, a modern technology community.",
    "Visual identity: deep midnight background, elegant violet and purple neon glow, refined composition, cinematic lighting, professional design, crisp details.",
    "Avoid watermarks, random lettering, fake logos, signatures, and illegible text.",
    clean || "daily technology and artificial intelligence inspiration"
  ].join(" ");
}

function isValidTime(value) {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function getBakuDateTime(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baku",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: values.year + "-" + values.month + "-" + values.day,
    time: values.hour + ":" + values.minute
  };
}

module.exports = { getDailyContent, buildImagePrompt, isValidTime, getBakuDateTime };
