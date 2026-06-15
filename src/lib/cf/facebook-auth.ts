// src/lib/cf/facebook-auth.ts
// Facebook Login (OAuth 2.0) for business-owner sign-in and account linking.
// Standard OAuth2 code flow — no JWKS/ID-token needed; access_token is used
// to fetch user info directly from the Graph API.

import { getCFEnv, getKV } from "./db";
import { getCurrentOwner, signInOrLinkFacebookOwner } from "./auth";

const FB_AUTH_URL = "https://www.facebook.com/v19.0/dialog/oauth";
const FB_TOKEN_URL = "https://graph.facebook.com/v19.0/oauth/access_token";
const FB_ME_URL = "https://graph.facebook.com/me";
const FB_SCOPES = "email,public_profile";
const STATE_TTL_SECONDS = 10 * 60;

type FacebookConfig = {
  appId: string;
  appSecret: string;
  redirectUri: string;
};

type FacebookState = {
  nonce: string;
  redirectTo: string;
  linkOwnerId?: string | null;
};

type FacebookTokenResponse = {
  access_token?: string;
  token_type?: string;
  error?: { message?: string; type?: string; code?: number };
};

type FacebookMeResponse = {
  id?: string;
  name?: string;
  email?: string;
  error?: { message?: string };
};

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
  return `oauth:facebook:${state}`;
}

export function facebookAuthConfigured(): boolean {
  return Boolean(getFacebookConfig());
}

function getFacebookConfig(): FacebookConfig | null {
  const env = getCFEnv();
  if (!env?.META_APP_ID || !env.META_APP_SECRET || !env.SITE_URL) return null;
  const siteUrl = env.SITE_URL.replace(/\/$/, "");
  return {
    appId: env.META_APP_ID,
    appSecret: env.META_APP_SECRET,
    redirectUri: `${siteUrl}/api/auth/facebook/callback`,
  };
}

export function safeFacebookRedirect(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/dashboard";
  }
  return ["/dashboard", "/onboarding", "/admin"].some(
    (prefix) => value === prefix || value.startsWith(`${prefix}/`),
  )
    ? value
    : "/dashboard";
}

export async function startFacebookAuth(request: Request): Promise<Response> {
  const config = getFacebookConfig();
  const kv = getKV();
  if (!config || !kv) {
    return Response.json({ error: "Facebook sign-in is not configured." }, { status: 501 });
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("mode");
  const redirectTo = safeFacebookRedirect(url.searchParams.get("redirectTo"));
  const currentOwner = await getCurrentOwner(request);

  if (mode === "link" && !currentOwner) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const state = randomToken();
  const payload: FacebookState = {
    nonce: randomToken(),
    redirectTo,
    linkOwnerId: mode === "link" ? currentOwner?.id : null,
  };
  await kv.put(stateKey(state), JSON.stringify(payload), { expirationTtl: STATE_TTL_SECONDS });

  const authUrl = new URL(FB_AUTH_URL);
  authUrl.searchParams.set("client_id", config.appId);
  authUrl.searchParams.set("redirect_uri", config.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", FB_SCOPES);
  authUrl.searchParams.set("state", state);

  return Response.redirect(authUrl.toString(), 302);
}

export async function finishFacebookAuth(request: Request): Promise<Response> {
  const config = getFacebookConfig();
  const kv = getKV();
  if (!config || !kv) {
    return Response.json({ error: "Facebook sign-in is not configured." }, { status: 501 });
  }

  const url = new URL(request.url);
  const providerError = url.searchParams.get("error");
  const errorDesc = url.searchParams.get("error_description");
  if (providerError) {
    return Response.json(
      { error: `Facebook sign-in failed: ${errorDesc ?? providerError}` },
      { status: 400 },
    );
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return Response.json({ error: "Invalid Facebook callback." }, { status: 400 });
  }

  const rawState = await kv.get(stateKey(state));
  await kv.delete(stateKey(state));
  if (!rawState) {
    return Response.json({ error: "Facebook sign-in expired. Try again." }, { status: 400 });
  }

  const fbState = JSON.parse(rawState) as FacebookState;
  if (fbState.linkOwnerId) {
    const currentOwner = await getCurrentOwner(request);
    if (currentOwner?.id !== fbState.linkOwnerId) {
      return Response.json({ error: "Authentication required." }, { status: 401 });
    }
  }

  // Exchange code for access_token
  const tokenUrl = new URL(FB_TOKEN_URL);
  tokenUrl.searchParams.set("client_id", config.appId);
  tokenUrl.searchParams.set("client_secret", config.appSecret);
  tokenUrl.searchParams.set("redirect_uri", config.redirectUri);
  tokenUrl.searchParams.set("code", code);

  const tokenRes = await fetch(tokenUrl.toString());
  const tokenData = (await tokenRes.json().catch(() => null)) as FacebookTokenResponse | null;
  if (!tokenRes.ok || !tokenData?.access_token) {
    const msg = tokenData?.error?.message ?? "Facebook token exchange failed.";
    throw new Error(msg);
  }

  // Fetch user profile
  const meUrl = new URL(FB_ME_URL);
  meUrl.searchParams.set("fields", "id,name,email");
  meUrl.searchParams.set("access_token", tokenData.access_token);

  const meRes = await fetch(meUrl.toString());
  const me = (await meRes.json().catch(() => null)) as FacebookMeResponse | null;
  if (!meRes.ok || !me?.id) {
    throw new Error(me?.error?.message ?? "Could not fetch Facebook profile.");
  }

  if (!me.email) {
    throw new Error(
      "Your Facebook account has no verified email. Add an email to your Facebook account and try again.",
    );
  }

  const { sessionCookie } = await signInOrLinkFacebookOwner({
    facebookId: me.id,
    email: me.email,
    name: me.name,
    linkOwnerId: fbState.linkOwnerId,
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: fbState.redirectTo,
      "Set-Cookie": sessionCookie,
    },
  });
}
