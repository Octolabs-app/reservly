import type { SupabaseClient } from "@supabase/supabase-js";
import { getClientEnv, hasSupabaseClientEnv } from "./env";

let browserClient: SupabaseClient | null | undefined;

export async function getBrowserSupabase() {
  if (browserClient !== undefined) return browserClient;

  if (!hasSupabaseClientEnv()) {
    browserClient = null;
    return browserClient;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const env = getClientEnv();
  browserClient = createClient(env.supabaseUrl!, env.supabaseAnonKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}

export function isSupabaseEnabled() {
  return hasSupabaseClientEnv();
}
