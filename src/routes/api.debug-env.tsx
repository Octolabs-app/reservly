import { createFileRoute } from "@tanstack/react-router";
import { getCFEnv, isD1Enabled } from "@/lib/cf/db";

// TEMPORARY diagnostic — reports whether the Cloudflare D1/KV bindings reached
// the Worker at runtime. Remove after deployment is verified.
export const Route = createFileRoute("/api/debug-env")({
  component: Empty,
  server: {
    handlers: {
      GET: async () => {
        const env = getCFEnv() as Record<string, unknown> | null;
        return Response.json({
          isD1Enabled: isD1Enabled(),
          envCaptured: env !== null,
          envKeys: env ? Object.keys(env) : null,
          hasDB: env ? typeof env.DB : "no-env",
          hasKV: env ? typeof env.KV : "no-env",
          siteUrl: env ? (env.SITE_URL ?? null) : null,
          adminEmails: env ? (env.ADMIN_EMAILS ?? null) : null,
        });
      },
    },
  },
});

function Empty() {
  return null;
}
