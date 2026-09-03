import { fetchPublicUrl } from "@/lib/security/ssrf";
import type { Connector, FileEntry, HttpConfig, ReadOptions, ReadResult, WriteOptions } from "./types";

export class HttpConnector implements Connector {
  kind = "http" as const;

  constructor(private config: HttpConfig) {}

  async list(_path: string): Promise<FileEntry[]> {
    return [await this.stat(this.config.url)];
  }

  async stat(_path: string): Promise<FileEntry> {
    const url = this.config.url;
    const head = await fetchPublicUrl(url, { method: "HEAD" });
    const name = decodeURIComponent(url.split("/").pop()?.split("?")[0] || "download");
    const size = Number(head.headers.get("content-length") || 0) || undefined;
    return { id: url, name, path: url, isDir: false, size, mimeType: head.headers.get("content-type") || undefined };
  }

  async read(_path: string, options?: ReadOptions): Promise<ReadResult> {
    const item = await this.stat(this.config.url);
    const headers: Record<string, string> = {};
    if (options?.offset && options.offset > 0) headers.Range = `bytes=${options.offset}-`;
    const response = await fetchPublicUrl(this.config.url, { headers });
    if (!response.ok || !response.body) throw new Error(`HTTP download failed (${response.status})`);
    return { stream: response.body, size: item.size, name: item.name };
  }

  async write(
    _path: string,
    _stream: ReadableStream<Uint8Array>,
    _options?: WriteOptions,
  ): Promise<void> {
    throw new Error("HTTP-URLs sind nur als Quelle nutzbar.");
  }
}
