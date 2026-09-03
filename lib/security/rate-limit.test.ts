import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  it("allows up to the limit then blocks", () => {
    const key = `test:${Date.now()}`;
    assert.equal(rateLimit(key, 2, 60_000), true);
    assert.equal(rateLimit(key, 2, 60_000), true);
    assert.equal(rateLimit(key, 2, 60_000), false);
  });
});
