import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { copyInChunks, joinDestPath } from "./copy";

describe("copyInChunks", () => {
  it("counts every byte and preserves payload", async () => {
    const payload = new Uint8Array([1, 2, 3, 4, 5]);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(payload.subarray(0, 2));
        controller.enqueue(payload.subarray(2));
        controller.close();
      },
    });
    const received: number[] = [];
    const total = await copyInChunks(stream, async (chunk) => {
      received.push(...chunk);
    });
    assert.equal(total, 5);
    assert.deepEqual(received, [1, 2, 3, 4, 5]);
  });
});

describe("joinDestPath", () => {
  it("joins folder and file without double slashes", () => {
    assert.equal(joinDestPath("/data/", "invoice.pdf"), "/data/invoice.pdf");
    assert.equal(joinDestPath("root", "a.bin"), "/a.bin");
  });
});
