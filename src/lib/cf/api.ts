import { getCFEnv } from "./db";
import { getCurrentOwner } from "./auth";
import type { Owner } from "@/lib/randevou/types";

export function jsonError(error: unknown, status = 400) {
  return Response.json(
    { error: error instanceof Error ? error.message : "Request failed." },
    { status },
  );
}

function originFrom(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * Verify the request Origin (or Referer) matches our canonical host.
 * Only enforced on state-changing methods (POST/PATCH/PUT/DELETE).
 * Returns a 403 Response if the check fails, null if it passes.
 *
 * SameSite=Lax already blocks cross-site navigations from setting cookies,
 * but cross-origin fetch() requests can still carry cookies. Checking Origin
 * closes that gap without requiring a CSRF token.
 */
export function requireSameOriginMutation(request: Request): Response | null {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return null;

  const requestOrigin = new URL(request.url).origin;
  const allowed = new Set([requestOrigin]);
  const siteUrl = getCFEnv()?.SITE_URL;
  if (siteUrl) allowed.add(new URL(siteUrl).origin);

  // In local dev, allow any localhost origin.
  const isLocalhost = requestOrigin.startsWith("http://localhost") ||
    requestOrigin.startsWith("http://127.0.0.1");
  if (isLocalhost) return null;

  const sourceOrigin =
    originFrom(request.headers.get("origin")) ?? originFrom(request.headers.get("referer"));

  if (!sourceOrigin || !allowed.has(sourceOrigin)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  return null;
}

export async function requireApiOwner(request: Request): Promise<Owner | Response> {
  const csrf = requireSameOriginMutation(request);
  if (csrf) return csrf;
  const owner = await getCurrentOwner(request);
  if (!owner) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }
  return owner;
}
