type ViteEnv = Record<string, string | boolean | undefined>;

function readEnv(name: string) {
  const env = import.meta.env as ViteEnv;
  const value = env[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function getClientEnv() {
  return {
    supabaseUrl: readEnv("VITE_SUPABASE_URL") ?? readEnv("SUPABASE_URL"),
    supabaseAnonKey: readEnv("VITE_SUPABASE_ANON_KEY") ?? readEnv("SUPABASE_ANON_KEY"),
    siteUrl:
      readEnv("VITE_SITE_URL") ??
      readEnv("SITE_URL") ??
      (typeof window !== "undefined" ? window.location.origin : "http://localhost:5173"),
  };
}

export function hasSupabaseClientEnv() {
  const env = getClientEnv();
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function getSiteUrl() {
  return getClientEnv().siteUrl.replace(/\/$/, "");
}
