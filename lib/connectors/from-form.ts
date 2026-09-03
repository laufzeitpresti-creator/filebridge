import { encryptSecret } from "@/lib/crypto";
import { assertPublicHttpUrl } from "@/lib/security/ssrf";
import type { ConnectorKind, FtpConfig, HttpConfig, S3Config, SftpConfig, WebDavConfig } from "./types";

type FormBody = Record<string, unknown>;

export async function connectionFromForm(body: FormBody): Promise<{
  kind: ConnectorKind;
  name: string;
  config: object;
}> {
  const kind = String(body.kind || "");
  const name = String(body.name || "").trim();
  if (kind === "sftp") {
    if (!name || !body.host || !body.username) throw new Error("Name, Host und Benutzer sind Pflicht.");
    if (!body.password && !body.privateKey) throw new Error("Passwort oder privater Schlüssel wird benötigt.");
    const config: SftpConfig = {
      host: String(body.host).trim(),
      port: Number(body.port) || 22,
      username: String(body.username).trim(),
      password: body.password ? String(body.password) : undefined,
      privateKey: body.privateKey ? String(body.privateKey) : undefined,
    };
    return { kind, name, config };
  }
  if (kind === "ftp") {
    if (!name || !body.host || !body.username || !body.password) {
      throw new Error("Name, Host, Benutzer und Passwort sind Pflicht.");
    }
    const config: FtpConfig = {
      host: String(body.host).trim(),
      port: Number(body.port) || (body.secure ? 990 : 21),
      username: String(body.username).trim(),
      password: String(body.password),
      secure: Boolean(body.secure),
    };
    return { kind, name, config };
  }
  if (kind === "webdav") {
    if (!name || !body.url || !body.username || !body.password) {
      throw new Error("Name, URL, Benutzer und Passwort sind Pflicht.");
    }
    const url = String(body.url).trim();
    if (!url.startsWith("https://") && !url.startsWith("http://")) {
      throw new Error("WebDAV-URL muss http(s) sein.");
    }
    await assertPublicHttpUrl(url);
    const config: WebDavConfig = {
      url,
      username: String(body.username).trim(),
      password: String(body.password),
    };
    return { kind, name, config };
  }
  if (kind === "s3") {
    if (!name || !body.endpoint || !body.bucket || !body.accessKeyId || !body.secretAccessKey) {
      throw new Error("Name, Endpoint, Bucket und Keys sind Pflicht.");
    }
    const config: S3Config = {
      endpoint: String(body.endpoint).trim(),
      region: String(body.region || "auto"),
      bucket: String(body.bucket).trim(),
      accessKeyId: String(body.accessKeyId).trim(),
      secretAccessKey: String(body.secretAccessKey),
      forcePathStyle: body.forcePathStyle !== false,
    };
    return { kind, name, config };
  }
  if (kind === "http") {
    if (!body.url) throw new Error("URL ist Pflicht.");
    const url = String(body.url).trim();
    await assertPublicHttpUrl(url);
    const config: HttpConfig = { url };
    return { kind, name: name || hostname(url), config };
  }
  throw new Error("Dieser Verbindungstyp wird über OAuth oder automatisch angelegt.");
}

export function encryptConfig(config: object) {
  return encryptSecret(JSON.stringify(config));
}

function hostname(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return "HTTP-Link";
  }
}
