import { copyInChunks } from "@/lib/transfers/copy";
import { refreshOAuthToken } from "@/lib/oauth/providers";
import type {
  Connector,
  FileEntry,
  GoogleConfig,
  ReadOptions,
  ReadResult,
  WriteOptions,
} from "./types";

const FOLDER = "application/vnd.google-apps.folder";

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
};

export class GoogleDriveConnector implements Connector {
  kind = "google" as const;
  private accessToken: string | null = null;
  private accessExpires = 0;

  constructor(
    private config: GoogleConfig,
    private onRefresh?: (next: GoogleConfig) => Promise<void>,
  ) {}

  async list(path: string): Promise<FileEntry[]> {
    const parent = normalizeId(path);
    const q = `'${parent.replace(/'/g, "\\'")}' in parents and trashed = false`;
    const url = new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.set("q", q);
    url.searchParams.set("fields", "files(id,name,mimeType,size)");
    url.searchParams.set("pageSize", "200");
    const data = await this.api<{ files: DriveFile[] }>(url.toString());
    return (data.files ?? [])
      .filter((file) => file.mimeType === FOLDER || !file.mimeType.startsWith("application/vnd.google-apps."))
      .map(toEntry);
  }

  async stat(path: string): Promise<FileEntry> {
    const id = normalizeId(path);
    if (id === "root") {
      return { id: "root", name: "Drive", path: "root", isDir: true };
    }
    const file = await this.api<DriveFile>(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?fields=id,name,mimeType,size`,
    );
    return toEntry(file);
  }

  async read(path: string, options?: ReadOptions): Promise<ReadResult> {
    const item = await this.stat(path);
    const headers: Record<string, string> = { Authorization: `Bearer ${await this.token()}` };
    if (options?.offset && options.offset > 0) headers.Range = `bytes=${options.offset}-`;
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(item.id)}?alt=media`,
      { headers },
    );
    if (!response.ok || !response.body) {
      throw new Error(`Google Drive download failed (${response.status})`);
    }
    return { stream: response.body, size: item.size, name: item.name };
  }

  async write(path: string, stream: ReadableStream<Uint8Array>, options?: WriteOptions): Promise<void> {
    const { parentId, name } = splitParent(path);
    const token = await this.token();
    const init = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": "application/octet-stream",
        ...(options?.size != null ? { "X-Upload-Content-Length": String(options.size) } : {}),
      },
      body: JSON.stringify({
        name,
        parents: parentId === "root" ? undefined : [parentId],
      }),
    });
    const uploadUrl = init.headers.get("location");
    if (!init.ok || !uploadUrl) throw new Error("Google Drive upload session failed");
    let offset = 0;
    const total = options?.size;
    await copyInChunks(stream, async (chunk) => {
      const start = offset;
      offset += chunk.byteLength;
      const end = offset - 1;
      const put = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Length": String(chunk.byteLength),
          "Content-Range": `bytes ${start}-${end}/${total ?? offset}`,
        },
        body: Buffer.from(chunk),
      });
      if (!put.ok && put.status !== 308) {
        throw new Error(`Google Drive chunk upload failed (${put.status})`);
      }
    });
  }

  private async token() {
    if (this.accessToken && Date.now() < this.accessExpires - 30_000) return this.accessToken;
    const tokens = await refreshOAuthToken("google", this.config.refreshToken);
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
    if (!response.ok) throw new Error(`Google Drive error (${response.status})`);
    return (await response.json()) as T;
  }
}

function normalizeId(path: string) {
  if (!path || path === "/" || path === "root") return "root";
  return path.replace(/^\/+/, "");
}

function splitParent(path: string) {
  const trimmed = path.replace(/\/+$/, "");
  const idx = trimmed.lastIndexOf("/");
  if (idx <= 0) return { parentId: "root", name: trimmed.replace(/^\//, "") };
  return { parentId: trimmed.slice(0, idx).replace(/^\//, "") || "root", name: trimmed.slice(idx + 1) };
}

function toEntry(file: DriveFile): FileEntry {
  return {
    id: file.id,
    name: file.name,
    path: file.id,
    isDir: file.mimeType === FOLDER,
    size: file.size ? Number(file.size) : undefined,
    mimeType: file.mimeType,
  };
}
