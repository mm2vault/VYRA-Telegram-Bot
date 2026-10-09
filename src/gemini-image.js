const DEFAULT_MODEL = "gemini-nano-banana-2.1";
const PROMPT_MODEL = process.env.GEMINI_PROMPT_MODEL || "gemini-3.8-flash";
const API_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const HF_DEFAULT_MODEL = "stabilityai/stable-diffusion-3-medium-diffusers";
const HF_API_URL = "https://router.huggingface.co/hf-inference/models/";

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

function buildFallbackPrompt(brief) {
  const fallbackBrief = String(brief || "original VYRA community art about technology and AI").trim();
  return (
    "Create a premium, original VYRA social-media artwork. Dark near-black background, vivid purple neon glow, subtle magenta accents, cinematic lighting, refined high-contrast composition, crisp details, modern technology and digital creativity atmosphere. " +
    "Make the visual polished and suitable for an official community post. Avoid fake app screenshots, watermarks, clutter, and misspelled text. " +
    "Visual concept: " + fallbackBrief
  ).slice(0, 4000);
}

function extractText(data) {
  const parts = [];
  if (typeof data?.output_text === "string") parts.push(data.output_text);
  if (Array.isArray(data?.output)) {
    for (const item of data.output) {
      if (typeof item?.text === "string") parts.push(item.text);
      if (Array.isArray(item?.content)) {
        for (const part of item.content) {
          if (typeof part?.text === "string") parts.push(part.text);
        }
      }
    }
  }
  return parts.join("\n").trim();
}

async function generateImagePrompt(brief, options = {}) {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini yapılandırılmamış. GEMINI_API_KEY anahtarını hosting servisinin Environment/Secrets bölümüne ekleyin.");
  }

  const fetchImpl = options.fetchImpl || fetch;
  let data;
  try {
    data = await callGemini({
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
  } catch (error) {
    // Authentication errors affect both requests and should remain visible to the owner.
    if (/HTTP 401|HTTP 403/.test(String(error?.message || error))) throw error;
    console.warn("Gemini prompt generation failed; using built-in VYRA prompt:", error?.message || error);
    return buildFallbackPrompt(brief);
  }

  const prompt = extractText(data);
  // A missing text field is not fatal: the image model can still work from a local prompt.
  return prompt ? prompt.slice(0, 4000) : buildFallbackPrompt(brief);
}

async function generateHuggingFaceImageBuffer(prompt, options = {}) {
  const token = options.hfToken || process.env.HF_TOKEN;
  if (!token) {
    throw new Error("HF_TOKEN eksik. Hugging Face ücretsiz Inference Providers erişim anahtarını hosting Environment/Secrets bölümüne ekleyin.");
  }
  const fetchImpl = options.fetchImpl || fetch;
  const model = options.hfModel || process.env.HF_IMAGE_MODEL || HF_DEFAULT_MODEL;
  const response = await fetchImpl(HF_API_URL + model, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
      Accept: "image/*"
    },
    body: JSON.stringify({
      inputs: String(prompt).slice(0, 4000),
      options: { wait_for_model: true }
    }),
    signal: AbortSignal.timeout(120000)
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    throw new Error("Hugging Face API HTTP " + response.status + (detail ? ": " + detail : ""));
  }
  const contentType = response.headers?.get?.("content-type") || "";
  if (contentType.includes("json") && typeof response.json === "function") {
    const data = await response.json();
    const detail = data?.error || data?.message || "API görsel yerine JSON döndürdü.";
    throw new Error("Hugging Face görsel üretimi başarısız: " + String(detail).slice(0, 300));
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error("Hugging Face boş görsel verisi döndürdü.");
  return bytes;
}

async function generateImageBuffer(brief, options = {}) {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
  const hfToken = options.hfToken || process.env.HF_TOKEN;
  const fetchImpl = options.fetchImpl || fetch;
  let prompt;
  if (options.skipPromptGeneration) {
    prompt = String(brief);
  } else if (apiKey) {
    try {
      prompt = await generateImagePrompt(brief, { ...options, apiKey, fetchImpl });
    } catch (error) {
      if (!hfToken) throw error;
      console.warn("Gemini prompt generation failed; using local prompt for Hugging Face fallback:", error?.message || error);
      prompt = buildFallbackPrompt(brief);
    }
  } else if (hfToken) {
    prompt = buildFallbackPrompt(brief);
  } else {
    throw new Error("GEMINI_API_KEY veya HF_TOKEN gerekli. API anahtarını hosting Environment/Secrets bölümüne ekleyin.");
  }

  const model = options.model || process.env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL;
  let data;
  try {
    if (!apiKey) throw new Error("Gemini API anahtarı yok; Hugging Face yedek sağlayıcısı kullanılacak.");
    data = await callGemini({
      apiKey,
      model,
      input: prompt,
      responseFormat: {
        type: "image",
        mime_type: "image/jpeg",
        aspect_ratio: "1:1",
        image_size: "1K"
      },
      fetchImpl
    });
  } catch (error) {
    if (!hfToken) throw error;
    console.warn("Gemini image generation failed; trying Hugging Face fallback:", error?.message || error);
    return generateHuggingFaceImageBuffer(prompt, options);
  }

  // Accept the direct output_image shape and image parts nested in output[].
  let imageData = data?.output_image?.data;
  if (typeof imageData !== "string" && Array.isArray(data?.output)) {
    for (const item of data.output) {
      const candidates = [
        item?.image?.data,
        item?.data,
        ...(Array.isArray(item?.content) ? item.content.flatMap((part) => [
          part?.image?.data,
          part?.inline_data?.data,
          part?.inlineData?.data,
          part?.data
        ]) : [])
      ];
      imageData = candidates.find((value) => typeof value === "string" && value.length > 0);
      if (imageData) break;
    }
  }
  if (!imageData || typeof imageData !== "string") {
    const detail = (data?.error?.message || extractText(data) || "Yanıtta görsel verisi bulunamadı.").slice(0, 300);
    if (hfToken) {
      console.warn("Gemini returned no image data; trying Hugging Face fallback:", detail);
      return generateHuggingFaceImageBuffer(prompt, options);
    }
    throw new Error("Gemini görsel döndürmedi: " + detail);
  }

  const buffer = Buffer.from(imageData, "base64");
  if (!buffer.length) throw new Error("Gemini boş görsel verisi döndürdü.");
  return buffer;
}

module.exports = { generateImageBuffer, generateImagePrompt, generateHuggingFaceImageBuffer, DEFAULT_MODEL, PROMPT_MODEL, HF_DEFAULT_MODEL, buildFallbackPrompt, extractText };
