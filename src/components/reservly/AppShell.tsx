import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

/* ─── Brand ─────────────────────────────────────────────────────────── */
export function Brand({ size = "md" }: { size?: "sm" | "md" }) {
  const text = size === "sm" ? "text-sm" : "text-base";
  return (
    <Link to="/" className="group flex items-center gap-2.5">
      <span className="relative flex h-6 w-6 items-center justify-center border border-accent/60 text-[10px] font-display tracking-[0.2em] text-accent transition-colors group-hover:border-accent">
        R
      </span>
      <span
        className={`font-display ${text} font-medium tracking-[0.3em] uppercase text-foreground`}
      >
        Reservly
      </span>
    </Link>
  );
}

/* ─── Kicker label with em-dash rules ──────────────────────────────── */
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
  return <span className={`kicker-rule ${color}`}>{children}</span>;
}

/* ─── Page chrome ───────────────────────────────────────────────────── */
export function SiteHeader() {
  const navCls =
    "font-display text-[11px] tracking-[0.3em] uppercase text-muted-foreground hover:text-accent transition-colors px-3 py-2";
  const activeCls = "text-foreground";
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Brand />
        <nav className="hidden items-center gap-1 md:flex">
          <Link
            to="/onboarding"
            className={navCls}
            activeProps={{ className: `${navCls} ${activeCls}` }}
          >
            Onboarding
          </Link>
          <Link to="/b/$slug" params={{ slug: "salon-rose" }} className={navCls}>
            Booking
          </Link>
          <Link
            to="/dashboard"
            className={navCls}
            activeProps={{ className: `${navCls} ${activeCls}` }}
          >
            Dashboard
          </Link>
        </nav>
        <Link to="/onboarding" className="btn-frame-primary">
          Get started
        </Link>
      </div>
    </header>
  );
}

/* ─── Page wrapper with grid backdrop ──────────────────────────────── */
export function Page({
  children,
  width = "md",
  grid = true,
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
    <div
      className={`min-h-[calc(100vh-4rem)] ${grid ? "grid-bg-sm" : ""} px-4 py-10 sm:px-6 sm:py-14`}
    >
      <div className={`mx-auto ${max}`}>{children}</div>
    </div>
  );
}

/* ─── Editorial framed panel (corner ticks) ─────────────────────────── */
export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative border border-border-strong bg-card/60 backdrop-blur-sm ${className}`}
    >
      <Corner pos="tl" />
      <Corner pos="tr" />
      <Corner pos="bl" />
      <Corner pos="br" />
      {children}
    </div>
  );
}

function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const map = {
    tl: "-top-px -left-px border-t border-l",
    tr: "-top-px -right-px border-t border-r",
    bl: "-bottom-px -left-px border-b border-l",
    br: "-bottom-px -right-px border-b border-r",
  } as const;
  return <span className={`pointer-events-none absolute h-3 w-3 border-accent ${map[pos]}`} />;
}
