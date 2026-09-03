import { decryptSecret, encryptSecret } from "@/lib/crypto";

export function createShareToken(userId: string, relPath: string, fileName: string) {
  return encryptSecret(
    JSON.stringify({
      userId,
      path: relPath,
      name: fileName,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    }),
  );
}

export function readShareToken(token: string) {
  const parsed = JSON.parse(decryptSecret(token)) as {
    userId?: string;
    path?: string;
    name?: string;
    exp?: number;
  };
  if (!parsed.userId || !parsed.path || !parsed.name || !parsed.exp || parsed.exp < Date.now()) {
    throw new Error("Download-Link ungültig oder abgelaufen.");
  }
  return { userId: parsed.userId, path: parsed.path, name: parsed.name };
}
