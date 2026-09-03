import { createClient, type WebDAVClient } from "webdav";
import { Readable } from "node:stream";
import type { Connector, FileEntry, ReadOptions, ReadResult, WebDavConfig, WriteOptions } from "./types";

export class WebDavConnector implements Connector {
  kind = "webdav" as const;
  private client: WebDAVClient;

  constructor(config: WebDavConfig) {
    this.client = createClient(config.url, {
      username: config.username,
      password: config.password,
    });
  }

  async list(path: string): Promise<FileEntry[]> {
    const entries = (await this.client.getDirectoryContents(norm(path))) as Array<{
      filename: string;
      basename: string;
      type: string;
      size: number;
      mime?: string;
    }>;
    return entries.map((entry) => ({
      id: entry.filename,
      name: entry.basename,
      path: entry.filename,
      isDir: entry.type === "directory",
      size: entry.type === "directory" ? undefined : entry.size,
      mimeType: entry.mime,
    }));
  }

  async stat(path: string): Promise<FileEntry> {
    const target = norm(path);
    if (target === "/") return { id: "/", name: "WebDAV", path: "/", isDir: true };
    const stat = (await this.client.stat(target)) as {
      filename: string;
      basename: string;
      type: string;
      size: number;
    };
    return {
      id: stat.filename,
      name: stat.basename,
      path: stat.filename,
      isDir: stat.type === "directory",
      size: stat.type === "directory" ? undefined : stat.size,
    };
  }

  async read(path: string, options?: ReadOptions): Promise<ReadResult> {
    const item = await this.stat(path);
    const stream = this.client.createReadStream(norm(path), {
      range: options?.offset ? { start: options.offset } : undefined,
    });
    return {
      stream: Readable.toWeb(stream as Readable) as ReadableStream<Uint8Array>,
      size: item.size,
      name: item.name,
    };
  }

  async write(path: string, stream: ReadableStream<Uint8Array>, _options?: WriteOptions): Promise<void> {
    const target = norm(path);
    const parent = target.slice(0, target.lastIndexOf("/") + 1) || "/";
    if (parent !== "/") {
      await this.client.createDirectory(parent, { recursive: true }).catch(() => undefined);
    }
    const node = Readable.fromWeb(stream as import("node:stream/web").ReadableStream<Uint8Array>);
    await this.client.putFileContents(target, node);
  }
}

function norm(path: string) {
  if (!path || path === "root") return "/";
  return path.startsWith("/") ? path : `/${path}`;
}
