const test = require("node:test");
const assert = require("node:assert/strict");
const { generateText } = require("../src/ai");

test("AI helper fails safely when the Gemini key is missing", async () => {
  const original = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    await assert.rejects(generateText("test prompt"), /GEMINI_API_KEY/);
  } finally {
    if (original === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = original;
  }
});

test("AI prompt input is handled as text and empty questions are rejected", async () => {
  const { answerCommunityQuestion } = require("../src/ai");
  const original = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    await assert.rejects(answerCommunityQuestion("   "), /Soru boş/);
  } finally {
    if (original === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = original;
  }
});
