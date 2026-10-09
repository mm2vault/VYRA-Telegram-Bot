const test = require("node:test");
const assert = require("node:assert/strict");
const { generateImageBuffer, generateImagePrompt, DEFAULT_MODEL, PROMPT_MODEL } = require("../src/gemini-image");

function mockResponse({ ok = true, status = 200, data, text = "" } = {}) {
  return {
    ok,
    status,
    async json() { return data; },
    async text() { return text; }
  };
}

test("Gemini automatically creates a detailed prompt then returns generated image bytes", async () => {
  const calls = [];
  const bytes = Buffer.from("fake-png-data");
  const result = await generateImageBuffer("Günlük VYRA AI topluluk paylaşımı", {
    apiKey: "test-key",
    fetchImpl: async (url, init) => {
      const body = JSON.parse(init.body);
      calls.push({ url, init, body });
      if (body.model === PROMPT_MODEL) {
        return mockResponse({ data: { output_text: "Premium purple neon VYRA technology poster, cinematic lighting." } });
      }
      return mockResponse({ data: { output_image: { data: bytes.toString("base64") } } });
    }
  });
  assert.deepEqual(result, bytes);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].body.model, PROMPT_MODEL);
  assert.equal(calls[0].body.response_format.type, "text");
  assert.match(calls[0].body.input, /visual art director/i);
  assert.equal(calls[1].body.model, DEFAULT_MODEL);
  assert.equal(calls[1].body.input, "Premium purple neon VYRA technology poster, cinematic lighting.");
  assert.equal(calls[1].init.headers["x-goog-api-key"], "test-key");
  assert.equal(calls[1].body.response_format.type, "image");
});

test("Gemini prompt generation returns text from output_text", async () => {
  const prompt = await generateImagePrompt("VYRA AI news visual", {
    apiKey: "test-key",
    fetchImpl: async () => mockResponse({ data: { output_text: "  Crisp neon AI artwork  " } })
  });
  assert.equal(prompt, "Crisp neon AI artwork");
});

test("Gemini prompt generation reads text from Interactions API output parts", async () => {
  const prompt = await generateImagePrompt("VYRA AI news visual", {
    apiKey: "test-key",
    fetchImpl: async () => mockResponse({
      data: { output: [{ type: "message", content: [{ type: "text", text: "  Purple neon VYRA poster  " }] }] }
    })
  });
  assert.equal(prompt, "Purple neon VYRA poster");
});

test("Empty prompt response falls back to a detailed VYRA image prompt", async () => {
  let calls = 0;
  const result = await generateImageBuffer("VYRA teknoloji posteri", {
    apiKey: "test-key",
    fetchImpl: async (_url, init) => {
      calls += 1;
      const body = JSON.parse(init.body);
      if (body.model === PROMPT_MODEL) return mockResponse({ data: { output: [] } });
      return mockResponse({ data: { output_image: { data: Buffer.from("image-bytes").toString("base64") } } });
    }
  });
  assert.deepEqual(result, Buffer.from("image-bytes"));
  assert.equal(calls, 2);
});

test("Unavailable prompt model falls back and still requests an image", async () => {
  const calls = [];
  const bytes = Buffer.from("fallback-image");
  const result = await generateImageBuffer("VYRA mor neon teknoloji", {
    apiKey: "test-key",
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(init.body);
      calls.push(body);
      if (body.model === PROMPT_MODEL) {
        return mockResponse({ ok: false, status: 404, text: "model no longer available" });
      }
      return mockResponse({ data: { output_image: { data: bytes.toString("base64") } } });
    }
  });
  assert.deepEqual(result, bytes);
  assert.equal(calls.length, 2);
  assert.match(calls[1].input, /premium, original VYRA social-media artwork/i);
  assert.match(calls[1].input, /VYRA mor neon teknoloji/);
});

test("Gemini extracts image data from nested output content", async () => {
  const bytes = Buffer.from("nested-image-data");
  const result = await generateImageBuffer("VYRA test", {
    apiKey: "test-key",
    skipPromptGeneration: true,
    fetchImpl: async () => mockResponse({
      data: { output: [{ content: [{ type: "image", inline_data: { data: bytes.toString("base64") } }] }] }
    })
  });
  assert.deepEqual(result, bytes);
});

test("Gemini image generator fails clearly when API key is missing", async () => {
  await assert.rejects(
    generateImageBuffer("test", { apiKey: "", fetchImpl: async () => { throw new Error("should not call"); } }),
    /GEMINI_API_KEY/
  );
});

test("Gemini image generator reports HTTP errors", async () => {
  await assert.rejects(
    generateImageBuffer("test", {
      apiKey: "test-key",
      fetchImpl: async () => mockResponse({ ok: false, status: 429, text: "quota exceeded" })
    }),
    /HTTP 429: quota exceeded/
  );
});

test("Gemini image generator reports responses without image data", async () => {
  let count = 0;
  await assert.rejects(
    generateImageBuffer("test", {
      apiKey: "test-key",
      fetchImpl: async () => {
        count += 1;
        return count === 1
          ? mockResponse({ data: { output_text: "detailed image prompt" } })
          : mockResponse({ data: { output_text: "no image" } });
      }
    }),
    /Gemini görsel döndürmedi/
  );
});
