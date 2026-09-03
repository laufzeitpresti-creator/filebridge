import { Client } from "basic-ftp";
import { Readable, PassThrough } from "node:stream";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import type { Connector, FileEntry, FtpConfig, ReadOptions, ReadResult, WriteOptions } from "./types";

export class FtpConnector implements Connector {
  kind = "ftp" as const;

  constructor(private config: FtpConfig) {}

  async list(path: string): Promise<FileEntry[]> {
    return this.withClient(async (client) => {
      const entries = await client.list(norm(path));
      return entries
        .filter((entry) => entry.name !== "." && entry.name !== "..")
        .map((entry) => {
          const child = join(norm(path), entry.name);
          const isDir = entry.isDirectory;
          return {
            id: child,
            name: entry.name,
            path: child,
            isDir,
            size: isDir ? undefined : entry.size,
          } satisfies FileEntry;
        });
    });
  }

  async stat(path: string): Promise<FileEntry> {
    const target = norm(path);
    if (target === "/") return { id: "/", name: "FTP", path: "/", isDir: true };
    const parent = target.slice(0, target.lastIndexOf("/")) || "/";
    const name = target.split("/").filter(Boolean).at(-1) || target;
    const entries = await this.list(parent);
    const found = entries.find((entry) => entry.name === name);
    if (!found) throw new Error("FTP file not found");
    return found;
  }

  async read(path: string, options?: ReadOptions): Promise<ReadResult> {
    if (options?.offset && options.offset > 0) {
      throw new Error("FTP-Resume wird in diesem Connector nicht unterstützt.");
    }
    const item = await this.stat(path);
    const pass = new PassThrough();
    const client = await this.connect();
    void client
      .downloadTo(pass, norm(path))
      .then(() => client.close())
      .catch((error) => {
        pass.destroy(error);
        client.close();
      });
    return {
      stream: Readable.toWeb(pass) as ReadableStream<Uint8Array>,
      size: item.size,
      name: item.name,
    };
  }

  async write(path: string, stream: ReadableStream<Uint8Array>, _options?: WriteOptions): Promise<void> {
    const target = norm(path);
    await this.withClient(async (client) => {
      const parent = target.slice(0, target.lastIndexOf("/")) || "/";
      if (parent !== "/") await client.ensureDir(parent);
      const node = Readable.fromWeb(stream as NodeWebReadableStream<Uint8Array>);
      await client.uploadFrom(node, target);
    });
  }

  private async connect() {
    const client = new Client(20_000);
    await client.access({
      host: this.config.host,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      secure: this.config.secure,
    });
    return client;
  }

  private async withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
    const client = await this.connect();
    try {
      return await fn(client);
    } finally {
      client.close();
    }
  }
}

function norm(path: string) {
  if (!path || path === "root") return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

function join(base: string, name: string) {
  if (base === "/") return `/${name}`;
  return `${base.replace(/\/+$/, "")}/${name}`;
}
