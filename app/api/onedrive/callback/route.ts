import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { encryptSecret } from "@/lib/crypto";
import { getDb } from "@/lib/db";
import { connections } from "@/lib/db/schema";
import { exchangeCodeForTokens } from "@/lib/microsoft/oauth";
import { readOAuthState } from "@/lib/microsoft/state";

function fail(appUrl: string) {
  return NextResponse.redirect(
    `${appUrl}/app/connections?error=${encodeURIComponent("Verbindung fehlgeschlagen.")}`,
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error_description") || url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const appUrl = process.env.APP_URL || url.origin;

  if (error || !code || !state) {
    return fail(appUrl);
  }

  try {
    const session = await auth();
    const { userId } = readOAuthState(state);
    if (!session.userId || session.userId !== userId) {
      return NextResponse.redirect(
        `${appUrl}/app/connections?error=${encodeURIComponent("Sitzung abgelaufen – bitte erneut verbinden.")}`,
      );
    }
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refreshToken) {
      throw new Error("Microsoft hat kein Refresh-Token geliefert.");
    }
    const me = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    const profile = (await me.json()) as { displayName?: string; userPrincipalName?: string };
    const name = profile.displayName || profile.userPrincipalName || "OneDrive";
    await getDb().insert(connections).values({
      userId,
      kind: "onedrive",
      name,
      encryptedConfig: encryptSecret(
        JSON.stringify({
          refreshToken: tokens.refreshToken,
          accountLabel: profile.userPrincipalName,
        }),
      ),
    });
    return NextResponse.redirect(`${appUrl}/app/connections?connected=onedrive`);
  } catch {
    return fail(appUrl);
  }
}
