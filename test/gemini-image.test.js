const test = require("node:test");
const assert = require("node:assert/strict");
const { generateImageBuffer, DEFAULT_MODEL } = require("../src/gemini-image");

function mockResponse({ ok = true, status = 200, data, text = "" } = {}) {
  return {
    ok,
    status,
    async json() { return data; },
    async text() { return text; }
  };
}

test("Gemini image generator uses the image model and returns decoded image bytes", async () => {
  let request;
  const bytes = Buffer.from("fake-png-data");
  const result = await generateImageBuffer("purple neon VYRA poster", {
    apiKey: "test-key",
    fetchImpl: async (url, init) => {
      request = { url, init, body: JSON.parse(init.body) };
      return mockResponse({ data: { output_image: { data: bytes.toString("base64") } } });
    }
  });
  assert.deepEqual(result, bytes);
  assert.equal(request.body.model, DEFAULT_MODEL);
  assert.equal(request.body.input, "purple neon VYRA poster");
  assert.equal(request.init.headers["x-goog-api-key"], "test-key");
  assert.equal(request.body.response_format.type, "image");
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
  await assert.rejects(
    generateImageBuffer("test", {
      apiKey: "test-key",
      fetchImpl: async () => mockResponse({ data: { output_text: "no image" } })
    }),
    /Gemini görsel döndürmedi/
  );
});
