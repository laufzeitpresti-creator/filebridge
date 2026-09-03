import { Client, type SFTPWrapper } from "ssh2";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import type {
  Connector,
  FileEntry,
  ReadOptions,
  ReadResult,
  SftpConfig,
  WriteOptions,
} from "./types";

export class SftpConnector implements Connector {
  kind = "sftp" as const;

  constructor(private config: SftpConfig) {}

  async list(path: string): Promise<FileEntry[]> {
    const target = normalizeSftpPath(path);
    return this.withSftp(async (sftp) => {
      const entries = await listDir(sftp, target);
      return entries
        .filter((entry) => entry.filename !== "." && entry.filename !== "..")
        .map((entry) => {
          const child = joinSftp(target, entry.filename);
          const isDir = isDirEntry(entry.longname, entry.attrs.mode);
          return {
            id: child,
            name: entry.filename,
            path: child,
            isDir,
            size: isDir ? undefined : entry.attrs.size,
          } satisfies FileEntry;
        });
    });
  }

  async stat(path: string): Promise<FileEntry> {
    const target = normalizeSftpPath(path);
    return this.withSftp(async (sftp) => {
      const attrs = await statPath(sftp, target);
      const name = target.split("/").filter(Boolean).at(-1) || target;
      return {
        id: target,
        name,
        path: target,
        isDir: attrs.isDirectory(),
        size: attrs.isDirectory() ? undefined : attrs.size,
      };
    });
  }

  async read(path: string, options?: ReadOptions): Promise<ReadResult> {
    const target = normalizeSftpPath(path);
    const { conn, sftp } = await this.connect();
    const attrs = await statPath(sftp, target);
    const nodeStream = sftp.createReadStream(target, {
      start: options?.offset ?? 0,
    });
    nodeStream.on("close", () => conn.end());
    nodeStream.on("error", () => conn.end());
    return {
      stream: Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>,
      size: attrs.size,
      name: target.split("/").filter(Boolean).at(-1) || target,
    };
  }

  async write(
    path: string,
    stream: ReadableStream<Uint8Array>,
    options?: WriteOptions,
  ): Promise<void> {
    const target = normalizeSftpPath(path);
    const { conn, sftp } = await this.connect();
    try {
      await mkdirp(sftp, parentPath(target));
      const offset = options?.offset ?? 0;
      const nodeStream = sftp.createWriteStream(target, {
        flags: offset > 0 ? "r+" : "w",
        start: offset > 0 ? offset : 0,
      });
      await pipelineWebToNode(stream, nodeStream);
    } finally {
      conn.end();
    }
  }

  async test(): Promise<void> {
    await this.list("/");
  }

  private connect(): Promise<{ conn: Client; sftp: SFTPWrapper }> {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      const timer = setTimeout(() => {
        conn.end();
        reject(new Error("SFTP connection timed out"));
      }, 20_000);
      conn.on("ready", () => {
        conn.sftp((err, sftp) => {
          clearTimeout(timer);
          if (err || !sftp) {
            conn.end();
            reject(err ?? new Error("SFTP session failed"));
            return;
          }
          resolve({ conn, sftp });
        });
      });
      conn.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
      conn.connect({
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        password: this.config.password,
        privateKey: this.config.privateKey,
        readyTimeout: 20_000,
      });
    });
  }

  private async withSftp<T>(fn: (sftp: SFTPWrapper) => Promise<T>): Promise<T> {
    const { conn, sftp } = await this.connect();
    try {
      return await fn(sftp);
    } finally {
      conn.end();
    }
  }
}

function normalizeSftpPath(path: string): string {
  if (!path || path === "root") return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

function joinSftp(base: string, name: string): string {
  if (base === "/") return `/${name}`;
  return `${base.replace(/\/+$/, "")}/${name}`;
}

function parentPath(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  const idx = trimmed.lastIndexOf("/");
  if (idx <= 0) return "/";
  return trimmed.slice(0, idx) || "/";
}

function listDir(sftp: SFTPWrapper, path: string) {
  return new Promise<import("ssh2").FileEntry[]>((resolve, reject) => {
    sftp.readdir(path, (err, list) => {
      if (err) reject(err);
      else resolve(list);
    });
  });
}

function statPath(sftp: SFTPWrapper, path: string) {
  return new Promise<import("ssh2").Stats>((resolve, reject) => {
    sftp.stat(path, (err, stats) => {
      if (err) reject(err);
      else resolve(stats);
    });
  });
}

function isDirEntry(longname: string, mode: number): boolean {
  return longname.startsWith("d") || (mode & 0o170000) === 0o040000;
}

function sftpErrCode(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    return String((err as { code: unknown }).code);
  }
  return "";
}

function alreadyExists(err: unknown): boolean {
  const code = sftpErrCode(err);
  return code === "4" || code === "11" || code === "SSH_FX_FILE_ALREADY_EXISTS";
}

function mkdirp(sftp: SFTPWrapper, dir: string): Promise<void> {
  if (!dir || dir === "/") return Promise.resolve();
  return new Promise((resolve, reject) => {
    sftp.mkdir(dir, { mode: 0o755 }, (err) => {
      if (!err || alreadyExists(err)) {
        resolve();
        return;
      }
      mkdirp(sftp, parentPath(dir))
        .then(() => {
          sftp.mkdir(dir, { mode: 0o755 }, (inner) => {
            if (inner && !alreadyExists(inner)) reject(inner);
            else resolve();
          });
        })
        .catch(reject);
    });
  });
}

function pipelineWebToNode(
  web: ReadableStream<Uint8Array>,
  node: NodeJS.WritableStream,
): Promise<void> {
  return pipeline(
    Readable.fromWeb(web as unknown as NodeWebReadableStream<Uint8Array>),
    node,
  );
}
