const test = require("node:test");
const assert = require("node:assert/strict");
const { getDailyContent, buildImagePrompt, isValidTime, getBakuDateTime } = require("../src/automation");

test("daily content contains a caption, topic and image brief", () => {
  const content = getDailyContent(new Date("2026-10-09T12:00:00Z"));
  assert.ok(content.topic.length > 0);
  assert.ok(content.caption.length > 20);
  assert.ok(content.visual.length > 20);
});

test("daily content rotates by date but is stable within the same date", () => {
  const first = getDailyContent(new Date("2026-10-09T01:00:00Z"));
  const sameDay = getDailyContent(new Date("2026-10-09T22:00:00Z"));
  assert.equal(first.topic, sameDay.topic);
});

test("image prompt applies VYRA branding and handles empty input", () => {
  const prompt = buildImagePrompt("AI technology landscape");
  assert.match(prompt, /VYRA/);
  assert.match(prompt, /AI technology landscape/);
  assert.match(buildImagePrompt(""), /daily technology/);
});

test("time validation accepts valid 24-hour times only", () => {
  assert.equal(isValidTime("09:05"), true);
  assert.equal(isValidTime("23:59"), true);
  assert.equal(isValidTime("24:00"), false);
  assert.equal(isValidTime("9:05"), false);
  assert.equal(isValidTime("noon"), false);
});

test("Baku clock helper returns a date and HH:MM time", () => {
  const result = getBakuDateTime(new Date("2026-10-09T06:30:00Z"));
  assert.match(result.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(result.time, /^\d{2}:\d{2}$/);
});
