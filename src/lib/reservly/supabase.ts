import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null | undefined;

export async function getBrowserSupabase() {
  if (browserClient !== undefined) return browserClient;
  browserClient = null;
  return browserClient;
}

export function isSupabaseEnabled() {
  return false;
}
