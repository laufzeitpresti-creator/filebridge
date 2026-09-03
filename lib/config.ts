import { hasOAuthConfig } from "@/lib/oauth/providers";

export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES ?? 100 * 1024 * 1024);

export function isAppConfigured() {
  return Boolean(
    process.env.DATABASE_URL &&
      process.env.FILEBRIDGE_KMS_KEY &&
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.CLERK_SECRET_KEY,
  );
}

export function hasMicrosoftConfig() {
  return Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
}

export function oauthFlags() {
  return {
    onedrive: hasMicrosoftConfig(),
    google: hasOAuthConfig("google"),
    dropbox: hasOAuthConfig("dropbox"),
    box: hasOAuthConfig("box"),
  };
}
