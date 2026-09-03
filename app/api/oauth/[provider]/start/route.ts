import { NextResponse } from "next/server";
import { hasOAuthConfig, oauthAuthorizeUrl, type OAuthProvider } from "@/lib/oauth/providers";
import { jsonError, requireUserId } from "@/lib/http";

const providers = new Set<OAuthProvider>(["google", "dropbox", "box"]);

export async function GET(
  _request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const auth = await requireUserId();
  if (auth.error) return auth.error;
  const { provider } = await context.params;
  if (!providers.has(provider as OAuthProvider)) {
    return jsonError("Unbekannter Anbieter.", 404);
  }
  const id = provider as OAuthProvider;
  if (!hasOAuthConfig(id)) {
    return jsonError(`${id.toUpperCase()}_CLIENT_ID / SECRET fehlen.`, 503);
  }
  return NextResponse.redirect(oauthAuthorizeUrl(id, auth.userId));
}
