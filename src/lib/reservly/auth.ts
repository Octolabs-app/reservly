import { getDevOwner } from "./dev-store";
import { getBrowserSupabase, isSupabaseEnabled } from "./supabase";
import type { Owner } from "./types";

export async function getCurrentOwner(): Promise<Owner | null> {
  const supabase = await getBrowserSupabase();
  if (!supabase) return getDevOwner();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return {
    id: data.user.id,
    email: data.user.email,
    name:
      typeof data.user.user_metadata?.name === "string"
        ? data.user.user_metadata.name
        : data.user.email,
  };
}

export async function signInOwner(email: string, password: string) {
  const supabase = await getBrowserSupabase();
  if (!supabase) return getDevOwner();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error("Sign in failed.");
  return {
    id: data.user.id,
    email: data.user.email,
    name: data.user.email,
  };
}

export async function signUpOwner(email: string, password: string) {
  const supabase = await getBrowserSupabase();
  if (!supabase) return getDevOwner();

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error("Sign up failed.");
  return {
    id: data.user.id,
    email: data.user.email,
    name: data.user.email,
  };
}

export async function signOutOwner() {
  const supabase = await getBrowserSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
}

export function authModeLabel() {
  return isSupabaseEnabled() ? "Supabase Auth" : "Local dev mode";
}
