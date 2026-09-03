import { copyInChunks } from "@/lib/transfers/copy";
import { refreshOAuthToken } from "@/lib/oauth/providers";
import type {
  Connector,
  DropboxConfig,
  FileEntry,
  ReadOptions,
  ReadResult,
  WriteOptions,
} from "./types";

type DropboxEntry = {
  ".tag": "file" | "folder";
  name: string;
  path_display?: string;
  path_lower?: string;
  id?: string;
  size?: number;
};

export class DropboxConnector implements Connector {
  kind = "dropbox" as const;
  private accessToken: string | null = null;
  private accessExpires = 0;

  constructor(
    private config: DropboxConfig,
    private onRefresh?: (next: DropboxConfig) => Promise<void>,
  ) {}

  async list(path: string): Promise<FileEntry[]> {
    const data = await this.rpc<{ entries: DropboxEntry[] }>("https://api.dropboxapi.com/2/files/list_folder", {
      path: dropboxPath(path),
    });
    return (data.entries ?? []).map(toEntry);
  }

  async stat(path: string): Promise<FileEntry> {
    if (!path || path === "/" || path === "root") {
      return { id: "", name: "Dropbox", path: "", isDir: true };
    }
    const meta = await this.rpc<DropboxEntry>("https://api.dropboxapi.com/2/files/get_metadata", {
      path: dropboxPath(path),
    });
    return toEntry(meta);
  }

  async read(path: string, options?: ReadOptions): Promise<ReadResult> {
    const item = await this.stat(path);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${await this.token()}`,
      "Dropbox-API-Arg": JSON.stringify({ path: dropboxPath(path) }),
    };
    if (options?.offset && options.offset > 0) headers.Range = `bytes=${options.offset}-`;
    const response = await fetch("https://content.dropboxapi.com/2/files/download", { headers });
    if (!response.ok || !response.body) throw new Error(`Dropbox download failed (${response.status})`);
    return { stream: response.body, size: item.size, name: item.name };
  }

  async write(path: string, stream: ReadableStream<Uint8Array>, _options?: WriteOptions): Promise<void> {
    const token = await this.token();
    const start = await fetch("https://content.dropboxapi.com/2/files/upload_session/start", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({ close: false }),
      },
      body: new Uint8Array(),
    });
    const session = (await start.json()) as { session_id?: string };
    if (!start.ok || !session.session_id) throw new Error("Dropbox upload session failed");
    let offset = 0;
    let lastChunk: Uint8Array<ArrayBufferLike> = new Uint8Array();
    let hasChunk = false;
    await copyInChunks(stream, async (chunk) => {
      if (hasChunk) {
        await this.append(session.session_id!, lastChunk, offset - lastChunk.byteLength);
      }
      lastChunk = chunk;
      hasChunk = true;
      offset += chunk.byteLength;
    });
    if (!hasChunk) throw new Error("Empty upload");
    const finish = await fetch("https://content.dropboxapi.com/2/files/upload_session/finish", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({
          cursor: { session_id: session.session_id, offset: offset - lastChunk.byteLength },
          commit: { path: dropboxPath(path), mode: "overwrite" },
        }),
      },
      body: Buffer.from(lastChunk),
    });
    if (!finish.ok) throw new Error(`Dropbox upload finish failed (${finish.status})`);
  }

  private async append(sessionId: string, chunk: Uint8Array, offset: number) {
    const response = await fetch("https://content.dropboxapi.com/2/files/upload_session/append_v2", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await this.token()}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({ cursor: { session_id: sessionId, offset }, close: false }),
      },
      body: Buffer.from(chunk),
    });
    if (!response.ok) throw new Error(`Dropbox append failed (${response.status})`);
  }

  private async token() {
    if (this.accessToken && Date.now() < this.accessExpires - 30_000) return this.accessToken;
    const tokens = await refreshOAuthToken("dropbox", this.config.refreshToken);
    this.accessToken = tokens.accessToken;
    this.accessExpires = tokens.expiresAt;
    if (tokens.refreshToken && tokens.refreshToken !== this.config.refreshToken) {
      this.config = { ...this.config, refreshToken: tokens.refreshToken };
      await this.onRefresh?.(this.config);
    }
    return this.accessToken;
  }

  private async rpc<T>(url: string, body: unknown): Promise<T> {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await this.token()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Dropbox error (${response.status})`);
    return (await response.json()) as T;
  }
}

function dropboxPath(path: string) {
  if (!path || path === "/" || path === "root") return "";
  return path.startsWith("/") ? path : `/${path}`;
}

function toEntry(entry: DropboxEntry): FileEntry {
  const path = entry.path_display || entry.path_lower || entry.name;
  return {
    id: path,
    name: entry.name,
    path,
    isDir: entry[".tag"] === "folder",
    size: entry.size,
  };
}
