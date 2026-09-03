import { AwsClient } from "aws4fetch";
import { copyInChunks } from "@/lib/transfers/copy";
import type { Connector, FileEntry, ReadOptions, ReadResult, S3Config, WriteOptions } from "./types";

export class S3Connector implements Connector {
  kind = "s3" as const;
  private aws: AwsClient;

  constructor(private config: S3Config) {
    this.aws = new AwsClient({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region || "us-east-1",
      service: "s3",
    });
  }

  async list(path: string): Promise<FileEntry[]> {
    const prefix = prefixOf(path);
    const url = new URL(this.objectUrl(""));
    url.searchParams.set("list-type", "2");
    url.searchParams.set("delimiter", "/");
    if (prefix) url.searchParams.set("prefix", prefix);
    const xml = await this.text(url.toString());
    const folders = [...xml.matchAll(/<Prefix>([^<]+)<\/Prefix>/g)]
      .map((match) => match[1])
      .filter((value) => value !== prefix)
      .map((value) => {
        const name = value.slice(prefix.length).replace(/\/$/, "");
        return { id: value, name, path: value, isDir: true } satisfies FileEntry;
      });
    const files = [...xml.matchAll(/<Contents>[\s\S]*?<Key>([^<]+)<\/Key>[\s\S]*?<Size>([^<]+)<\/Size>/g)]
      .map((match) => ({ key: match[1], size: Number(match[2]) }))
      .filter((item) => item.key !== prefix)
      .map((item) => {
        const name = item.key.slice(prefix.length);
        return {
          id: item.key,
          name,
          path: item.key,
          isDir: false,
          size: item.size,
        } satisfies FileEntry;
      })
      .filter((item) => item.name && !item.name.includes("/"));
    return [...folders, ...files];
  }

  async stat(path: string): Promise<FileEntry> {
    const key = keyOf(path);
    if (!key) return { id: "", name: this.config.bucket, path: "", isDir: true };
    const response = await this.aws.fetch(this.objectUrl(key), { method: "HEAD" });
    if (!response.ok) throw new Error(`S3 stat failed (${response.status})`);
    const size = Number(response.headers.get("content-length") || 0);
    return { id: key, name: key.split("/").at(-1) || key, path: key, isDir: false, size };
  }

  async read(path: string, options?: ReadOptions): Promise<ReadResult> {
    const item = await this.stat(path);
    const headers: Record<string, string> = {};
    if (options?.offset && options.offset > 0) headers.Range = `bytes=${options.offset}-`;
    const response = await this.aws.fetch(this.objectUrl(keyOf(path)), { headers });
    if (!response.ok || !response.body) throw new Error(`S3 download failed (${response.status})`);
    return { stream: response.body, size: item.size, name: item.name };
  }

  async write(path: string, stream: ReadableStream<Uint8Array>, options?: WriteOptions): Promise<void> {
    const key = keyOf(path);
    const created = await this.text(this.objectUrl(key) + "?uploads", { method: "POST" });
    const uploadId = created.match(/<UploadId>([^<]+)<\/UploadId>/)?.[1];
    if (!uploadId) throw new Error("S3 multipart start failed");
    const etags: { part: number; etag: string }[] = [];
    let part = 1;
    try {
      await copyInChunks(stream, async (chunk) => {
        const url = `${this.objectUrl(key)}?partNumber=${part}&uploadId=${encodeURIComponent(uploadId)}`;
        const put = await this.aws.fetch(url, { method: "PUT", body: Buffer.from(chunk) });
        const etag = put.headers.get("etag");
        if (!put.ok || !etag) throw new Error(`S3 part ${part} failed`);
        etags.push({ part, etag });
        part += 1;
      });
      const body =
        `<CompleteMultipartUpload>` +
        etags.map((item) => `<Part><PartNumber>${item.part}</PartNumber><ETag>${item.etag}</ETag></Part>`).join("") +
        `</CompleteMultipartUpload>`;
      const complete = await this.aws.fetch(
        `${this.objectUrl(key)}?uploadId=${encodeURIComponent(uploadId)}`,
        { method: "POST", body },
      );
      if (!complete.ok) throw new Error("S3 multipart complete failed");
    } catch (error) {
      await this.aws.fetch(`${this.objectUrl(key)}?uploadId=${encodeURIComponent(uploadId)}`, { method: "DELETE" }).catch(
        () => undefined,
      );
      throw error;
    }
    void options;
  }

  private objectUrl(key: string) {
    const endpoint = this.config.endpoint.replace(/\/$/, "");
    const encoded = key.split("/").map(encodeURIComponent).join("/");
    if (this.config.forcePathStyle !== false) {
      return `${endpoint}/${this.config.bucket}/${encoded}`;
    }
    const host = new URL(endpoint);
    return `${host.protocol}//${this.config.bucket}.${host.host}/${encoded}`;
  }

  private async text(url: string, init?: RequestInit) {
    const response = await this.aws.fetch(url, init);
    const body = await response.text();
    if (!response.ok) throw new Error(`S3 request failed (${response.status})`);
    return body;
  }
}

function prefixOf(path: string) {
  if (!path || path === "/" || path === "root") return "";
  return path.endsWith("/") ? path.replace(/^\/+/, "") : `${path.replace(/^\/+/, "")}/`;
}

function keyOf(path: string) {
  if (!path || path === "/" || path === "root") return "";
  return path.replace(/^\/+/, "");
}
