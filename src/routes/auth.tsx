import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Page, Panel, SiteHeader } from "@/components/reservly/AppShell";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Sign in - Reservly" }, { name: "robots", content: "noindex" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const redirectTo =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("redirectTo") || "/dashboard"
      : "/dashboard";

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const endpoint = mode === "sign-in" ? "/api/auth/signin" : "/api/auth/signup";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Authentication failed.");
      window.location.href = redirectTo;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <Page width="sm">
        <Panel className="overflow-hidden">
          <div className="bg-primary px-6 py-5">
            <div className="text-[15px] font-bold text-white">
              {mode === "sign-in" ? "Welcome back" : "Create your owner account"}
            </div>
            <div className="mt-0.5 text-xs text-white/70">
              {mode === "sign-in"
                ? "Sign in to manage your bookings."
                : "Free to start — your booking link is minutes away."}
            </div>
          </div>

          <form
            className="space-y-4 p-6"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <div>
              <label className="kicker mb-1.5 block" htmlFor="auth-email">
                Email
              </label>
              <input
                id="auth-email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="input-field"
              />
            </div>
            <div>
              <label className="kicker mb-1.5 block" htmlFor="auth-password">
                Password
              </label>
              <input
                id="auth-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                placeholder={mode === "sign-up" ? "At least 6 characters" : "Your password"}
                className="input-field"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/25 bg-destructive-soft px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy || !email || password.length < 6}
              className="btn-solid w-full py-3"
            >
              {busy ? "Working…" : mode === "sign-in" ? "Sign in" : "Create account"}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode(mode === "sign-in" ? "sign-up" : "sign-in");
                setError(null);
              }}
              className="block w-full text-center text-[13px] font-medium text-primary hover:underline"
            >
              {mode === "sign-in" ? "New here? Create an account" : "I already have an account"}
            </button>
          </form>
        </Panel>
      </Page>
    </>
  );
}
