import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

/* ─── Brand ─────────────────────────────────────────────────────────── */
/* Temporary in-house mark — see docs/LOGO_DESIGN_BRIEF.md for the final
   design task. Swap the inline SVG when final art arrives. */
export function BrandMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#1B4FD8" />
      <rect x="18" y="10" width="5" height="11" rx="2.5" fill="#C7D2FE" />
      <rect x="41" y="10" width="5" height="11" rx="2.5" fill="#C7D2FE" />
      <rect x="11" y="16" width="42" height="38" rx="8" fill="#FFFFFF" />
      <path d="M11 24a8 8 0 0 1 8-8h26a8 8 0 0 1 8 8v4H11z" fill="#EEF2FF" />
      <path
        d="M22 38.5l7 7 13-13"
        fill="none"
        stroke="#1B4FD8"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Brand({ size = "md", light = false }: { size?: "sm" | "md"; light?: boolean }) {
  const text = size === "sm" ? "text-[15px]" : "text-base";
  return (
    <Link to="/" className="flex items-center gap-2">
      <BrandMark className={size === "sm" ? "h-6 w-6" : "h-7 w-7"} />
      <span className={`font-display ${text} ${light ? "text-white" : "text-foreground"}`}>
        Reservly
      </span>
    </Link>
  );
}

/* ─── Kicker — small uppercase section label ────────────────────────── */
export function Kicker({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "accent" | "primary";
}) {
  const color =
    tone === "accent"
      ? "text-accent"
      : tone === "primary"
        ? "text-primary"
        : "text-muted-foreground";
  return <span className={`kicker ${color}`}>{children}</span>;
}

/* ─── Page chrome ───────────────────────────────────────────────────── */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-15 max-w-5xl items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2">
          <Brand />
          <span className="hidden rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted-foreground sm:inline-flex">
            by Octolabs
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/auth" className="btn-frame hidden sm:inline-flex">
            Sign in
          </Link>
          <Link to="/onboarding" className="btn-solid">
            Start free →
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ─── Page wrapper ──────────────────────────────────────────────────── */
export function Page({
  children,
  width = "md",
}: {
  children: ReactNode;
  width?: "sm" | "md" | "lg" | "xl";
  grid?: boolean;
}) {
  const max =
    width === "sm"
      ? "max-w-md"
      : width === "md"
        ? "max-w-2xl"
        : width === "lg"
          ? "max-w-4xl"
          : "max-w-6xl";
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-surface px-4 py-8 sm:px-6 sm:py-12">
      <div className={`mx-auto ${max}`}>{children}</div>
    </div>
  );
}

/* ─── Card panel ────────────────────────────────────────────────────── */
export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card shadow-sm ${className}`}>
      {children}
    </div>
  );
}

/* ─── Status pill ───────────────────────────────────────────────────── */
export function StatusPill({ status }: { status: "confirmed" | "pending" | "cancelled" }) {
  const map = {
    confirmed: { cls: "bg-success-soft text-success", label: "Confirmed" },
    pending: { cls: "bg-warning-soft text-warning", label: "Pending" },
    cancelled: { cls: "bg-destructive-soft text-destructive", label: "Cancelled" },
  } as const;
  const item = map[status];
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.cls}`}
    >
      {item.label}
    </span>
  );
}

/* ─── Empty state ───────────────────────────────────────────────────── */
export function EmptyState({
  icon,
  title,
  sub,
  action,
}: {
  icon: string;
  title: string;
  sub: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="mb-3 text-4xl">{icon}</div>
      <div className="text-[15px] font-semibold text-foreground">{title}</div>
      <div className="mt-1.5 text-[13px] text-muted-foreground">{sub}</div>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
