import { copyInChunks } from "@/lib/transfers/copy";
import { refreshAccessToken } from "@/lib/microsoft/oauth";
import type {
  Connector,
  FileEntry,
  OneDriveConfig,
  ReadOptions,
  ReadResult,
  WriteOptions,
} from "./types";

type DriveItem = {
  id: string;
  name: string;
  size?: number;
  file?: { mimeType?: string };
  folder?: { childCount?: number };
  parentReference?: { id?: string; path?: string };
};

export class OneDriveConnector implements Connector {
  kind = "onedrive" as const;
  private accessToken: string | null = null;
  private accessExpires = 0;

  constructor(
    private config: OneDriveConfig,
    private onRefresh?: (next: OneDriveConfig) => Promise<void>,
  ) {}

  async list(path: string): Promise<FileEntry[]> {
    const itemId = normalizeItemPath(path);
    const endpoint =
      itemId === "root"
        ? "https://graph.microsoft.com/v1.0/me/drive/root/children"
        : `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(itemId)}/children`;
    const data = await this.graph<{ value: DriveItem[] }>(endpoint);
    return (data.value ?? []).map(toEntry);
  }

  async stat(path: string): Promise<FileEntry> {
    const itemId = normalizeItemPath(path);
    const endpoint =
      itemId === "root"
        ? "https://graph.microsoft.com/v1.0/me/drive/root"
        : `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(itemId)}`;
    const item = await this.graph<DriveItem>(endpoint);
    return toEntry(item);
  }

  async read(path: string, options?: ReadOptions): Promise<ReadResult> {
    const item = await this.stat(path);
    const itemId = item.id;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${await this.token()}`,
    };
    if (options?.offset && options.offset > 0) {
      headers.Range = `bytes=${options.offset}-`;
    }
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(itemId)}/content`,
      { headers, redirect: "follow" },
    );
    if (!response.ok || !response.body) {
      throw new Error(`OneDrive download failed (${response.status})`);
    }
    return {
      stream: response.body,
      size: item.size,
      name: item.name,
    };
  }

  async write(
    path: string,
    stream: ReadableStream<Uint8Array>,
    options?: WriteOptions,
  ): Promise<void> {
    const { parentId, name } = splitParent(path);
    const size = options?.size;
    const token = await this.token();
    const sessionRes = await fetch(
      parentId === "root"
        ? `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(name)}:/createUploadSession`
        : `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(parentId)}:/${encodeURIComponent(name)}:/createUploadSession`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          item: { "@microsoft.graph.conflictBehavior": "replace", name },
        }),
      },
    );
    const session = (await sessionRes.json()) as { uploadUrl?: string };
    if (!sessionRes.ok || !session.uploadUrl) {
      throw new Error("OneDrive upload session failed");
    }

    let offset = 0;
    await copyInChunks(stream, async (chunk) => {
      const start = offset;
      offset += chunk.byteLength;
      const end = offset - 1;
      const total = size ?? offset;
      const put = await fetch(session.uploadUrl!, {
        method: "PUT",
        headers: {
          "Content-Length": String(chunk.byteLength),
          "Content-Range": `bytes ${start}-${end}/${total}`,
        },
        body: Buffer.from(chunk),
      });
      if (!put.ok && put.status !== 202 && put.status !== 201) {
        throw new Error(`OneDrive chunk upload failed (${put.status})`);
      }
    });
  }

  private async token(): Promise<string> {
    if (this.accessToken && Date.now() < this.accessExpires - 30_000) {
      return this.accessToken;
    }
    const tokens = await refreshAccessToken(this.config.refreshToken);
    this.accessToken = tokens.accessToken;
    this.accessExpires = tokens.expiresAt;
    if (tokens.refreshToken && tokens.refreshToken !== this.config.refreshToken) {
      this.config = { ...this.config, refreshToken: tokens.refreshToken };
      await this.onRefresh?.(this.config);
    }
    return this.accessToken;
  }

  private async graph<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${await this.token()}` },
    });
    if (!response.ok) {
      throw new Error(`Microsoft Graph error (${response.status})`);
    }
    return (await response.json()) as T;
  }
}

function normalizeItemPath(path: string): string {
  if (!path || path === "/" || path === "root") return "root";
  return path.replace(/^\/+/, "");
}

function splitParent(path: string): { parentId: string; name: string } {
  const trimmed = path.replace(/\/+$/, "");
  const idx = trimmed.lastIndexOf("/");
  if (idx <= 0) {
    return { parentId: "root", name: trimmed.replace(/^\//, "") };
  }
  return {
    parentId: trimmed.slice(0, idx).replace(/^\//, "") || "root",
    name: trimmed.slice(idx + 1),
  };
}

function toEntry(item: DriveItem): FileEntry {
  return {
    id: item.id,
    name: item.name,
    path: item.id,
    isDir: Boolean(item.folder),
    size: item.size,
    mimeType: item.file?.mimeType,
  };
}
