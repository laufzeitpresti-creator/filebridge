export type ConnectorKind =
  | "onedrive"
  | "google"
  | "dropbox"
  | "box"
  | "sftp"
  | "ftp"
  | "webdav"
  | "s3"
  | "http"
  | "local"
  | "share";

export type FileEntry = {
  id: string;
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
  mimeType?: string;
};

export type ReadResult = {
  stream: ReadableStream<Uint8Array>;
  size?: number;
  name: string;
};

export type WriteOptions = {
  size?: number;
  offset?: number;
};

export type ReadOptions = {
  offset?: number;
};

export interface Connector {
  kind: ConnectorKind;
  list(path: string): Promise<FileEntry[]>;
  stat(path: string): Promise<FileEntry>;
  read(path: string, options?: ReadOptions): Promise<ReadResult>;
  write(
    path: string,
    stream: ReadableStream<Uint8Array>,
    options?: WriteOptions,
  ): Promise<void>;
}

export type OAuthTokenConfig = {
  refreshToken: string;
  accountLabel?: string;
};

export type OneDriveConfig = OAuthTokenConfig;
export type GoogleConfig = OAuthTokenConfig;
export type DropboxConfig = OAuthTokenConfig;
export type BoxConfig = OAuthTokenConfig;

export type SftpConfig = {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
};

export type FtpConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  secure: boolean;
};

export type WebDavConfig = {
  url: string;
  username: string;
  password: string;
};

export type S3Config = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
};

export type HttpConfig = {
  url: string;
};

export type LocalConfig = {
  userId: string;
};

export type ShareConfig = {
  userId: string;
};
