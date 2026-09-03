import { mkdir } from "node:fs/promises";
import path from "node:path";

export function dataRoot() {
  return process.env.FILEBRIDGE_DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
}

export function userDir(kind: "uploads" | "shares", userId: string) {
  return path.join(/*turbopackIgnore: true*/ dataRoot(), kind, userId);
}

export function safeJoin(root: string, rel: string) {
  const cleaned = rel.replace(/^\/+/, "").replace(/\0/g, "");
  const resolved = path.resolve(root, cleaned);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error("Invalid path");
  }
  return resolved;
}

export function safeFileName(raw: string) {
  const base = path.basename(raw).replace(/[^\w.\-()+ ]/g, "_").replace(/^\.+/, "").slice(0, 255);
  if (!base) throw new Error("Ungültiger Dateiname.");
  return base;
}

export async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}
