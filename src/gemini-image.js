const DEFAULT_MODEL = "gemini-nano-banana-2.1";
const API_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";

async function generateImageBuffer(prompt, options = {}) {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini henüz yapılandırılmamış. GEMINI_API_KEY anahtarını hosting servisinin Environment/Secrets bölümüne ekleyin.");
  }

  const model = options.model || process.env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL;
  const fetchImpl = options.fetchImpl || fetch;
  const response = await fetchImpl(API_URL, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: String(prompt),
      response_format: {
        type: "image",
        mime_type: "image/png",
        aspect_ratio: "1:1",
        image_size: "1K"
      }
    }),
    signal: AbortSignal.timeout(120000)
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error("Gemini API HTTP " + response.status + (detail ? ": " + detail : ""));
  }

  const data = await response.json();
  const imageData = data?.output_image?.data;
  if (!imageData || typeof imageData !== "string") {
    const detail = (data?.error?.message || "Yanıtta görsel verisi bulunamadı.").slice(0, 300);
    throw new Error("Gemini görsel döndürmedi: " + detail);
  }

  const buffer = Buffer.from(imageData, "base64");
  if (!buffer.length) throw new Error("Gemini boş görsel verisi döndürdü.");
  return buffer;
}

module.exports = { generateImageBuffer, DEFAULT_MODEL };
