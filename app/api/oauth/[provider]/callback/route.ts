import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { encryptSecret } from "@/lib/crypto";
import { getDb } from "@/lib/db";
import { connections } from "@/lib/db/schema";
import { readOAuthState } from "@/lib/microsoft/state";
import { exchangeOAuthCode, type OAuthProvider } from "@/lib/oauth/providers";

const kinds: Record<string, OAuthProvider> = {
  google: "google",
  dropbox: "dropbox",
  box: "box",
};

function fail(appUrl: string) {
  return NextResponse.redirect(
    `${appUrl}/app/connections?error=${encodeURIComponent("Verbindung fehlgeschlagen.")}`,
  );
}

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  const url = new URL(request.url);
  const error = url.searchParams.get("error_description") || url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const appUrl = process.env.APP_URL || url.origin;
  const kind = kinds[provider];

  if (!kind || error || !code || !state) {
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
    const tokens = await exchangeOAuthCode(kind, code);
    if (!tokens.refreshToken) {
      throw new Error("Kein Refresh-Token erhalten. App-Consent prüfen.");
    }
    const name = await accountName(kind, tokens.accessToken);
    await getDb().insert(connections).values({
      userId,
      kind,
      name,
      encryptedConfig: encryptSecret(
        JSON.stringify({ refreshToken: tokens.refreshToken, accountLabel: name }),
      ),
    });
    return NextResponse.redirect(`${appUrl}/app/connections?connected=${kind}`);
  } catch {
    return fail(appUrl);
  }
}

async function accountName(provider: OAuthProvider, accessToken: string) {
  if (provider === "google") {
    const res = await fetch("https://www.googleapis.com/drive/v3/about?fields=user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = (await res.json()) as { user?: { displayName?: string; emailAddress?: string } };
    return json.user?.emailAddress || json.user?.displayName || "Google Drive";
  }
  if (provider === "dropbox") {
    const res = await fetch("https://api.dropboxapi.com/2/users/get_current_account", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = (await res.json()) as { email?: string; name?: { display_name?: string } };
    return json.email || json.name?.display_name || "Dropbox";
  }
  const res = await fetch("https://api.box.com/2.0/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json()) as { name?: string; login?: string };
  return json.login || json.name || "Box";
}
