import { getCFEnv } from "./db";
import { getCurrentOwner } from "./auth";
import type { Owner } from "@/lib/randevou/types";

export function jsonError(error: unknown, status = 400) {
  return Response.json(
    { error: error instanceof Error ? error.message : "Request failed." },
    { status },
  );
}

/**
 * CA-11: Verify the request Origin header matches our canonical host.
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
  const origin = request.headers.get("origin");
  if (!origin) return null; // no Origin → SameSite=Lax handles it
  // In local dev (no CF env) allow any localhost origin.
  const siteUrl = getCFEnv()?.SITE_URL ?? "";
  if (!siteUrl) {
    if (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) {
      return null;
    }
  } else {
    const expected = new URL(siteUrl).origin;
    if (origin === expected) return null;
  }
  return Response.json({ error: "Forbidden." }, { status: 403 });
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
