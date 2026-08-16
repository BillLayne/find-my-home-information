import assert from "node:assert/strict";
import test from "node:test";
import { buildCountyCoverageUrl, countIntegratedCounties } from "../shared/coverage";

test("derives the county route from the configured property lookup without carrying query data", () => {
  assert.equal(
    buildCountyCoverageUrl("https://example.com/api/lookup?private=value"),
    "https://example.com/api/counties",
  );
});

test("counts unique integrated county ids and rejects malformed payloads", () => {
  assert.equal(countIntegratedCounties([{ id: "lee" }, { id: "wake" }, { id: "lee" }]), 2);
  assert.equal(countIntegratedCounties({ counties: [] }), null);
  assert.equal(countIntegratedCounties([]), null);
});
