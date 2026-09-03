import { decryptSecret, encryptSecret } from "@/lib/crypto";

export type OAuthState = {
  userId: string;
  exp: number;
};

export function createOAuthState(userId: string): string {
  return encryptSecret(JSON.stringify({ userId, exp: Date.now() + 10 * 60 * 1000 }));
}

export function readOAuthState(state: string): OAuthState {
  const parsed = JSON.parse(decryptSecret(state)) as OAuthState;
  if (!parsed.userId || parsed.exp < Date.now()) {
    throw new Error("OAuth state expired");
  }
  return parsed;
}
