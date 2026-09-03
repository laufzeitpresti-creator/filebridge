import { createOAuthState } from "@/lib/microsoft/state";

export type OAuthProvider = "google" | "dropbox" | "box";

type ProviderSpec = {
  authorize: string;
  token: string;
  scopes: string;
  extraAuth?: Record<string, string>;
};

const PROVIDERS: Record<OAuthProvider, ProviderSpec> = {
  google: {
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    scopes: "https://www.googleapis.com/auth/drive",
    extraAuth: { access_type: "offline", prompt: "consent" },
  },
  dropbox: {
    authorize: "https://www.dropbox.com/oauth2/authorize",
    token: "https://api.dropboxapi.com/oauth2/token",
    scopes: "files.content.read files.content.write files.metadata.read files.metadata.write",
    extraAuth: { token_access_type: "offline" },
  },
  box: {
    authorize: "https://account.box.com/api/oauth2/authorize",
    token: "https://api.box.com/oauth2/token",
    scopes: "root_readwrite",
  },
};

function envPrefix(provider: OAuthProvider) {
  return provider.toUpperCase();
}

export function hasOAuthConfig(provider: OAuthProvider) {
  const prefix = envPrefix(provider);
  return Boolean(process.env[`${prefix}_CLIENT_ID`] && process.env[`${prefix}_CLIENT_SECRET`]);
}

function oauthEnv(provider: OAuthProvider) {
  const prefix = envPrefix(provider);
  const clientId = process.env[`${prefix}_CLIENT_ID`];
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`];
  if (!clientId || !clientSecret) {
    throw new Error(`${prefix}_CLIENT_ID / ${prefix}_CLIENT_SECRET fehlen.`);
  }
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error("APP_URL is not set");
  return {
    clientId,
    clientSecret,
    redirectUri: `${appUrl.replace(/\/$/, "")}/api/oauth/${provider}/callback`,
  };
}

export function oauthAuthorizeUrl(provider: OAuthProvider, userId: string) {
  const spec = PROVIDERS[provider];
  const { clientId, redirectUri } = oauthEnv(provider);
  const url = new URL(spec.authorize);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", spec.scopes);
  url.searchParams.set("state", createOAuthState(userId));
  for (const [key, value] of Object.entries(spec.extraAuth ?? {})) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

export type TokenSet = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export async function exchangeOAuthCode(provider: OAuthProvider, code: string): Promise<TokenSet> {
  return tokenRequest(provider, {
    grant_type: "authorization_code",
    code,
    redirect_uri: oauthEnv(provider).redirectUri,
  });
}

export async function refreshOAuthToken(provider: OAuthProvider, refreshToken: string): Promise<TokenSet> {
  return tokenRequest(provider, {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

async function tokenRequest(provider: OAuthProvider, body: Record<string, string>): Promise<TokenSet> {
  const spec = PROVIDERS[provider];
  const { clientId, clientSecret } = oauthEnv(provider);
  const response = await fetch(spec.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      ...body,
    }),
  });
  const json = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error_description?: string;
    error?: string;
  };
  if (!response.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || `${provider} token request failed`);
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token || body.refresh_token || "",
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
}
