function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

export function getMicrosoftConfig() {
  return {
    clientId: requiredEnv("MICROSOFT_CLIENT_ID"),
    clientSecret: requiredEnv("MICROSOFT_CLIENT_SECRET"),
    tenantId: process.env.MICROSOFT_TENANT_ID || "common",
    redirectUri: `${requiredEnv("APP_URL").replace(/\/$/, "")}/api/onedrive/callback`,
  };
}

export const GRAPH_SCOPES = ["offline_access", "User.Read", "Files.ReadWrite.All"].join(" ");

export function microsoftAuthorizeUrl(state: string): string {
  const { clientId, tenantId, redirectUri } = getMicrosoftConfig();
  const url = new URL(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", GRAPH_SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export type TokenSet = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export async function exchangeCodeForTokens(code: string): Promise<TokenSet> {
  return requestTokens({
    grant_type: "authorization_code",
    code,
    redirect_uri: getMicrosoftConfig().redirectUri,
  });
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenSet> {
  return requestTokens({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

async function requestTokens(body: Record<string, string>): Promise<TokenSet> {
  const { clientId, clientSecret, tenantId } = getMicrosoftConfig();
  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        ...body,
      }),
    },
  );
  const json = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error_description?: string;
  };
  if (!response.ok || !json.access_token) {
    throw new Error(json.error_description || "Microsoft token request failed");
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token || body.refresh_token || "",
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
}
