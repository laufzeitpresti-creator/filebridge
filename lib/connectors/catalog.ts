import type { ConnectorKind } from "./types";

export type ConnectorMeta = {
  kind: ConnectorKind;
  label: string;
  description: string;
  group: "cloud" | "server" | "device";
  auth: "oauth" | "form" | "builtin";
  canSource: boolean;
  canDest: boolean;
  rootPath: string;
};

export const CONNECTORS: ConnectorMeta[] = [
  {
    kind: "onedrive",
    label: "OneDrive",
    description: "Microsoft 365 / persönliches OneDrive",
    group: "cloud",
    auth: "oauth",
    canSource: true,
    canDest: true,
    rootPath: "root",
  },
  {
    kind: "google",
    label: "Google Drive",
    description: "Google-Konto, inklusive Shared Drives-Dateien im Drive",
    group: "cloud",
    auth: "oauth",
    canSource: true,
    canDest: true,
    rootPath: "root",
  },
  {
    kind: "dropbox",
    label: "Dropbox",
    description: "Dropbox-Dateien und -Ordner",
    group: "cloud",
    auth: "oauth",
    canSource: true,
    canDest: true,
    rootPath: "",
  },
  {
    kind: "box",
    label: "Box",
    description: "Box.com Geschäftskonten",
    group: "cloud",
    auth: "oauth",
    canSource: true,
    canDest: true,
    rootPath: "0",
  },
  {
    kind: "sftp",
    label: "SFTP",
    description: "Linux-Server, NAS, Hetzner per SSH",
    group: "server",
    auth: "form",
    canSource: true,
    canDest: true,
    rootPath: "/",
  },
  {
    kind: "ftp",
    label: "FTP / FTPS",
    description: "Klassisches FTP oder FTP mit TLS",
    group: "server",
    auth: "form",
    canSource: true,
    canDest: true,
    rootPath: "/",
  },
  {
    kind: "webdav",
    label: "WebDAV",
    description: "Nextcloud, ownCloud, Synology – auch in der iOS-Dateien-App",
    group: "server",
    auth: "form",
    canSource: true,
    canDest: true,
    rootPath: "/",
  },
  {
    kind: "s3",
    label: "S3 / R2 / MinIO",
    description: "AWS S3 und kompatible Object Stores",
    group: "server",
    auth: "form",
    canSource: true,
    canDest: true,
    rootPath: "",
  },
  {
    kind: "http",
    label: "HTTP(S)-URL",
    description: "Eine Datei per Link ziehen",
    group: "device",
    auth: "form",
    canSource: true,
    canDest: false,
    rootPath: "",
  },
  {
    kind: "local",
    label: "Dieses Gerät",
    description: "Datei vom Browser / Computer hochladen",
    group: "device",
    auth: "builtin",
    canSource: true,
    canDest: false,
    rootPath: "/",
  },
  {
    kind: "share",
    label: "Link für iPhone & Co.",
    description: "Datei ablegen und per Link aufs Handy holen",
    group: "device",
    auth: "builtin",
    canSource: true,
    canDest: true,
    rootPath: "/",
  },
];

export function connectorMeta(kind: string): ConnectorMeta | undefined {
  return CONNECTORS.find((item) => item.kind === kind);
}
