import { createFileRoute } from "@tanstack/react-router";
import { getCFEnv, isD1Enabled } from "@/lib/cf/db";

// TEMPORARY diagnostic — reports whether the Cloudflare D1/KV bindings reached
// the Worker at runtime, and via which access path. Remove after verification.
export const Route = createFileRoute("/api/debug-env")({
  component: Empty,
  server: {
    handlers: {
      GET: async () => {
        const g = globalThis as Record<string, unknown>;
        const env = getCFEnv() as Record<string, unknown> | null;

        // Probe alternate access paths for the CF bindings.
        const probes: Record<string, unknown> = {};
        try {
          const h3 = (await import("h3")) as Record<string, unknown>;
          probes.h3Exports = Object.keys(h3).filter((k) => /event|context/i.test(k));
          const useEvent = h3.useEvent as undefined | (() => unknown);
          if (typeof useEvent === "function") {
            const ev = useEvent() as { context?: Record<string, unknown> } | undefined;
            const ctx = ev?.context as Record<string, unknown> | undefined;
            probes.eventContextKeys = ctx ? Object.keys(ctx) : null;
            const cf = ctx?.cloudflare as { env?: Record<string, unknown> } | undefined;
            probes.cloudflareEnvKeys = cf?.env ? Object.keys(cf.env) : null;
          }
        } catch (e) {
          probes.h3Error = String(e);
        }

        return Response.json({
          isD1Enabled: isD1Enabled(),
          envCaptured: env !== null,
          envKeys: env ? Object.keys(env) : null,
          fetchEnvType: g.__cfFetchEnvType ?? "not-set",
          fetchEnvKeys: g.__cfFetchEnvKeys ?? null,
          probes,
        });
      },
    },
  },
});

function Empty() {
  return null;
}
