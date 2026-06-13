import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Brand } from "@/components/randevou/AppShell";
import { getCurrentOwner } from "@/lib/cf/auth";
import type { Owner } from "@/lib/randevou/types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — Randevou" }, { name: "robots", content: "noindex" }],
  }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [owner, setOwner] = useState<Owner | null | undefined>(undefined);
  const tabs = [
    { id: "home", label: "Home", icon: "🏠", to: "/dashboard" as const },
    { id: "bookings", label: "Bookings", icon: "📋", to: "/dashboard/bookings" as const },
    { id: "settings", label: "Settings", icon: "⚙️", to: "/dashboard/settings" as const },
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
    return <div className="min-h-screen bg-surface" />;
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-30 bg-ink">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Brand size="sm" light />

          <nav className="flex items-center gap-0.5">
            {tabs.map((t) => {
              const active =
                t.to === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(t.to);
              return (
                <Link
                  key={t.id}
                  to={t.to}
                  className={`flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-2 text-xs transition-colors ${
                    active
                      ? "bg-white/12 font-medium text-white"
                      : "text-white/45 hover:text-white/80"
                  }`}
                >
                  <span className="hidden sm:inline">{t.icon}</span>
                  <span>{t.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              onClick={signOut}
              className="min-h-10 rounded-lg px-2 text-xs text-white/45 transition-colors hover:text-white"
            >
              Sign out
            </button>
            <div
              title={owner?.email ?? "Account"}
              className="hidden h-8 w-8 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-white sm:flex"
            >
              {initials(owner?.name ?? owner?.email ?? "RO")}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-9">
        <Outlet />
      </main>
    </div>
  );
}

function initials(value: string) {
  const clean = value.replace(/@.*/, "").replace(/[^a-zA-Z ]/g, " ");
  const parts = clean.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "R").concat(parts[1]?.[0] ?? "").toUpperCase();
}
