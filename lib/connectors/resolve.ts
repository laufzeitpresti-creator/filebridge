import { and, eq } from "drizzle-orm";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { getDb } from "@/lib/db";
import { connections, type ConnectionRow } from "@/lib/db/schema";
import { BoxConnector } from "./box";
import { DropboxConnector } from "./dropbox";
import { FtpConnector } from "./ftp";
import { LocalConnector, ShareConnector } from "./fs";
import { GoogleDriveConnector } from "./google";
import { HttpConnector } from "./http";
import { OneDriveConnector } from "./onedrive";
import { S3Connector } from "./s3";
import { SftpConnector } from "./sftp";
import { WebDavConnector } from "./webdav";
import type {
  BoxConfig,
  Connector,
  DropboxConfig,
  FtpConfig,
  GoogleConfig,
  HttpConfig,
  OneDriveConfig,
  S3Config,
  SftpConfig,
  WebDavConfig,
} from "./types";

type TokenConfig = { refreshToken: string; accountLabel?: string };

function persistRefresh(row: ConnectionRow) {
  return async (next: TokenConfig) => {
    await getDb()
      .update(connections)
      .set({ encryptedConfig: encryptSecret(JSON.stringify(next)) })
      .where(and(eq(connections.id, row.id), eq(connections.userId, row.userId)));
  };
}

export async function getOwnedConnection(userId: string, id: string): Promise<ConnectionRow> {
  const [row] = await getDb()
    .select()
    .from(connections)
    .where(and(eq(connections.id, id), eq(connections.userId, userId)))
    .limit(1);
  if (!row) {
    throw new Error("Connection not found");
  }
  return row;
}

export function connectorFromRow(row: ConnectionRow): Connector {
  const config = JSON.parse(decryptSecret(row.encryptedConfig)) as Record<string, unknown>;
  switch (row.kind) {
    case "onedrive":
      return new OneDriveConnector(config as OneDriveConfig, persistRefresh(row));
    case "google":
      return new GoogleDriveConnector(config as GoogleConfig, persistRefresh(row));
    case "dropbox":
      return new DropboxConnector(config as DropboxConfig, persistRefresh(row));
    case "box":
      return new BoxConnector(config as BoxConfig, persistRefresh(row));
    case "sftp":
      return new SftpConnector(config as SftpConfig);
    case "ftp":
      return new FtpConnector(config as FtpConfig);
    case "webdav":
      return new WebDavConnector(config as WebDavConfig);
    case "s3":
      return new S3Connector(config as S3Config);
    case "http":
      return new HttpConnector(config as HttpConfig);
    case "local":
      return new LocalConnector({ userId: row.userId });
    case "share":
      return new ShareConnector({ userId: row.userId });
    default:
      throw new Error(`Unknown connector: ${row.kind}`);
  }
}
