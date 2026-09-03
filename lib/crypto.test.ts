import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decryptSecret, encryptSecret, parseKeyMaterial } from "./crypto";

describe("secret encryption", () => {
  it("round-trips unicode payloads", () => {
    const key = parseKeyMaterial("a".repeat(64));
    const payload = encryptSecret("sftp://üser:päss@host/Pfad", key);
    assert.equal(decryptSecret(payload, key), "sftp://üser:päss@host/Pfad");
    assert.notEqual(payload.includes("päss"), true);
  });

  it("rejects a short key", () => {
    assert.throws(() => parseKeyMaterial("abc"), /32 bytes/);
  });
});
