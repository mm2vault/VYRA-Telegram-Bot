# VYRA Telegram Bot 💜

Node.js ve grammY ile hazırlanmış Türkçe VYRA topluluk botu. Yönetici kendi görsellerini yükler; Gemini AI metin üretimi ve topluluk soru-cevap desteği sağlar. AI anahtarı yoksa gönderiler hazır metinlerle devam eder.

## Özellikler

- `/start`, `/help`, `/about`, `/rules`, `/id`, `/ping`
- Yeni üye karşılama mesajı ve hafif flood koruması
- Yöneticiye özel duyuru komutu: `/announce mesaj`
- Yönetici fotoğraf havuzu: bota özel sohbetten fotoğraf gönder; Telegram file_id'si kaydedilir
- Otomatik gönderilerde havuzdaki fotoğrafları sırayla kullanır
- Gemini AI ile her paylaşım için konuya özel dinamik Türkçe açıklama üretir; AI başarısızsa hazır metinle devam eder
- Özel sohbette gelen mesajları, grupta bota yanıtları ve @mention ile sorulan soruları AI ile yanıtlar; grup sohbetlerini kendiliğinden okumaz
- Günlük üç otomatik paylaşım (varsayılan 10:00, 15:00, 20:00; Bakü saati) ve slot başına günlük tekrar engeli
- Hedef kanal seçimi: `/autopost_target @kanal_kullaniciadi`
- Günlük otomatik paylaşımı aç/kapat, durumunu gör ve Bakü saatine göre zamanla
- `/autopost_test` ile gönderiyi dene
- `/health` ve kök health endpoint'i
- Görsel üretimi için AI API'si gerekmez; dinamik metin ve soru-cevap için `GEMINI_API_KEY` isteğe bağlıdır

## Environment değişkenleri

Hosting platformunun Environment/Secrets bölümünde ayarla. Bot token'ını asla GitHub'a veya sohbet mesajlarına koyma.

- `TELEGRAM_BOT_TOKEN` — BotFather'dan alınan zorunlu bot token'ı.
- `TELEGRAM_ADMIN_IDS` — Özel sohbetten yönetici komutlarını kullanabilecek sayısal Telegram kullanıcı ID'leri; virgülle ayrılabilir. Önerilen değer: kendi kullanıcı ID'n.
- `AUTO_POST_TIMES` — Üç paylaşım saati virgülle ayrılır; varsayılan `10:00,15:00,20:00` (Bakü saati).
- `GEMINI_API_KEY` — AI metin üretimi ve soru-cevap için isteğe bağlı Gemini API anahtarı. Anahtarı GitHub’a veya sohbete koyma.
- `GEMINI_MODEL` — İsteğe bağlı model adı; varsayılan `gemini-2.5-flash`.
- `DATA_DIR` — JSON ayarları ve görsel havuzu için dizin. Varsayılan `./data`; Render Persistent Disk `/var/data` noktasına bağlandıysa `DATA_DIR=/var/data` ayarla.
- `PORT` — İsteğe bağlı; hosting platformu genellikle kendisi ayarlar.

## İlk kurulum

1. Botu Node.js 20 veya üstünde çalıştır.
2. Telegram'da botu hedef kanala ekle ve **yönetici** yap. Gönderi paylaşma izni açık olmalı.
3. Botun özel sohbetini aç ve `/autopost_target @kanal_kullaniciadi` gönder. Kanalın kullanıcı adı yoksa bu komut için kullanıcı adı olan bir kanal kullan.
4. Aynı özel sohbete paylaşmak istediğin fotoğrafları tek tek gönder. Bot her fotoğrafı havuza eklediğini söyleyecek.
5. `/media_status` ile havuzdaki görsel sayısını kontrol et.
6. `/autopost_on` ile günlük paylaşımı aç; varsayılan olarak her gün 10:00, 15:00 ve 20:00 saatlerinde paylaşım yapar.
7. İstersen `/autopost_time 10:30` ile saati değiştir.
8. `/autopost_test` ile hemen deneme gönderisi yap.
9. `/autopost_status` durum, hedef kanal, saat ve fotoğraf sayısını gösterir; `/autopost_off` paylaşımı durdurur.

Botu bir grup içinde `/autopost_on` ile başlatırsan o grup da hedef olarak seçilebilir.

## Komutlar

- `/image` — Hedef sohbetine havuzdaki sıradaki fotoğrafı hazır VYRA metniyle gönderir.
- `/autopost_target @kanal` — Otomatik gönderiler için hedef kanalı seçer.
- `/autopost_on` / `/autopost_off` — Otomatik paylaşımı açar veya kapatır.
- `/autopost_status` — Durumu gösterir.
- `/autopost_time HH:MM` — 1. paylaşım saatini değiştirir.
- `/autopost_time 2 HH:MM` — 2. paylaşım saatini değiştirir; `/autopost_time 3 HH:MM` üçüncü saati değiştirir.
- `/autopost_times` — Üç saatlik planı gösterir.
- `/ai_status` — AI anahtarının tanımlı olup olmadığını gösterir; anahtarın kendisini göstermez.
- `/autopost_test` — Hemen bir deneme gönderisi yapar.
- `/media_status` — Kayıtlı fotoğraf sayısını gösterir.

## Görsel havuzu ve hosting notları

Fotoğrafların kendisi tekrar indirilmez; bot Telegram'ın verdiği `file_id` değerini `DATA_DIR` altındaki `media-library.json` dosyasına kaydeder. Ayarlar da aynı dizindeki `automation-settings.json` dosyasına yazılır. Kalıcılık için hosting sağlayıcısında disk bağla ve `DATA_DIR` değerini bu bağlama yoluna ayarla. Bu, dosya boyutunu küçük tutar. Ancak Render gibi geçici dosya sistemine sahip hostlarda yeniden dağıtım veya yeniden başlatma sonrasında yerel JSON dosyaları kaybolabilir. Böyle bir durumda fotoğrafları bota yeniden göndermek ve `/autopost_target` / `/autopost_on` ayarlarını kontrol etmek gerekir. Kalıcı medya havuzu için kalıcı disk veya harici veritabanı gerekir.

Zamanlayıcı süreç çalışırken 15 saniyede bir kontrol eder; üç paylaşımı planlanan Bakü saatlerinde yapar. Gemini REST API ile metin üretimi ve API anahtarı başlığı kullanılır; anahtar URL’ye yazılmaz. AI yanıtları süre sınırı ve kullanıcı başına bekleme aralığıyla korunur. Ücretsiz hosting uykuya geçerse gönderi gecikebilir. Botun kanalda yönetici kalması gerekir.

## AI kurulumu

Google AI Studio üzerinden Gemini API anahtarı oluştur ve anahtarı yalnızca hosting'in Environment/Secrets bölümüne `GEMINI_API_KEY` olarak kaydet. `GEMINI_MODEL` isteğe bağlıdır. Anahtar ayarlı değilse otomatik paylaşımlar hazır Türkçe metinlere geri döner; AI soru-cevap özelliği devre dışı kalır. Kullanım limitleri ve ücretlendirme Google hesabına/planına bağlıdır.

## Yerel çalıştırma

```bash
npm install
npm test
npm start
```

`.env` dosyası oluşturup `TELEGRAM_BOT_TOKEN` ve `TELEGRAM_ADMIN_IDS` değerlerini yerel ortamında ayarla; bu dosyayı commit etme.
