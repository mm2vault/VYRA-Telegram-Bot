const DEFAULT_MODEL = "gemini-nano-banana-2.1";
const PROMPT_MODEL = process.env.GEMINI_PROMPT_MODEL || "gemini-3.8-flash";
const API_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";

async function callGemini({ apiKey, model, input, responseFormat, fetchImpl }) {
  const response = await fetchImpl(API_URL, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input,
      response_format: responseFormat
    }),
    signal: AbortSignal.timeout(120000)
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error("Gemini API HTTP " + response.status + (detail ? ": " + detail : ""));
  }
  return response.json();
}

async function generateImagePrompt(brief, options = {}) {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini yapılandırılmamış. GEMINI_API_KEY anahtarını hosting servisinin Environment/Secrets bölümüne ekleyin.");
  }

  const fetchImpl = options.fetchImpl || fetch;
  const data = await callGemini({
    apiKey,
    model: options.promptModel || PROMPT_MODEL,
    input:
      "You are VYRA's visual art director. Turn this short brief into one detailed image-generation prompt. " +
      "Create an original, polished, premium social-media visual with VYRA's signature dark background, purple neon glow, subtle magenta accents, cinematic lighting, strong composition, clean details, and no fake UI screenshots. " +
      "If text is needed, use very little and spell VYRA correctly. Return only the final image prompt, with no quotes or explanation. Brief: " +
      String(brief || "Create today's original VYRA community visual about technology, AI, helpful digital tips, or the VYRA community."),
    responseFormat: { type: "text" },
    fetchImpl
  });

  // Interactions API responses can expose text either as output_text or inside output[].
  const outputParts = Array.isArray(data?.output)
    ? data.output.flatMap((item) => {
        if (typeof item?.text === "string") return [item.text];
        if (Array.isArray(item?.content)) {
          return item.content
            .map((part) => typeof part?.text === "string" ? part.text : "")
            .filter(Boolean);
        }
        return [];
      })
    : [];
  const prompt = [
    typeof data?.output_text === "string" ? data.output_text : "",
    ...outputParts
  ].join("\n").trim();

  // Never abort image generation just because the prompt model returned an empty text field.
  // Keep a strong VYRA style brief and let the image model produce the artwork directly.
  if (!prompt) {
    const fallbackBrief = String(brief || "original VYRA community art about technology and AI").trim();
    return (
      "Create a premium, original VYRA social-media artwork. Dark near-black background, vivid purple neon glow, subtle magenta accents, cinematic lighting, refined high-contrast composition, crisp details, modern technology and digital creativity atmosphere. " +
      "Make the visual polished and suitable for an official community post. Avoid fake app screenshots, watermarks, clutter, and misspelled text. " +
      "Visual concept: " + fallbackBrief
    ).slice(0, 4000);
  }
  return prompt.slice(0, 4000);
}

async function generateImageBuffer(brief, options = {}) {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini yapılandırılmamış. GEMINI_API_KEY anahtarını hosting servisinin Environment/Secrets bölümüne ekleyin.");
  }

  const fetchImpl = options.fetchImpl || fetch;
  // The bot invents/refines the detailed visual prompt automatically before requesting the image.
  const prompt = options.skipPromptGeneration
    ? String(brief)
    : await generateImagePrompt(brief, { ...options, apiKey, fetchImpl });
  const model = options.model || process.env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL;
  const data = await callGemini({
    apiKey,
    model,
    input: prompt,
    responseFormat: {
      type: "image",
      mime_type: "image/png",
      aspect_ratio: "1:1",
      image_size: "1K"
    },
    fetchImpl
  });

  const imageData = data?.output_image?.data;
  if (!imageData || typeof imageData !== "string") {
    const detail = (data?.error?.message || "Yanıtta görsel verisi bulunamadı.").slice(0, 300);
    throw new Error("Gemini görsel döndürmedi: " + detail);
  }

  const buffer = Buffer.from(imageData, "base64");
  if (!buffer.length) throw new Error("Gemini boş görsel verisi döndürdü.");
  return buffer;
}

module.exports = { generateImageBuffer, generateImagePrompt, DEFAULT_MODEL, PROMPT_MODEL };
