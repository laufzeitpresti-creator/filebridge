import { NextResponse } from "next/server";
import { hasMicrosoftConfig } from "@/lib/config";
import { jsonError, requireUserId } from "@/lib/http";
import { microsoftAuthorizeUrl } from "@/lib/microsoft/oauth";
import { createOAuthState } from "@/lib/microsoft/state";

export async function GET() {
  const auth = await requireUserId();
  if (auth.error) return auth.error;
  if (!hasMicrosoftConfig()) {
    return jsonError("Microsoft-Zugangsdaten fehlen. Siehe .env.example.", 503);
  }
  const url = microsoftAuthorizeUrl(createOAuthState(auth.userId));
  return NextResponse.redirect(url);
}
