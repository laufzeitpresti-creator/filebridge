import { copyInChunks } from "@/lib/transfers/copy";
import { refreshOAuthToken } from "@/lib/oauth/providers";
import type { BoxConfig, Connector, FileEntry, ReadOptions, ReadResult, WriteOptions } from "./types";

type BoxItem = {
  id: string;
  type: "file" | "folder";
  name: string;
  size?: number;
};

export class BoxConnector implements Connector {
  kind = "box" as const;
  private accessToken: string | null = null;
  private accessExpires = 0;

  constructor(
    private config: BoxConfig,
    private onRefresh?: (next: BoxConfig) => Promise<void>,
  ) {}

  async list(path: string): Promise<FileEntry[]> {
    const id = normalizeBoxId(path);
    const data = await this.api<{ entries: BoxItem[] }>(
      `https://api.box.com/2.0/folders/${encodeURIComponent(id)}/items?fields=id,type,name,size&limit=200`,
    );
    return (data.entries ?? []).map(toEntry);
  }

  async stat(path: string): Promise<FileEntry> {
    const id = normalizeBoxId(path);
    if (id === "0") return { id: "0", name: "Box", path: "0", isDir: true };
    const file = await this.api<BoxItem>(`https://api.box.com/2.0/files/${encodeURIComponent(id)}?fields=id,type,name,size`).catch(
      async () => this.api<BoxItem>(`https://api.box.com/2.0/folders/${encodeURIComponent(id)}?fields=id,type,name,size`),
    );
    return toEntry(file);
  }

  async read(path: string, options?: ReadOptions): Promise<ReadResult> {
    const item = await this.stat(path);
    const headers: Record<string, string> = { Authorization: `Bearer ${await this.token()}` };
    if (options?.offset && options.offset > 0) headers.Range = `bytes=${options.offset}-`;
    const response = await fetch(`https://api.box.com/2.0/files/${encodeURIComponent(item.id)}/content`, {
      headers,
      redirect: "follow",
    });
    if (!response.ok || !response.body) throw new Error(`Box download failed (${response.status})`);
    return { stream: response.body, size: item.size, name: item.name };
  }

  async write(path: string, stream: ReadableStream<Uint8Array>, options?: WriteOptions): Promise<void> {
    const { parentId, name } = splitParent(path);
    const size = options?.size;
    if (size == null) throw new Error("Box-Upload braucht die Dateigröße.");
    const token = await this.token();
    const sessionRes = await fetch("https://upload.box.com/api/2.0/files/upload_sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ folder_id: parentId, file_name: name, file_size: size }),
    });
    const session = (await sessionRes.json()) as {
      id?: string;
      part_size?: number;
      session_endpoints?: { upload_part?: string; commit?: string };
    };
    if (!sessionRes.ok || !session.id) throw new Error("Box upload session failed");
    const parts: { part_id: string; offset: number; size: number }[] = [];
    let offset = 0;
    await copyInChunks(stream, async (chunk) => {
      const digest = await sha1Base64(chunk);
      const put = await fetch(session.session_endpoints?.upload_part || `https://upload.box.com/api/2.0/files/upload_sessions/${session.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Digest: `sha=${digest}`,
          "Content-Range": `bytes ${offset}-${offset + chunk.byteLength - 1}/${size}`,
          "Content-Type": "application/octet-stream",
        },
        body: Buffer.from(chunk),
      });
      const json = (await put.json()) as { part?: { part_id: string; offset: number; size: number } };
      if (!put.ok || !json.part) throw new Error(`Box part upload failed (${put.status})`);
      parts.push(json.part);
      offset += chunk.byteLength;
    });
    const commit = await fetch(
      session.session_endpoints?.commit || `https://upload.box.com/api/2.0/files/upload_sessions/${session.id}/commit`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ parts }),
      },
    );
    if (!commit.ok) throw new Error(`Box commit failed (${commit.status})`);
  }

  private async token() {
    if (this.accessToken && Date.now() < this.accessExpires - 30_000) return this.accessToken;
    const tokens = await refreshOAuthToken("box", this.config.refreshToken);
    this.accessToken = tokens.accessToken;
    this.accessExpires = tokens.expiresAt;
    if (tokens.refreshToken && tokens.refreshToken !== this.config.refreshToken) {
      this.config = { ...this.config, refreshToken: tokens.refreshToken };
      await this.onRefresh?.(this.config);
    }
    return this.accessToken;
  }

  private async api<T>(url: string): Promise<T> {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${await this.token()}` } });
    if (!response.ok) throw new Error(`Box error (${response.status})`);
    return (await response.json()) as T;
  }
}

async function sha1Base64(chunk: Uint8Array) {
  const hash = await crypto.subtle.digest("SHA-1", Buffer.from(chunk));
  return Buffer.from(hash).toString("base64");
}

function normalizeBoxId(path: string) {
  if (!path || path === "/" || path === "root") return "0";
  return path.replace(/^\/+/, "");
}

function splitParent(path: string) {
  const trimmed = path.replace(/\/+$/, "");
  const idx = trimmed.lastIndexOf("/");
  if (idx <= 0) return { parentId: "0", name: trimmed.replace(/^\//, "") };
  return { parentId: trimmed.slice(0, idx).replace(/^\//, "") || "0", name: trimmed.slice(idx + 1) };
}

function toEntry(item: BoxItem): FileEntry {
  return {
    id: item.id,
    name: item.name,
    path: item.id,
    isDir: item.type === "folder",
    size: item.size,
  };
}
