import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Kicker, Page, Panel, SiteHeader } from "@/components/reservly/AppShell";
import { authModeLabel } from "@/lib/cf/auth";

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
        <Kicker tone="accent">{authModeLabel()}</Kicker>
        <h1 className="mt-5 font-serif text-4xl text-foreground">
          {mode === "sign-in" ? "Welcome back." : "Create your owner account."}
        </h1>

        <Panel className="mt-8 p-6">
          <div className="space-y-5">
            <Field label="Email">
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                className="w-full bg-transparent py-3 text-base text-foreground focus:outline-none"
              />
            </Field>
            <Field label="Password">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                className="w-full bg-transparent py-3 text-base text-foreground focus:outline-none"
              />
            </Field>

            {error && (
              <div className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              disabled={busy || !email || password.length < 6}
              onClick={submit}
              className="btn-solid w-full"
            >
              {busy ? "Working..." : mode === "sign-in" ? "Sign in" : "Create account"}
            </button>
          </div>
        </Panel>

        <button
          onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
          className="mt-6 font-display text-[10px] tracking-[0.3em] uppercase text-muted-foreground hover:text-accent"
        >
          {mode === "sign-in" ? "Create an account" : "I already have an account"}
        </button>
      </Page>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block border-b border-border-strong">
      <span className="kicker">{label}</span>
      {children}
    </label>
  );
}
