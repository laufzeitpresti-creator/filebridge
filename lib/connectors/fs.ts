import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readdir, stat as fsStat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import { ensureDir, safeJoin, userDir } from "@/lib/storage/paths";
import type { Connector, FileEntry, LocalConfig, ReadOptions, ReadResult, ShareConfig, WriteOptions } from "./types";

class FsConnector implements Connector {
  constructor(
    readonly kind: "local" | "share",
    private userId: string,
    private bucket: "uploads" | "shares",
  ) {}

  private root() {
    return userDir(this.bucket, this.userId);
  }

  async list(rel: string): Promise<FileEntry[]> {
    const dir = safeJoin(await this.ready(), unix(rel));
    const names = await readdir(dir, { withFileTypes: true });
    return names.map((entry) => {
      const child = posixJoin(unix(rel), entry.name);
      return {
        id: child,
        name: entry.name,
        path: child,
        isDir: entry.isDirectory(),
      } satisfies FileEntry;
    });
  }

  async stat(rel: string): Promise<FileEntry> {
    const target = unix(rel);
    if (!target || target === "/") {
      return { id: "/", name: this.kind === "share" ? "Links" : "Uploads", path: "/", isDir: true };
    }
    const full = safeJoin(await this.ready(), target);
    const info = await fsStat(full);
    return {
      id: target,
      name: path.basename(full),
      path: target,
      isDir: info.isDirectory(),
      size: info.isDirectory() ? undefined : info.size,
    };
  }

  async read(rel: string, options?: ReadOptions): Promise<ReadResult> {
    const item = await this.stat(rel);
    const full = safeJoin(await this.ready(), unix(rel));
    const stream = createReadStream(full, { start: options?.offset ?? 0 });
    return {
      stream: Readable.toWeb(stream) as ReadableStream<Uint8Array>,
      size: item.size,
      name: item.name,
    };
  }

  async write(rel: string, stream: ReadableStream<Uint8Array>, options?: WriteOptions): Promise<void> {
    const full = safeJoin(await this.ready(), unix(rel));
    await mkdir(path.dirname(full), { recursive: true });
    const flags = options?.offset && options.offset > 0 ? "r+" : "w";
    const out = createWriteStream(full, {
      flags,
      start: options?.offset && options.offset > 0 ? options.offset : 0,
    });
    await pipeline(Readable.fromWeb(stream as NodeWebReadableStream<Uint8Array>), out);
  }

  private async ready() {
    const root = this.root();
    await ensureDir(root);
    return root;
  }
}

export class LocalConnector extends FsConnector {
  constructor(config: LocalConfig) {
    super("local", config.userId, "uploads");
  }
}

export class ShareConnector extends FsConnector {
  constructor(config: ShareConfig) {
    super("share", config.userId, "shares");
  }
}

function unix(rel: string) {
  if (!rel || rel === "root") return "/";
  return rel.startsWith("/") ? rel : `/${rel}`;
}

function posixJoin(base: string, name: string) {
  if (!base || base === "/") return `/${name}`;
  return `${base.replace(/\/+$/, "")}/${name}`;
}
