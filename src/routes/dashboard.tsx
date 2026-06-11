import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Brand } from "@/components/reservly/AppShell";
import { getCurrentOwner } from "@/lib/cf/auth";
import type { Owner } from "@/lib/reservly/types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — Reservly" }, { name: "robots", content: "noindex" }],
  }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [owner, setOwner] = useState<Owner | null | undefined>(undefined);
  const tabs = [
    { id: "home", label: "Today", to: "/dashboard" as const },
    { id: "bookings", label: "Bookings", to: "/dashboard/bookings" as const },
    { id: "settings", label: "Settings", to: "/dashboard/settings" as const },
  ];

  useEffect(() => {
    getCurrentOwner().then((currentOwner) => {
      setOwner(currentOwner);
      if (!currentOwner) window.location.href = "/auth?redirectTo=/dashboard";
    });
  }, []);

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST", credentials: "include" });
    window.location.href = "/";
  }

  if (owner === undefined) {
    return <div className="min-h-screen grid-bg-sm" />;
  }

  return (
    <div className="min-h-screen grid-bg-sm">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Brand size="sm" />

          <nav className="flex items-center gap-1">
            {tabs.map((t) => {
              const active =
                t.to === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(t.to);
              return (
                <Link
                  key={t.id}
                  to={t.to}
                  className={`relative px-4 py-2 font-display text-[11px] tracking-[0.3em] uppercase transition-colors ${
                    active ? "text-accent" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                  {active && <span className="absolute -bottom-px left-2 right-2 h-px bg-accent" />}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="hidden font-display text-[10px] tracking-[0.3em] uppercase text-muted-foreground hover:text-accent sm:block"
            >
              View site
            </Link>
            <button
              onClick={signOut}
              className="hidden font-display text-[10px] tracking-[0.3em] uppercase text-muted-foreground hover:text-accent sm:block"
            >
              Sign out
            </button>
            <div className="flex h-8 w-8 items-center justify-center border border-accent/40 font-display text-[11px] tracking-wider text-accent">
              {initials(owner?.email ?? owner?.name ?? "RO")}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}

function initials(value: string) {
  const clean = value.replace(/@.*/, "").replace(/[^a-zA-Z ]/g, " ");
  const parts = clean.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "R").concat(parts[1]?.[0] ?? "O").toUpperCase();
}
