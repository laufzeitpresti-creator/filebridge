import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertPublicHttpUrl } from "./ssrf";

describe("assertPublicHttpUrl", () => {
  it("rejects non-http schemes", async () => {
    await assert.rejects(() => assertPublicHttpUrl("file:///etc/passwd"), /http/);
  });

  it("rejects localhost", async () => {
    await assert.rejects(() => assertPublicHttpUrl("http://localhost/secret"), /Intern/);
  });

  it("rejects loopback IPs", async () => {
    await assert.rejects(() => assertPublicHttpUrl("http://127.0.0.1/"), /Intern/);
  });

  it("rejects private ranges", async () => {
    await assert.rejects(() => assertPublicHttpUrl("http://192.168.1.1/"), /Intern/);
    await assert.rejects(() => assertPublicHttpUrl("http://10.0.0.4/"), /Intern/);
  });
});
