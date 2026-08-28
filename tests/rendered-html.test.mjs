import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships the Faultline incident room instead of starter content", async () => {
  const [page, layout, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /FAULTLINE/);
  assert.match(page, /Run investigation/);
  assert.match(page, /APPROVAL REQUIRED/);
  assert.match(page, /FROZEN EVALUATION/);
  assert.match(layout, /Evidence-first incident intelligence/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
});
