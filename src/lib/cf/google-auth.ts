import { getCFEnv, getKV } from "./db";
import { getCurrentOwner, signInOrLinkGoogleOwner } from "./auth";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_SCOPES = "openid email profile";
const STATE_TTL_SECONDS = 10 * 60;

type GoogleConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

type GoogleState = {
  nonce: string;
  redirectTo: string;
  linkOwnerId?: string | null;
};

type GoogleTokenResponse = {
  id_token?: string;
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleJwtHeader = {
  kid?: string;
  alg?: string;
};

type GoogleClaims = {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nonce?: string;
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  picture?: string;
};

type JwksResponse = {
  keys: JsonWebKey[];
};

let jwksCache: { expiresAt: number; keys: JsonWebKey[] } | null = null;

export function googleAuthConfigured(): boolean {
  return Boolean(getGoogleConfig());
}

function getGoogleConfig(): GoogleConfig | null {
  const env = getCFEnv();
  if (!env?.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.SITE_URL) return null;
  const siteUrl = env.SITE_URL.replace(/\/$/, "");
  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: `${siteUrl}/api/auth/google/callback`,
  };
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return encodeBase64Url(bytes);
}

function stateKey(state: string) {
  return `oauth:google:${state}`;
}

export function safeGoogleRedirect(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/dashboard";
  }
  return ["/dashboard", "/onboarding", "/admin"].some(
    (prefix) => value === prefix || value.startsWith(`${prefix}/`),
  )
    ? value
    : "/dashboard";
}

export async function startGoogleAuth(request: Request): Promise<Response> {
  const config = getGoogleConfig();
  const kv = getKV();
  if (!config || !kv) {
    return Response.json({ error: "Google sign-in is not configured." }, { status: 501 });
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("mode");
  const redirectTo = safeGoogleRedirect(url.searchParams.get("redirectTo"));
  const currentOwner = await getCurrentOwner(request);

  if (mode === "link" && !currentOwner) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const state = randomToken();
  const payload: GoogleState = {
    nonce: randomToken(),
    redirectTo,
    linkOwnerId: mode === "link" ? currentOwner?.id : null,
  };
  await kv.put(stateKey(state), JSON.stringify(payload), { expirationTtl: STATE_TTL_SECONDS });

  const authUrl = new URL(GOOGLE_AUTH_URL);
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("redirect_uri", config.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", GOOGLE_SCOPES);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("nonce", payload.nonce);
  authUrl.searchParams.set("prompt", mode === "link" ? "select_account consent" : "select_account");

  return Response.redirect(authUrl.toString(), 302);
}

export async function finishGoogleAuth(request: Request): Promise<Response> {
  const config = getGoogleConfig();
  const kv = getKV();
  if (!config || !kv) {
    return Response.json({ error: "Google sign-in is not configured." }, { status: 501 });
  }

  const url = new URL(request.url);
  const providerError = url.searchParams.get("error");
  if (providerError) {
    return Response.json({ error: `Google sign-in failed: ${providerError}` }, { status: 400 });
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return Response.json({ error: "Invalid Google callback." }, { status: 400 });

  const rawState = await kv.get(stateKey(state));
  await kv.delete(stateKey(state));
  if (!rawState)
    return Response.json({ error: "Google sign-in expired. Try again." }, { status: 400 });

  const googleState = JSON.parse(rawState) as GoogleState;
  if (googleState.linkOwnerId) {
    const currentOwner = await getCurrentOwner(request);
    if (currentOwner?.id !== googleState.linkOwnerId) {
      return Response.json({ error: "Authentication required." }, { status: 401 });
    }
  }

  const tokens = await exchangeCodeForTokens(code, config);
  if (!tokens.id_token) throw new Error("Google did not return an ID token.");
  const claims = await verifyGoogleIdToken(tokens.id_token, config.clientId, googleState.nonce);
  if (!claims.sub || !claims.email) throw new Error("Google account details were incomplete.");

  const { sessionCookie } = await signInOrLinkGoogleOwner({
    googleSub: claims.sub,
    email: claims.email,
    emailVerified: claims.email_verified === true || claims.email_verified === "true",
    name: claims.name,
    picture: claims.picture,
    linkOwnerId: googleState.linkOwnerId,
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: googleState.redirectTo,
      "Set-Cookie": sessionCookie,
    },
  });
}

async function exchangeCodeForTokens(
  code: string,
  config: GoogleConfig,
): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
  });
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = (await response.json()) as GoogleTokenResponse;
  if (!response.ok || payload.error) {
    throw new Error(payload.error_description ?? payload.error ?? "Google token exchange failed.");
  }
  return payload;
}

function decodeBase64Url(value: string): Uint8Array {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function decodeJwtPart<T>(part: string): T {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(part))) as T;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function googleJwks(): Promise<JsonWebKey[]> {
  if (jwksCache && jwksCache.expiresAt > Date.now()) return jwksCache.keys;

  const response = await fetch(GOOGLE_JWKS_URL);
  if (!response.ok) throw new Error("Could not load Google signing keys.");
  const payload = (await response.json()) as JwksResponse;
  jwksCache = {
    expiresAt: Date.now() + 60 * 60 * 1000,
    keys: payload.keys,
  };
  return payload.keys;
}

async function verifyGoogleIdToken(
  idToken: string,
  clientId: string,
  nonce: string,
): Promise<GoogleClaims> {
  const [encodedHeader, encodedPayload, encodedSignature] = idToken.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature)
    throw new Error("Invalid Google ID token.");

  const header = decodeJwtPart<GoogleJwtHeader>(encodedHeader);
  if (header.alg !== "RS256" || !header.kid) throw new Error("Unsupported Google ID token.");

  const key = (await googleJwks()).find(
    (entry) => (entry as JsonWebKey & { kid?: string }).kid === header.kid,
  );
  if (!key) throw new Error("Google signing key was not found.");

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    key,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const verified = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    toArrayBuffer(decodeBase64Url(encodedSignature)),
    toArrayBuffer(new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)),
  );
  if (!verified) throw new Error("Google ID token signature was invalid.");

  const claims = decodeJwtPart<GoogleClaims>(encodedPayload);
  const validIssuer =
    claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com";
  const validAudience = Array.isArray(claims.aud)
    ? claims.aud.includes(clientId)
    : claims.aud === clientId;
  if (!validIssuer || !validAudience) throw new Error("Google ID token claims were invalid.");
  if (!claims.exp || claims.exp * 1000 <= Date.now()) throw new Error("Google ID token expired.");
  if (claims.nonce !== nonce) throw new Error("Google sign-in state was invalid.");

  return claims;
}
