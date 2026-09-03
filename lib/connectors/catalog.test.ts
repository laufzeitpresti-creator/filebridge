import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONNECTORS } from "./catalog";

describe("connector catalog", () => {
  it("has unique kinds and covers source plus destination", () => {
    const kinds = CONNECTORS.map((item) => item.kind);
    assert.equal(new Set(kinds).size, kinds.length);
    assert.ok(CONNECTORS.some((item) => item.canSource));
    assert.ok(CONNECTORS.some((item) => item.canDest));
    assert.deepEqual(
      kinds.sort(),
      ["box", "dropbox", "ftp", "google", "http", "local", "onedrive", "s3", "sftp", "share", "webdav"].sort(),
    );
  });
});
