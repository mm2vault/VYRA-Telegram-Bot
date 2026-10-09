# VYRA Telegram Bot 💜

Node.js ve grammY ile hazırlanmış Türkçe VYRA topluluk botu. Görsel üretmek için ücretli veya limitli bir AI API'sine ihtiyaç duymaz: yönetici fotoğrafları bota gönderir, bot bu görselleri seçilen Telegram kanalında hazır VYRA metinleriyle otomatik paylaşır.

## Özellikler

- `/start`, `/help`, `/about`, `/rules`, `/id`, `/ping`
- Yeni üye karşılama mesajı ve hafif flood koruması
- Yöneticiye özel duyuru komutu: `/announce mesaj`
- Yönetici fotoğraf havuzu: bota özel sohbetten fotoğraf gönder; Telegram file_id'si kaydedilir
- Otomatik gönderilerde havuzdaki fotoğrafları sırayla kullanır
- Her fotoğrafa teknoloji, dijital güvenlik, üretkenlik veya VYRA topluluğu hakkında hazır Türkçe açıklama ekler
- Hedef kanal seçimi: `/autopost_target @kanal_kullaniciadi`
- Günlük otomatik paylaşımı aç/kapat, durumunu gör ve Bakü saatine göre zamanla
- `/autopost_test` ile gönderiyi dene
- `/health` ve kök health endpoint'i
- API anahtarı veya AI görsel üretim servisi gerektirmez

## Environment değişkenleri

Hosting platformunun Environment/Secrets bölümünde ayarla. Bot token'ını asla GitHub'a veya sohbet mesajlarına koyma.

- `TELEGRAM_BOT_TOKEN` — BotFather'dan alınan zorunlu bot token'ı.
- `TELEGRAM_ADMIN_IDS` — Özel sohbetten yönetici komutlarını kullanabilecek sayısal Telegram kullanıcı ID'leri; virgülle ayrılabilir. Önerilen değer: kendi kullanıcı ID'n.
- `AUTO_POST_TIME` — Günlük paylaşım saati, Bakü saatine göre `HH:MM`; varsayılan `10:00`.
- `PORT` — İsteğe bağlı; hosting platformu genellikle kendisi ayarlar.

## İlk kurulum

1. Botu Node.js 20 veya üstünde çalıştır.
2. Telegram'da botu hedef kanala ekle ve **yönetici** yap. Gönderi paylaşma izni açık olmalı.
3. Botun özel sohbetini aç ve `/autopost_target @kanal_kullaniciadi` gönder. Kanalın kullanıcı adı yoksa bu komut için kullanıcı adı olan bir kanal kullan.
4. Aynı özel sohbete paylaşmak istediğin fotoğrafları tek tek gönder. Bot her fotoğrafı havuza eklediğini söyleyecek.
5. `/media_status` ile havuzdaki görsel sayısını kontrol et.
6. `/autopost_on` ile günlük paylaşımı aç.
7. İstersen `/autopost_time 10:30` ile saati değiştir.
8. `/autopost_test` ile hemen deneme gönderisi yap.
9. `/autopost_status` durum, hedef kanal, saat ve fotoğraf sayısını gösterir; `/autopost_off` paylaşımı durdurur.

Botu bir grup içinde `/autopost_on` ile başlatırsan o grup da hedef olarak seçilebilir.

## Komutlar

- `/image` — Hedef sohbetine havuzdaki sıradaki fotoğrafı hazır VYRA metniyle gönderir.
- `/autopost_target @kanal` — Otomatik gönderiler için hedef kanalı seçer.
- `/autopost_on` / `/autopost_off` — Otomatik paylaşımı açar veya kapatır.
- `/autopost_status` — Durumu gösterir.
- `/autopost_time HH:MM` — Bakü saatine göre günlük saati ayarlar.
- `/autopost_test` — Hemen bir deneme gönderisi yapar.
- `/media_status` — Kayıtlı fotoğraf sayısını gösterir.

## Görsel havuzu ve hosting notları

Fotoğrafların kendisi tekrar indirilmez; bot Telegram'ın verdiği `file_id` değerini `data/media-library.json` dosyasına kaydeder. Bu, dosya boyutunu küçük tutar. Ancak Render gibi geçici dosya sistemine sahip hostlarda yeniden dağıtım veya yeniden başlatma sonrasında yerel JSON dosyaları kaybolabilir. Böyle bir durumda fotoğrafları bota yeniden göndermek ve `/autopost_target` / `/autopost_on` ayarlarını kontrol etmek gerekir. Kalıcı medya havuzu için kalıcı disk veya harici veritabanı gerekir.

Zamanlayıcı süreç çalışırken 15 saniyede bir kontrol eder; günlük gönderi ayarlanan saatte yapılır. Ücretsiz hosting uykuya geçerse gönderi gecikebilir. Botun kanalda yönetici kalması gerekir.

## Yerel çalıştırma

```bash
npm install
npm test
npm start
```

`.env` dosyası oluşturup `TELEGRAM_BOT_TOKEN` ve `TELEGRAM_ADMIN_IDS` değerlerini yerel ortamında ayarla; bu dosyayı commit etme.
