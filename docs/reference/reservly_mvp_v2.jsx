/**
 * reservly_mvp_v2.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Reservly — WhatsApp-native booking for island businesses
 * by Octolabs
 *
 * This file is a self-contained demo of all 5 screens:
 *   ① Landing page (new)
 *   ② Onboarding wizard (3 steps)
 *   ③ Public booking page (/b/[slug])
 *   ④ Booking confirmation
 *   ⑤ Owner dashboard (Home / Bookings / Settings tabs)
 *
 * WIRING GUIDE FOR INTEGRATION AGENT
 * ────────────────────────────────────
 * Search this file for the tag  // [WIRE]  to find every point
 * that needs a real backend call.
 *
 * Search for  // [MISSING]  to find stubs that need a new file/module.
 *
 * Stack:
 *   - TanStack Start (createServerFn)   NOT Next.js api routes
 *   - Supabase for DB + Auth
 *   - Twilio for WhatsApp messages
 *   - Cloudflare Pages for hosting
 *   - Stripe for subscriptions
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef } from "react";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
// Island-blue palette. Primary is a deep Mauritian lagoon blue,
// accent is warm coral for CTAs and highlights.
const C = {
  // Primaries
  primary: "#1B4FD8", // lagoon blue
  primaryDark: "#1340B0",
  primaryLight: "#EEF2FF",
  primaryMid: "#C7D2FE",

  // Accent (coral/warm)
  accent: "#E8593C",
  accentLight: "#FEF0EC",

  // Semantic
  success: "#059669",
  successLight: "#ECFDF5",
  warning: "#D97706",
  warningLight: "#FFFBEB",
  danger: "#DC2626",
  dangerLight: "#FEF2F2",

  // Neutrals
  ink: "#0F172A", // page text
  body: "#334155",
  mid: "#64748B",
  muted: "#94A3B8",
  subtle: "#CBD5E1",
  border: "#E2E8F0",
  borderLight: "#F1F5F9",
  surface: "#F8FAFC",
  white: "#FFFFFF",

  // WhatsApp green (used only on WA badges)
  wa: "#25D366",
  waLight: "#EDFDF4",
};

const SHADOW = {
  xs: "0 1px 2px rgba(0,0,0,.05)",
  sm: "0 1px 3px rgba(0,0,0,.07), 0 1px 2px rgba(0,0,0,.04)",
  md: "0 4px 12px rgba(0,0,0,.08)",
  lg: "0 8px 32px rgba(0,0,0,.12)",
  xl: "0 20px 48px rgba(0,0,0,.14)",
};

// ─── UTILITY ──────────────────────────────────────────────────────────────────

/** Slugify a business name for the booking URL */
function slugify(name = "") {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "your-business"
  );
}

/** Format a Date as "Wed 10 Jun" */
function fmtDate(d) {
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

// ─── ATOMS ────────────────────────────────────────────────────────────────────

const Tag = ({ children, color = C.primary, bg }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 8px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: ".03em",
      color,
      background: bg ?? color + "18",
      border: `1px solid ${color}28`,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

const Btn = ({
  children,
  variant = "primary",
  full,
  onClick,
  style = {},
  size = "md",
  disabled,
  type = "button",
}) => {
  const base =
    {
      primary: { bg: C.primary, fg: C.white, bdr: "none", hover: C.primaryDark },
      accent: { bg: C.accent, fg: C.white, bdr: "none", hover: "#C94B32" },
      success: { bg: C.success, fg: C.white, bdr: "none", hover: "#047857" },
      outline: {
        bg: "transparent",
        fg: C.primary,
        bdr: `1.5px solid ${C.primary}`,
        hover: C.primaryLight,
      },
      ghost: { bg: C.surface, fg: C.mid, bdr: `1px solid ${C.border}`, hover: C.borderLight },
      danger: { bg: C.dangerLight, fg: C.danger, bdr: `1px solid ${C.danger}30`, hover: "#FEE2E2" },
      wa: { bg: C.wa, fg: C.white, bdr: "none", hover: "#1EB85A" },
    }[variant] ?? {};
  const pad = size === "sm" ? "6px 12px" : size === "lg" ? "14px 28px" : "10px 18px";
  const fs = size === "sm" ? 12 : size === "lg" ? 15 : 13;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: pad,
        borderRadius: 10,
        border: base.bdr,
        background: disabled ? C.borderLight : base.bg,
        color: disabled ? C.muted : base.fg,
        fontSize: fs,
        fontWeight: 500,
        cursor: disabled ? "default" : "pointer",
        width: full ? "100%" : "auto",
        transition: "opacity .15s, background .15s, transform .1s",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = base.hover;
      }}
      onMouseLeave={(e) => {
        if (!disabled) e.currentTarget.style.background = disabled ? C.borderLight : base.bg;
      }}
      onMouseDown={(e) => {
        if (!disabled) e.currentTarget.style.transform = "scale(.97)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {children}
    </button>
  );
};

const Input = ({
  label,
  placeholder,
  prefix,
  value,
  onChange,
  type = "text",
  note,
  required,
  error,
}) => (
  <div style={{ marginBottom: 14 }}>
    {label && (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 5,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: C.mid,
            textTransform: "uppercase",
            letterSpacing: ".06em",
          }}
        >
          {label}
          {required && <span style={{ color: C.danger, marginLeft: 2 }}>*</span>}
        </span>
      </div>
    )}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        border: `1.5px solid ${error ? C.danger : C.border}`,
        borderRadius: 10,
        overflow: "hidden",
        background: C.white,
        transition: "border-color .15s",
      }}
      onFocusCapture={(e) => {
        e.currentTarget.style.borderColor = error ? C.danger : C.primary;
        e.currentTarget.style.boxShadow = `0 0 0 3px ${error ? C.danger : C.primary}18`;
      }}
      onBlurCapture={(e) => {
        e.currentTarget.style.borderColor = error ? C.danger : C.border;
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {prefix && (
        <span
          style={{
            padding: "10px 12px",
            background: C.surface,
            fontSize: 13,
            color: C.mid,
            borderRight: `1px solid ${C.border}`,
            whiteSpace: "nowrap",
          }}
        >
          {prefix}
        </span>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={onChange}
        style={{
          flex: 1,
          padding: "10px 12px",
          border: "none",
          outline: "none",
          fontSize: 14,
          color: C.ink,
          background: "transparent",
          fontFamily: "inherit",
        }}
      />
    </div>
    {error && <div style={{ fontSize: 11, color: C.danger, marginTop: 4 }}>⚠ {error}</div>}
    {note && !error && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{note}</div>}
  </div>
);

const Card = ({ children, style = {}, onClick }) => (
  <div
    onClick={onClick}
    style={{
      background: C.white,
      borderRadius: 14,
      border: `1px solid ${C.border}`,
      boxShadow: SHADOW.sm,
      ...style,
    }}
  >
    {children}
  </div>
);

const SectionLabel = ({ children }) => (
  <div
    style={{
      fontSize: 10,
      fontWeight: 700,
      color: C.muted,
      textTransform: "uppercase",
      letterSpacing: ".08em",
      marginBottom: 10,
    }}
  >
    {children}
  </div>
);

const Toast = ({ msg, visible, type = "success" }) => {
  const bg = type === "error" ? C.danger : type === "warning" ? C.warning : C.ink;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: `translateX(-50%) translateY(${visible ? 0 : 16}px)`,
        background: bg,
        color: C.white,
        padding: "10px 18px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 500,
        boxShadow: SHADOW.lg,
        opacity: visible ? 1 : 0,
        transition: "all .3s",
        pointerEvents: "none",
        zIndex: 9999,
        whiteSpace: "nowrap",
        display: "flex",
        alignItems: "center",
        gap: 7,
      }}
    >
      {msg}
    </div>
  );
};

const ProgressBar = ({ steps, current }) => (
  <div style={{ display: "flex", gap: 4 }}>
    {Array.from({ length: steps }, (_, i) => (
      <div
        key={i}
        style={{
          flex: 1,
          height: 3,
          borderRadius: 999,
          background: i < current ? C.white : "rgba(255,255,255,.25)",
          transition: "background .25s",
        }}
      />
    ))}
  </div>
);

/** Inline toggle switch */
const Toggle = ({ on, onChange }) => (
  <div
    onClick={() => onChange(!on)}
    style={{
      width: 38,
      height: 22,
      borderRadius: 999,
      cursor: "pointer",
      background: on ? C.primary : C.subtle,
      position: "relative",
      transition: "background .2s",
      flexShrink: 0,
    }}
  >
    <div
      style={{
        width: 18,
        height: 18,
        borderRadius: "50%",
        background: C.white,
        position: "absolute",
        top: 2,
        left: on ? 18 : 2,
        transition: "left .2s",
        boxShadow: "0 1px 3px rgba(0,0,0,.25)",
      }}
    />
  </div>
);

/** Status pill used across dashboard */
const StatusPill = ({ status }) => {
  const map = {
    confirmed: { bg: C.successLight, color: C.success, label: "Confirmed" },
    pending: { bg: C.warningLight, color: C.warning, label: "Pending" },
    cancelled: { bg: C.dangerLight, color: C.danger, label: "Cancelled" },
    open: { bg: C.surface, color: C.muted, label: "Available" },
  };
  const s = map[status] ?? map.open;
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 9px",
        borderRadius: 999,
        background: s.bg,
        color: s.color,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
};

/** Skeleton shimmer for loading states */
const Skeleton = ({ w = "100%", h = 18, radius = 8, style = {} }) => (
  <div
    style={{
      width: w,
      height: h,
      borderRadius: radius,
      background: `linear-gradient(90deg, ${C.borderLight} 25%, ${C.surface} 50%, ${C.borderLight} 75%)`,
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
      ...style,
    }}
  />
);

/** Empty state block */
const EmptyState = ({ icon, title, sub, action }) => (
  <div style={{ textAlign: "center", padding: "40px 24px" }}>
    <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
    <div style={{ fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 6 }}>{title}</div>
    <div style={{ fontSize: 13, color: C.mid, marginBottom: action ? 20 : 0 }}>{sub}</div>
    {action}
  </div>
);

// ─── SCREEN: LANDING PAGE ─────────────────────────────────────────────────────
/**
 * Landing page at "/"
 * [WIRE] The "Start free" CTA should navigate to /onboarding
 * [WIRE] The demo booking link should open a sample /b/demo-salon page
 * [MISSING] Create src/routes/index.tsx and render this component
 */
const Landing = ({ onGetStarted }) => {
  const features = [
    {
      icon: "📲",
      title: "Customers book via WhatsApp",
      body: "They tap your link, pick a slot, and get a WhatsApp confirmation — no app, no account.",
    },
    {
      icon: "⚡",
      title: "Set up in 5 minutes",
      body: "Add your services, set your hours, share the link. That's it. No training needed.",
    },
    {
      icon: "🔔",
      title: "Automatic reminders",
      body: "Customers get a 24-hour reminder. They reply CONFIRM or CANCEL. You stop chasing.",
    },
    {
      icon: "🌍",
      title: "English & French",
      body: "One toggle. Customers see your booking page in their language, reminders arrive in theirs.",
    },
  ];

  const testimonials = [
    {
      name: "Marie L.",
      biz: "Studio Belle, Port Louis",
      quote:
        "My no-shows dropped by half in the first month. I send the link in every WhatsApp group I'm in.",
      avatar: "M",
    },
    {
      name: "Raj P.",
      biz: "FitZone Coaching, Q.Bornes",
      quote:
        "I was booking on pen and paper before. Now I check the dashboard in the morning and my whole week is there.",
      avatar: "R",
    },
  ];

  const pricing = [
    {
      name: "Free",
      price: "$0",
      sub: "Up to 30 bookings/mo",
      cta: "Start free",
      highlight: false,
      features: ["1 service", "WhatsApp confirmation", "Booking link", "EN/FR toggle"],
    },
    {
      name: "Pro",
      price: "$5",
      sub: "per month",
      cta: "Start free trial",
      highlight: true,
      features: [
        "Unlimited bookings",
        "Up to 5 services",
        "24h reminders",
        "Google Calendar sync",
        "Basic analytics",
      ],
    },
    {
      name: "Studio",
      price: "$12",
      sub: "per month",
      cta: "Start free trial",
      highlight: false,
      features: [
        "Everything in Pro",
        "Up to 4 staff",
        "Intake form",
        "Review request flow",
        "Priority support",
      ],
    },
  ];

  return (
    <div
      style={{
        fontFamily: "'Inter', -apple-system, sans-serif",
        background: C.white,
        color: C.ink,
      }}
    >
      {/* Nav */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(255,255,255,.88)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C.borderLight}`,
          padding: "0 24px",
        }}
      >
        <div
          style={{
            maxWidth: 1080,
            margin: "0 auto",
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: C.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{ color: C.white, fontSize: 13, fontWeight: 800, letterSpacing: "-.02em" }}
              >
                R
              </span>
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-.02em", color: C.ink }}>
              Reservly
            </span>
            <Tag color={C.mid} bg={C.surface}>
              by Octolabs
            </Tag>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* [WIRE] Link to /dashboard for logged-in owners */}
            <Btn variant="ghost" size="sm">
              Sign in
            </Btn>
            <Btn variant="primary" size="sm" onClick={onGetStarted}>
              Start free →
            </Btn>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div
        style={{
          background: `linear-gradient(160deg, ${C.primaryLight} 0%, ${C.white} 60%)`,
          padding: "80px 24px 64px",
        }}
      >
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 12px",
              borderRadius: 999,
              background: C.waLight,
              border: `1px solid ${C.wa}30`,
              marginBottom: 24,
            }}
          >
            <span style={{ fontSize: 11, color: C.wa }}>●</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: C.success }}>
              WhatsApp-native · Mauritius & Islands
            </span>
          </div>
          <h1
            style={{
              fontSize: "clamp(32px, 6vw, 54px)",
              fontWeight: 800,
              letterSpacing: "-.03em",
              lineHeight: 1.1,
              color: C.ink,
              marginBottom: 20,
            }}
          >
            Your customers book. <span style={{ color: C.primary }}>WhatsApp confirms.</span>
          </h1>
          <p
            style={{
              fontSize: 17,
              color: C.body,
              lineHeight: 1.7,
              marginBottom: 36,
              maxWidth: 520,
              margin: "0 auto 36px",
            }}
          >
            Reservly gives every island business a booking link that works with the tools your
            customers already use. No app. No friction. No no-shows.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Btn variant="primary" size="lg" onClick={onGetStarted}>
              Get your booking link free →
            </Btn>
            {/* [WIRE] This should open /b/demo-salon in a new tab or inline modal */}
            <Btn variant="ghost" size="lg">
              See a live demo ↗
            </Btn>
          </div>
          <div style={{ marginTop: 16, fontSize: 12, color: C.muted }}>
            Free plan · No credit card · Set up in 5 minutes
          </div>
        </div>
      </div>

      {/* URL preview strip */}
      <div
        style={{
          background: C.ink,
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 12, color: "rgba(255,255,255,.5)", fontFamily: "monospace" }}>
          reservly.app/b/
        </span>
        <span
          style={{ fontSize: 14, fontWeight: 700, color: C.primaryMid, fontFamily: "monospace" }}
        >
          your-business-name
        </span>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>
          ← share this link anywhere
        </span>
      </div>

      {/* Features */}
      <div style={{ padding: "72px 24px", background: C.white }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: C.primary,
                textTransform: "uppercase",
                letterSpacing: ".1em",
                marginBottom: 10,
              }}
            >
              How it works
            </div>
            <h2
              style={{
                fontSize: "clamp(24px, 4vw, 36px)",
                fontWeight: 700,
                letterSpacing: "-.02em",
                color: C.ink,
              }}
            >
              Built for the way island businesses work
            </h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 20,
            }}
          >
            {features.map((f) => (
              <div
                key={f.title}
                style={{
                  padding: "24px",
                  borderRadius: 14,
                  border: `1px solid ${C.border}`,
                  background: C.white,
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 6 }}>
                  {f.title}
                </div>
                <div style={{ fontSize: 13, color: C.mid, lineHeight: 1.6 }}>{f.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Social proof */}
      <div style={{ padding: "56px 24px", background: C.surface }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.02em", color: C.ink }}>
              Real businesses, real results
            </h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {testimonials.map((t) => (
              <Card key={t.name} style={{ padding: 24 }}>
                <div
                  style={{
                    fontSize: 15,
                    color: C.body,
                    lineHeight: 1.7,
                    marginBottom: 16,
                    fontStyle: "italic",
                  }}
                >
                  "{t.quote}"
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: C.primaryLight,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: 700,
                      color: C.primary,
                    }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{t.biz}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div style={{ padding: "72px 24px", background: C.white }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2
              style={{
                fontSize: "clamp(24px, 4vw, 36px)",
                fontWeight: 700,
                letterSpacing: "-.02em",
                color: C.ink,
                marginBottom: 10,
              }}
            >
              Simple pricing. No surprises.
            </h2>
            <p style={{ fontSize: 15, color: C.mid }}>
              Start free. Upgrade when you need it. Cancel any time.
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
              alignItems: "stretch",
            }}
          >
            {pricing.map((p) => (
              <Card
                key={p.name}
                style={{
                  padding: "28px 24px",
                  border: p.highlight ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
                  position: "relative",
                }}
              >
                {p.highlight && (
                  <div
                    style={{
                      position: "absolute",
                      top: -12,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: C.primary,
                      color: C.white,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "3px 12px",
                      borderRadius: 999,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Most popular
                  </div>
                )}
                <div style={{ fontSize: 14, fontWeight: 700, color: C.mid, marginBottom: 6 }}>
                  {p.name}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                  <span
                    style={{ fontSize: 32, fontWeight: 800, color: C.ink, letterSpacing: "-.03em" }}
                  >
                    {p.price}
                  </span>
                  {p.price !== "$0" && (
                    <span style={{ fontSize: 13, color: C.muted }}>{p.sub}</span>
                  )}
                </div>
                {p.price === "$0" && (
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>{p.sub}</div>
                )}
                <div style={{ height: 1, background: C.borderLight, margin: "16px 0" }} />
                {p.features.map((f) => (
                  <div
                    key={f}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                      fontSize: 13,
                      color: C.body,
                    }}
                  >
                    <span style={{ color: C.success, fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
                  </div>
                ))}
                <div style={{ marginTop: 24 }}>
                  {/* [WIRE] CTA links to /onboarding, pre-selecting the plan tier */}
                  <Btn variant={p.highlight ? "primary" : "outline"} full onClick={onGetStarted}>
                    {p.cta}
                  </Btn>
                </div>
              </Card>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: C.muted }}>
            Annual billing saves 2 months · Pro $50/yr · Studio $120/yr
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: `1px solid ${C.borderLight}`,
          padding: "32px 24px",
          background: C.surface,
        }}
      >
        <div
          style={{
            maxWidth: 1080,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>Reservly</span>
            <span style={{ fontSize: 12, color: C.muted }}>by Octolabs · Mauritius 🇲🇺</span>
          </div>
          <div style={{ fontSize: 12, color: C.muted }}>
            {/* [WIRE] Add links to /privacy and /terms when pages exist */}
            <span style={{ cursor: "pointer" }}>Privacy</span>
            <span style={{ margin: "0 8px" }}>·</span>
            <span style={{ cursor: "pointer" }}>Terms</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── SCREEN: ONBOARDING ───────────────────────────────────────────────────────
/**
 * 3-step wizard for new business owners.
 * [WIRE] Step 3 "Go live" button calls createServerFn → insert into:
 *   - businesses table (name, category, city, slug, lang, owner_id)
 *   - services table (name, duration, price, business_id)
 *   - availability table (day, from, to, business_id)
 * [WIRE] Supabase Auth email magic link must run BEFORE onboarding
 *   (owner must be authenticated to get an owner_id)
 * [WIRE] Slug collision check: query businesses table before save;
 *   if slug taken append "-2", "-3", etc.
 * [WIRE] After save redirect to /dashboard
 * [MISSING] Create src/lib/server/business.ts with createBusiness() serverFn
 */
const Onboarding = ({ onDone }) => {
  const [step, setStep] = useState(1);
  const [biz, setBiz] = useState({ name: "", category: "", city: "", lang: "Both" });
  const [services, setServices] = useState([{ name: "", duration: "45", price: "" }]);
  const [hours, setHours] = useState(
    ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d, i) => ({
      day: d,
      open: i < 6,
      from: "09:00",
      to: "18:00",
    })),
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const cats = [
    { label: "Beauty", icon: "💇" },
    { label: "Health", icon: "🏥" },
    { label: "Fitness", icon: "🏋️" },
    { label: "Tutor", icon: "📚" },
    { label: "Home", icon: "🔧" },
    { label: "Hospitality", icon: "🏨" },
    { label: "Other", icon: "⭐" },
  ];

  const fromTimes = ["07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00"];
  const toTimes = ["15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];

  const validate1 = () => {
    const e = {};
    if (!biz.name.trim()) e.name = "Business name is required";
    if (!biz.category) e.category = "Pick a category";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validate2 = () => {
    const e = {};
    if (!services[0].name.trim()) e.service0 = "Add at least one service name";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && !validate1()) return;
    if (step === 2 && !validate2()) return;
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    handleSave();
  };

  const handleSave = async () => {
    setSaving(true);
    // [WIRE] Replace this timeout with a real createServerFn call:
    // const result = await createBusiness({ biz, services, hours });
    // if (result.error) { setSaving(false); showToast(result.error, "error"); return; }
    // navigate({ to: "/dashboard" });
    await new Promise((r) => setTimeout(r, 1200)); // remove this stub
    setSaving(false);
    onDone?.({ biz, services, hours });
  };

  const slug = slugify(biz.name);

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <Card style={{ overflow: "hidden" }}>
        {/* Header band */}
        <div style={{ background: C.primary, padding: "20px 24px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 7,
                background: "rgba(255,255,255,.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: C.white, fontSize: 12, fontWeight: 800 }}>R</span>
            </div>
            <span
              style={{ color: C.white, fontSize: 15, fontWeight: 700, letterSpacing: "-.01em" }}
            >
              Reservly
            </span>
          </div>
          <div style={{ color: "rgba(255,255,255,.7)", fontSize: 12, marginBottom: 10 }}>
            Step {step} of 3 — {["Your business", "Your services", "Opening hours"][step - 1]}
          </div>
          <ProgressBar steps={3} current={step} />
        </div>

        <div style={{ padding: "24px 24px 28px" }}>
          {/* ── Step 1: Business info ── */}
          {step === 1 && (
            <>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: C.ink, marginBottom: 4 }}>
                Tell us about your business
              </h2>
              <p style={{ fontSize: 13, color: C.mid, marginBottom: 22 }}>
                This is what customers see on your booking page.
              </p>

              <Input
                label="Business name"
                required
                placeholder="e.g. Salon Rose"
                value={biz.name}
                error={errors.name}
                onChange={(e) => setBiz({ ...biz, name: e.target.value })}
              />

              {biz.name && (
                <div
                  style={{
                    marginTop: -6,
                    marginBottom: 14,
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: C.primaryLight,
                    border: `1px solid ${C.primaryMid}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 11, color: C.mid }}>Your link:</span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: C.primary,
                      fontFamily: "monospace",
                    }}
                  >
                    reservly.app/b/{slug}
                  </span>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <SectionLabel>
                  Category
                  {errors.category && (
                    <span style={{ color: C.danger, marginLeft: 6 }}>{errors.category}</span>
                  )}
                </SectionLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {cats.map((c) => (
                    <div
                      key={c.label}
                      onClick={() => {
                        setBiz({ ...biz, category: c.label });
                        setErrors({ ...errors, category: "" });
                      }}
                      style={{
                        padding: "7px 12px",
                        borderRadius: 999,
                        fontSize: 13,
                        cursor: "pointer",
                        border: `1.5px solid ${biz.category === c.label ? C.primary : C.border}`,
                        background: biz.category === c.label ? C.primaryLight : C.white,
                        color: biz.category === c.label ? C.primary : C.body,
                        fontWeight: biz.category === c.label ? 600 : 400,
                        transition: "all .15s",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <span>{c.icon}</span>
                      {c.label}
                    </div>
                  ))}
                </div>
              </div>

              <Input
                label="City"
                placeholder="Port Louis, Quatre Bornes, Curepipe…"
                value={biz.city}
                onChange={(e) => setBiz({ ...biz, city: e.target.value })}
              />

              <div style={{ marginBottom: 6 }}>
                <SectionLabel>Booking page language</SectionLabel>
                <div style={{ display: "flex", gap: 8 }}>
                  {["English", "Français", "Both"].map((l) => (
                    <div
                      key={l}
                      onClick={() => setBiz({ ...biz, lang: l })}
                      style={{
                        flex: 1,
                        padding: "9px 0",
                        textAlign: "center",
                        borderRadius: 9,
                        cursor: "pointer",
                        border: `1.5px solid ${biz.lang === l ? C.primary : C.border}`,
                        background: biz.lang === l ? C.primaryLight : C.white,
                        color: biz.lang === l ? C.primary : C.mid,
                        fontWeight: biz.lang === l ? 600 : 400,
                        fontSize: 13,
                        transition: "all .15s",
                      }}
                    >
                      {l}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>
                  {/* [WIRE] Language choice stored on business row; booking page reads it to set default locale */}
                  "Both" shows a language toggle on your booking page.
                </div>
              </div>
            </>
          )}

          {/* ── Step 2: Services ── */}
          {step === 2 && (
            <>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: C.ink, marginBottom: 4 }}>
                Add your services
              </h2>
              <p style={{ fontSize: 13, color: C.mid, marginBottom: 22 }}>
                Free plan: 1 service · Pro: up to 5 · Studio: unlimited
              </p>

              {services.map((s, i) => (
                <Card key={i} style={{ padding: 16, marginBottom: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: C.muted,
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                      }}
                    >
                      Service {i + 1}
                    </span>
                    {i > 0 && (
                      <span
                        style={{ fontSize: 12, color: C.danger, cursor: "pointer" }}
                        onClick={() => setServices(services.filter((_, j) => j !== i))}
                      >
                        Remove
                      </span>
                    )}
                  </div>
                  <Input
                    label="Name"
                    placeholder="e.g. Haircut, Physio session, 1h tutoring…"
                    value={s.name}
                    error={i === 0 ? errors.service0 : undefined}
                    onChange={(e) => {
                      const n = [...services];
                      n[i] = { ...n[i], name: e.target.value };
                      setServices(n);
                      setErrors({ ...errors, service0: "" });
                    }}
                  />
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <SectionLabel>Duration</SectionLabel>
                      <select
                        value={s.duration}
                        onChange={(e) => {
                          const n = [...services];
                          n[i] = { ...n[i], duration: e.target.value };
                          setServices(n);
                        }}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: `1.5px solid ${C.border}`,
                          fontSize: 13,
                          color: C.ink,
                          background: C.white,
                          fontFamily: "inherit",
                          outline: "none",
                        }}
                      >
                        {["15", "30", "45", "60", "90", "120"].map((d) => (
                          <option key={d} value={d}>
                            {d} min
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <Input
                        label="Price (optional)"
                        placeholder="Rs 350"
                        value={s.price}
                        onChange={(e) => {
                          const n = [...services];
                          n[i] = { ...n[i], price: e.target.value };
                          setServices(n);
                        }}
                      />
                    </div>
                  </div>
                </Card>
              ))}

              {/* [WIRE] Free plan gate: disable this if services.length >= 1 and user is on Free */}
              {services.length < 5 && (
                <Btn
                  variant="outline"
                  full
                  onClick={() =>
                    setServices([...services, { name: "", duration: "45", price: "" }])
                  }
                >
                  + Add another service
                </Btn>
              )}
            </>
          )}

          {/* ── Step 3: Hours ── */}
          {step === 3 && (
            <>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: C.ink, marginBottom: 4 }}>
                Set your opening hours
              </h2>
              <p style={{ fontSize: 13, color: C.mid, marginBottom: 22 }}>
                Customers can only book slots during these hours.
              </p>
              <Card style={{ overflow: "hidden" }}>
                {hours.map((h, i) => (
                  <div
                    key={h.day}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 16px",
                      borderBottom: i < 6 ? `1px solid ${C.borderLight}` : "none",
                    }}
                  >
                    <Toggle
                      on={h.open}
                      onChange={(v) => {
                        const n = [...hours];
                        n[i] = { ...n[i], open: v };
                        setHours(n);
                      }}
                    />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: h.open ? 500 : 400,
                        color: h.open ? C.ink : C.muted,
                        minWidth: 94,
                      }}
                    >
                      {h.day}
                    </span>
                    {h.open ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginLeft: "auto",
                        }}
                      >
                        <select
                          value={h.from}
                          onChange={(e) => {
                            const n = [...hours];
                            n[i] = { ...n[i], from: e.target.value };
                            setHours(n);
                          }}
                          style={{
                            padding: "5px 8px",
                            borderRadius: 7,
                            border: `1px solid ${C.border}`,
                            fontSize: 12,
                            color: C.ink,
                            background: C.white,
                            fontFamily: "inherit",
                          }}
                        >
                          {fromTimes.map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                        <span style={{ fontSize: 12, color: C.muted }}>–</span>
                        <select
                          value={h.to}
                          onChange={(e) => {
                            const n = [...hours];
                            n[i] = { ...n[i], to: e.target.value };
                            setHours(n);
                          }}
                          style={{
                            padding: "5px 8px",
                            borderRadius: 7,
                            border: `1px solid ${C.border}`,
                            fontSize: 12,
                            color: C.ink,
                            background: C.white,
                            fontFamily: "inherit",
                          }}
                        >
                          {toTimes.map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}>
                        Closed
                      </span>
                    )}
                  </div>
                ))}
              </Card>
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: C.waLight,
                  border: `1px solid ${C.wa}28`,
                  fontSize: 12,
                  color: C.success,
                }}
              >
                💬 After you go live, customers get a WhatsApp confirmation within seconds of
                booking.
              </div>
            </>
          )}

          {/* Nav row */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, gap: 10 }}>
            {step > 1 ? (
              <Btn variant="ghost" onClick={() => setStep(step - 1)}>
                ← Back
              </Btn>
            ) : (
              <div />
            )}
            <Btn variant={step === 3 ? "accent" : "primary"} onClick={handleNext} disabled={saving}>
              {saving ? "Saving…" : step === 3 ? "Go live 🚀" : "Continue →"}
            </Btn>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ─── SCREEN: BOOKING PAGE ─────────────────────────────────────────────────────
/**
 * Public booking page at /b/[slug] — no auth required.
 *
 * [WIRE] On route load:
 *   const biz = await getBusinessBySlug(params.slug)
 *   if (!biz) throw redirect({ to: "/404" })
 *   const slots = await getAvailableSlots({ businessId: biz.id, date: selectedDate, serviceDuration: selectedService.duration })
 *
 * [WIRE] getAvailableSlots() must:
 *   1. Read availability table for the given weekday
 *   2. Subtract existing bookings for that business+date
 *   3. Subtract blocked_slots (owner blocked the time)
 *   4. Return array of { time: "09:00", available: true }
 *
 * [WIRE] On "Confirm booking" click call createBooking() serverFn:
 *   - Insert into bookings table
 *   - Call Twilio sendConfirmation(customer.phone) and sendOwnerAlert(biz.ownerPhone)
 *   - Redirect to /b/[slug]/confirmed?bookingId=xxx
 *
 * [WIRE] Phone number must be stored in E.164 format: +230XXXXXXXX
 *
 * [MISSING] Create src/lib/server/slots.ts with getAvailableSlots()
 * [MISSING] Create src/lib/server/bookings.ts with createBooking()
 * [MISSING] Create src/lib/twilio.ts with sendConfirmation() and sendOwnerAlert()
 */
const BookingPage = ({
  bizName = "Salon Rose",
  category = "Beauty",
  city = "Port Louis",
  services: propServices,
  onConfirm,
}) => {
  const services = propServices ?? [
    { id: 1, name: "Haircut", duration: 45, price: "Rs 350", icon: "✂️" },
    { id: 2, name: "Colour", duration: 90, price: "Rs 800", icon: "🎨" },
    { id: 3, name: "Blowout", duration: 30, price: "Rs 250", icon: "💨" },
    { id: 4, name: "Cut + Blow", duration: 75, price: "Rs 550", icon: "💇" },
  ];

  // [WIRE] Replace with real date calculation based on business availability table
  const today = new Date(2026, 5, 10);
  const dates = Array.from({ length: 10 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i + 1);
    return {
      date: d,
      label: d.toLocaleDateString("en-GB", { weekday: "short" }),
      num: d.getDate(),
      full: fmtDate(d),
    };
  });

  // [WIRE] Replace with real slots from getAvailableSlots() — re-fetch on service or date change
  const allTimes = [
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
  ];
  const takenIdxs = new Set([0, 1, 5]); // stub: replace with real unavailable slots

  const [selSvc, setSelSvc] = useState(null);
  const [selDate, setSelDate] = useState(null);
  const [selTime, setSelTime] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [lang, setLang] = useState("EN");
  const [submitting, setSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  const ready =
    selSvc !== null && selDate !== null && selTime !== null && name.trim() && phone.trim();

  const validatePhone = () => {
    if (!/^\d{7,8}$/.test(phone.replace(/\s/g, ""))) {
      setPhoneError("Enter your Mauritius number (7 or 8 digits)");
      return false;
    }
    setPhoneError("");
    return true;
  };

  const handleConfirm = async () => {
    if (!ready) return;
    if (!validatePhone()) return;
    setSubmitting(true);
    // [WIRE] Replace stub with real createBooking() serverFn call:
    // const result = await createBooking({
    //   businessId: biz.id,
    //   serviceId: selSvc,
    //   date: dates[selDate].date.toISOString().split("T")[0],
    //   time: allTimes[selTime],
    //   customerName: name,
    //   customerPhone: `+230${phone.replace(/\s/g,"")}`,
    //   lang,
    // });
    // if (result.error) { setSubmitting(false); return; }
    // navigate({ to: `/b/${slug}/confirmed`, search: { bookingId: result.id } });
    await new Promise((r) => setTimeout(r, 1000)); // remove stub
    setSubmitting(false);
    onConfirm?.({
      svc: services.find((s) => s.id === selSvc),
      date: dates[selDate],
      time: allTimes[selTime],
      name,
      phone,
    });
  };

  // Progress: 1=service, 2=date, 3=time, 4=details
  const progress =
    (selSvc !== null ? 1 : 0) +
    (selDate !== null ? 1 : 0) +
    (selTime !== null ? 1 : 0) +
    (name && phone ? 1 : 0);

  return (
    <div style={{ maxWidth: 420, margin: "0 auto" }}>
      <Card style={{ overflow: "hidden" }}>
        {/* Browser chrome sim */}
        <div
          style={{
            background: C.ink,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ color: "rgba(255,255,255,.5)", fontSize: 11, fontFamily: "monospace" }}>
            reservly.app/b/{slugify(bizName)}
          </span>
          {/* [WIRE] lang toggle should set cookie/param and re-render all labels in FR or EN */}
          <div style={{ display: "flex", gap: 4 }}>
            {["EN", "FR"].map((l) => (
              <div
                key={l}
                onClick={() => setLang(l)}
                style={{
                  padding: "2px 8px",
                  borderRadius: 5,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: lang === l ? "rgba(255,255,255,.2)" : "transparent",
                  color: lang === l ? C.white : "rgba(255,255,255,.4)",
                  transition: "all .15s",
                }}
              >
                {l}
              </div>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: C.borderLight }}>
          <div
            style={{
              height: 3,
              background: C.primary,
              width: `${progress * 25}%`,
              transition: "width .3s",
            }}
          />
        </div>

        {/* Business header */}
        <div
          style={{
            padding: "16px 16px 14px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            borderBottom: `1px solid ${C.borderLight}`,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: C.primaryLight,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              flexShrink: 0,
            }}
          >
            {/* [WIRE] Replace with real biz.avatarEmoji or biz.logoUrl from DB */}
            💇
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: C.ink,
                letterSpacing: "-.01em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {bizName}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginTop: 4,
                flexWrap: "wrap",
              }}
            >
              <Tag>{category}</Tag>
              <span style={{ fontSize: 12, color: C.muted }}>· {city}</span>
            </div>
          </div>
        </div>

        <div style={{ padding: "0 16px 24px", maxHeight: 560, overflowY: "auto" }}>
          {/* ── 1. Services ── */}
          <div style={{ paddingTop: 18 }}>
            <SectionLabel>1 — Pick a service</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {services.map((s) => (
                <div
                  key={s.id}
                  onClick={() => {
                    setSelSvc(s.id);
                    setSelTime(null);
                  }}
                  style={{
                    border: `1.5px solid ${selSvc === s.id ? C.primary : C.border}`,
                    borderRadius: 12,
                    padding: "12px 10px",
                    cursor: "pointer",
                    background: selSvc === s.id ? C.primaryLight : C.white,
                    transition: "all .15s",
                    boxShadow: selSvc === s.id ? `0 0 0 3px ${C.primary}18` : "none",
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                    {s.duration} min · {s.price}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 2. Dates ── */}
          <div style={{ paddingTop: 18 }}>
            <SectionLabel>2 — Pick a date</SectionLabel>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
              {dates.map((d, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setSelDate(i);
                    setSelTime(null);
                  }}
                  style={{
                    minWidth: 52,
                    textAlign: "center",
                    padding: "9px 6px",
                    borderRadius: 11,
                    cursor: "pointer",
                    border: `1.5px solid ${selDate === i ? C.primary : C.border}`,
                    background: selDate === i ? C.primary : C.white,
                    flexShrink: 0,
                    transition: "all .15s",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: selDate === i ? "rgba(255,255,255,.7)" : C.muted,
                    }}
                  >
                    {d.label}
                  </div>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 600,
                      color: selDate === i ? C.white : C.ink,
                      marginTop: 2,
                    }}
                  >
                    {d.num}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 3. Times ── */}
          <div style={{ paddingTop: 18 }}>
            <SectionLabel>
              3 — Pick a time
              {/* [WIRE] Show loading spinner here while getAvailableSlots() is fetching */}
            </SectionLabel>
            {selDate === null ? (
              <div style={{ fontSize: 13, color: C.muted, fontStyle: "italic" }}>
                Pick a date first to see available slots.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {allTimes.map((t, i) => {
                  const taken = takenIdxs.has(i);
                  const active = selTime === i;
                  return (
                    <div
                      key={i}
                      onClick={() => !taken && setSelTime(i)}
                      style={{
                        padding: "9px 6px",
                        textAlign: "center",
                        borderRadius: 10,
                        border: `1.5px solid ${active ? C.primary : taken ? C.borderLight : C.border}`,
                        background: active ? C.primary : taken ? C.surface : C.white,
                        color: active ? C.white : taken ? C.muted : C.ink,
                        fontSize: 13,
                        fontWeight: active ? 600 : 400,
                        cursor: taken ? "not-allowed" : "pointer",
                        opacity: taken ? 0.45 : 1,
                        transition: "all .15s",
                        textDecoration: taken ? "line-through" : "none",
                      }}
                    >
                      {t}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── 4. Details ── */}
          <div style={{ paddingTop: 18 }}>
            <SectionLabel>4 — Your details</SectionLabel>
            <Input
              label="Your name"
              required
              placeholder="Marie Dupont"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="WhatsApp number"
              required
              prefix="+230"
              placeholder="5700 0000"
              value={phone}
              error={phoneError}
              onChange={(e) => {
                setPhone(e.target.value);
                setPhoneError("");
              }}
              note="Your confirmation will be sent to this number."
            />
          </div>

          {/* ── CTA ── */}
          <div style={{ paddingTop: 8 }}>
            {/* Booking summary preview */}
            {selSvc !== null && selDate !== null && selTime !== null && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: C.primaryLight,
                  border: `1px solid ${C.primaryMid}`,
                  marginBottom: 10,
                  fontSize: 12,
                  color: C.primary,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>📋</span>
                <span>
                  {services.find((s) => s.id === selSvc)?.name} · {dates[selDate]?.full} at{" "}
                  {allTimes[selTime]}
                </span>
              </div>
            )}
            <Btn
              variant={ready ? "accent" : "ghost"}
              full
              size="lg"
              onClick={handleConfirm}
              disabled={!ready || submitting}
            >
              {submitting
                ? "Confirming…"
                : ready
                  ? "Confirm booking →"
                  : "Complete all steps above"}
            </Btn>
            <div
              style={{
                textAlign: "center",
                marginTop: 8,
                fontSize: 11,
                color: C.muted,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
              }}
            >
              <span style={{ color: C.wa, fontSize: 13 }}>●</span>
              Confirmation via WhatsApp · no account needed
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ─── SCREEN: CONFIRMATION ─────────────────────────────────────────────────────
/**
 * [WIRE] This screen lives at /b/[slug]/confirmed?bookingId=xxx
 * [WIRE] Load booking by ID from Supabase on route mount:
 *   const booking = await getBookingById(search.bookingId)
 *   // Pass booking data as props to this component
 * [WIRE] "Add to calendar" should generate an ICS file download
 * [MISSING] Create src/lib/calendar.ts with generateICS() helper
 */
const Confirmation = ({ booking, onNewBooking }) => {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    setTimeout(() => setAnimate(true), 80);
  }, []);

  const details = [
    ["Service", `${booking?.svc?.name ?? "Haircut"} · ${booking?.svc?.duration ?? 45} min`],
    ["Date", booking?.date?.full ?? "Wed 11 Jun"],
    ["Time", booking?.time ?? "10:30"],
    ["Business", booking?.biz ?? "Salon Rose"],
    ["Price", booking?.svc?.price ?? "Rs 350"],
  ];

  return (
    <div style={{ maxWidth: 420, margin: "0 auto" }}>
      <Card style={{ overflow: "hidden" }}>
        <div style={{ background: C.success, padding: "14px 18px" }}>
          <span style={{ color: C.white, fontSize: 14, fontWeight: 700 }}>Reservly</span>
        </div>
        <div style={{ padding: "36px 24px 28px", textAlign: "center" }}>
          {/* Animated checkmark */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: animate ? C.successLight : "transparent",
              border: `2.5px solid ${animate ? C.success : C.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              fontSize: 36,
              transition: "all .5s cubic-bezier(.34,1.56,.64,1)",
              transform: animate ? "scale(1)" : "scale(.5)",
            }}
          >
            ✓
          </div>

          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: C.ink,
              letterSpacing: "-.02em",
              marginBottom: 6,
            }}
          >
            You're booked!
          </h2>
          <p style={{ fontSize: 13, color: C.mid, marginBottom: 24 }}>
            See you at {booking?.biz ?? "Salon Rose"}
          </p>

          {/* Booking card */}
          <Card style={{ padding: "16px 18px", textAlign: "left", marginBottom: 16 }}>
            {details.map(([l, v], i) => (
              <div
                key={l}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: i < details.length - 1 ? `1px solid ${C.borderLight}` : "none",
                }}
              >
                <span style={{ fontSize: 13, color: C.muted }}>{l}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{v}</span>
              </div>
            ))}
          </Card>

          {/* WhatsApp confirmation badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontSize: 13,
              color: C.success,
              marginBottom: 20,
              background: C.waLight,
              padding: "10px 16px",
              borderRadius: 10,
              border: `1px solid ${C.wa}28`,
            }}
          >
            <span style={{ fontSize: 16 }}>💬</span>
            <span>Confirmation sent to +230 {booking?.phone ?? "5700 0000"}</span>
          </div>

          {/* Reminder note */}
          <div
            style={{
              fontSize: 12,
              color: C.muted,
              marginBottom: 20,
              background: C.surface,
              borderRadius: 8,
              padding: "10px 14px",
              textAlign: "left",
            }}
          >
            📅 You'll get a reminder 24 hours before your appointment. Reply{" "}
            <strong>CONFIRM</strong> or <strong>CANCEL</strong> to manage it.
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {/* [WIRE] Download ICS file — call generateICS(booking) */}
            <Btn variant="ghost" full>
              Add to calendar
            </Btn>
            <Btn variant="outline" full onClick={onNewBooking}>
              New booking
            </Btn>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ─── SCREEN: DASHBOARD ────────────────────────────────────────────────────────
/**
 * Owner dashboard at /dashboard (auth-protected)
 *
 * [WIRE] Wrap all /dashboard routes with auth check:
 *   const session = await getSupabaseSession()
 *   if (!session) throw redirect({ to: "/onboarding" })
 *
 * [WIRE] Dashboard home loader:
 *   const [bookings, stats, business] = await Promise.all([
 *     getTodaysBookings(businessId),
 *     getWeekStats(businessId),
 *     getBusinessById(businessId),
 *   ])
 *
 * [WIRE] Bookings tab loader:
 *   const upcoming = await getUpcomingBookings(businessId, { days: 14 })
 *
 * [WIRE] Settings saves:
 *   - Business info: updateBusiness(businessId, patch)
 *   - Services: upsertServices(businessId, services)
 *   - Hours: upsertAvailability(businessId, hours)
 *   - WhatsApp number: validate E.164, save to businesses.whatsapp_number
 *     then re-register Twilio sender if number changed
 *
 * [WIRE] "Cancel" button on booking row:
 *   await cancelBooking(bookingId) → PATCH status + sendCancellationMessage()
 *
 * [WIRE] "Upgrade to Pro" button:
 *   await createStripeCheckoutSession({ priceId: "price_pro_monthly", ... })
 *   → redirect to Stripe hosted checkout
 *
 * [MISSING] Create src/lib/server/dashboard.ts with getTodaysBookings(), getWeekStats(), etc.
 * [MISSING] Create src/lib/stripe.ts with createStripeCheckoutSession() and handleStripeWebhook()
 */
const Dashboard = ({ bizName = "Salon Rose", bizData }) => {
  const [tab, setTab] = useState("home");
  const [toast, setToast] = useState({ visible: false, msg: "", type: "success" });
  const [cancelConfirm, setCancelConfirm] = useState(null); // bookingId awaiting confirm

  // [WIRE] Replace with real data from loader
  const todayBookings = [
    {
      id: "b1",
      time: "09:00",
      name: "Marie D.",
      service: "Haircut",
      status: "confirmed",
      price: "Rs 350",
    },
    {
      id: "b2",
      time: "10:30",
      name: "Jean-Paul",
      service: "Colour",
      status: "confirmed",
      price: "Rs 800",
    },
    {
      id: "b3",
      time: "13:00",
      name: "Sophie R.",
      service: "Cut + Blow",
      status: "pending",
      price: "Rs 550",
    },
    { id: "b4", time: "15:00", name: null, service: null, status: "open", price: null },
    { id: "b5", time: "16:30", name: null, service: null, status: "open", price: null },
  ];

  const upcomingBookings = [
    {
      id: "u1",
      date: "Wed 10 Jun",
      time: "09:00",
      name: "Marie D.",
      service: "Haircut",
      status: "confirmed",
    },
    {
      id: "u2",
      date: "Wed 10 Jun",
      time: "10:30",
      name: "Jean-Paul",
      service: "Colour",
      status: "confirmed",
    },
    {
      id: "u3",
      date: "Wed 10 Jun",
      time: "13:00",
      name: "Sophie R.",
      service: "Cut + Blow",
      status: "pending",
    },
    {
      id: "u4",
      date: "Thu 11 Jun",
      time: "09:30",
      name: "Priya N.",
      service: "Blowout",
      status: "confirmed",
    },
    {
      id: "u5",
      date: "Thu 11 Jun",
      time: "14:00",
      name: "Claire M.",
      service: "Haircut",
      status: "confirmed",
    },
    {
      id: "u6",
      date: "Fri 12 Jun",
      time: "10:00",
      name: "Anisha R.",
      service: "Colour",
      status: "pending",
    },
  ];

  // [WIRE] Replace with real stats from getWeekStats()
  const stats = [
    { val: "4", label: "Today", color: C.primary, bg: C.primaryLight },
    { val: "19", label: "This week", color: C.ink, bg: C.surface },
    { val: "Rs 6,800", label: "Week revenue", color: C.success, bg: C.successLight },
    { val: "1", label: "No-shows", color: C.warning, bg: C.warningLight },
  ];

  // [WIRE] Plan data from businesses.plan in DB — one of: "free" | "pro" | "studio"
  const plan = { name: "Free", bookingsUsed: 18, bookingsLimit: 30 };
  const planPct = Math.round((plan.bookingsUsed / plan.bookingsLimit) * 100);

  const showToast = (msg, type = "success") => {
    setToast({ visible: true, msg, type });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2400);
  };

  const handleCopyLink = () => {
    // [WIRE] biz.slug from DB
    const slug = slugify(bizName);
    navigator.clipboard?.writeText(`https://reservly.app/b/${slug}`).catch(() => {});
    showToast("✓ Link copied");
  };

  const handleCancel = async (id) => {
    // [WIRE] Replace with real cancelBooking(id) call
    // await cancelBooking(id);
    setCancelConfirm(null);
    showToast("Booking cancelled");
  };

  const navItems = [
    { id: "home", icon: "🏠", label: "Home" },
    { id: "bookings", icon: "📋", label: "Bookings" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <Card style={{ overflow: "hidden", minHeight: 500 }}>
        {/* Top nav */}
        <div
          style={{
            background: C.ink,
            padding: "13px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: C.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: C.white, fontSize: 12, fontWeight: 800 }}>R</span>
            </div>
            <span
              style={{ color: C.white, fontSize: 15, fontWeight: 700, letterSpacing: "-.01em" }}
            >
              Reservly
            </span>
          </div>
          <div style={{ display: "flex", gap: 2 }}>
            {navItems.map((n) => (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: tab === n.id ? "rgba(255,255,255,.12)" : "transparent",
                  color: tab === n.id ? C.white : "rgba(255,255,255,.45)",
                  fontSize: 12,
                  fontWeight: tab === n.id ? 500 : 400,
                  cursor: "pointer",
                  transition: "all .15s",
                }}
              >
                <span>{n.icon}</span>
                <span>{n.label}</span>
              </button>
            ))}
          </div>
          {/* [WIRE] Replace "M" avatar with first letter of authenticated user's name */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: C.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              color: C.white,
              fontWeight: 700,
              cursor: "pointer",
            }}
            title="Account"
          >
            M
          </div>
        </div>

        <div style={{ padding: 20 }}>
          {/* ── HOME TAB ── */}
          {tab === "home" && (
            <>
              <div style={{ marginBottom: 20 }}>
                {/* [WIRE] Greeting: use authenticated user's first name */}
                <div
                  style={{ fontSize: 19, fontWeight: 700, color: C.ink, letterSpacing: "-.02em" }}
                >
                  Good morning, Marie 👋
                </div>
                <div style={{ fontSize: 13, color: C.mid, marginTop: 2 }}>
                  Wednesday 10 June · {bizName}
                </div>
              </div>

              {/* Booking link banner */}
              <div
                style={{
                  background: C.primaryLight,
                  border: `1px solid ${C.primaryMid}`,
                  borderRadius: 12,
                  padding: "12px 16px",
                  marginBottom: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: C.primary,
                      textTransform: "uppercase",
                      letterSpacing: ".06em",
                      marginBottom: 3,
                    }}
                  >
                    Your booking link
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: C.ink,
                      fontWeight: 500,
                      fontFamily: "monospace",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {/* [WIRE] Real slug from biz.slug */}
                    reservly.app/b/{slugify(bizName)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <Btn variant="ghost" size="sm" onClick={handleCopyLink}>
                    Copy
                  </Btn>
                  {/* [WIRE] Share via native Web Share API → navigator.share({ url }) */}
                  <Btn variant="primary" size="sm">
                    Share
                  </Btn>
                </div>
              </div>

              {/* Free plan usage warning */}
              {plan.name === "Free" && planPct >= 60 && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: planPct >= 90 ? C.dangerLight : C.warningLight,
                    border: `1px solid ${planPct >= 90 ? C.danger + "40" : C.warning + "40"}`,
                    marginBottom: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div style={{ fontSize: 12, color: planPct >= 90 ? C.danger : C.warning }}>
                    {plan.bookingsUsed}/{plan.bookingsLimit} free bookings used this month
                    {planPct >= 90 && " — almost at your limit!"}
                  </div>
                  {/* [WIRE] Upgrade CTA → createStripeCheckoutSession({ plan: "pro" }) */}
                  <Btn variant={planPct >= 90 ? "danger" : "ghost"} size="sm">
                    Upgrade
                  </Btn>
                </div>
              )}

              {/* Stats */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                {stats.map((s) => (
                  <div
                    key={s.label}
                    style={{
                      background: s.bg,
                      borderRadius: 12,
                      padding: "14px 10px",
                      textAlign: "center",
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: s.val.length > 5 ? 14 : 20,
                        fontWeight: 700,
                        color: s.color,
                        lineHeight: 1,
                      }}
                    >
                      {s.val}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: C.mid,
                        marginTop: 5,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: ".04em",
                      }}
                    >
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Today timeline */}
              <SectionLabel>Today — Wednesday 10 June</SectionLabel>
              <Card style={{ overflow: "hidden", marginBottom: 14 }}>
                {todayBookings.length === 0 ? (
                  <EmptyState
                    icon="📅"
                    title="No bookings today"
                    sub="Share your booking link to get your first booking."
                  />
                ) : (
                  todayBookings.map((b, i) => (
                    <div
                      key={b.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 16px",
                        borderBottom:
                          i < todayBookings.length - 1 ? `1px solid ${C.borderLight}` : "none",
                        background: b.status === "pending" ? C.warningLight + "50" : "transparent",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: C.muted,
                          minWidth: 44,
                          flexShrink: 0,
                        }}
                      >
                        {b.time}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: b.name ? 600 : 400,
                            color: b.name ? C.ink : C.muted,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {b.name ?? "— available slot —"}
                        </div>
                        {b.service && (
                          <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>
                            {b.service}
                          </div>
                        )}
                      </div>
                      {b.price && (
                        <span
                          style={{ fontSize: 12, fontWeight: 500, color: C.body, flexShrink: 0 }}
                        >
                          {b.price}
                        </span>
                      )}
                      <StatusPill status={b.status} />
                      {b.name && (
                        <button
                          onClick={() => setCancelConfirm(b.id)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: C.muted,
                            fontSize: 16,
                            padding: 4,
                            lineHeight: 1,
                          }}
                          title="Cancel booking"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))
                )}
              </Card>

              {/* [WIRE] Opens modal or navigates to /dashboard/new-booking */}
              <Btn variant="outline">+ Add manual booking</Btn>
            </>
          )}

          {/* ── BOOKINGS TAB ── */}
          {tab === "bookings" && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 16,
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 2 }}>
                    Upcoming bookings
                  </div>
                  <div style={{ fontSize: 13, color: C.mid }}>Next 14 days</div>
                </div>
                {/* [WIRE] Filter dropdown — filter upcomingBookings by status */}
                <select
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: `1px solid ${C.border}`,
                    fontSize: 12,
                    color: C.body,
                    background: C.white,
                    fontFamily: "inherit",
                  }}
                >
                  <option>All bookings</option>
                  <option>Confirmed only</option>
                  <option>Pending only</option>
                </select>
              </div>

              {upcomingBookings.length === 0 ? (
                <EmptyState
                  icon="📋"
                  title="No upcoming bookings"
                  sub="Share your link to start taking bookings."
                  action={
                    <Btn variant="primary" onClick={() => setTab("home")}>
                      Go to home
                    </Btn>
                  }
                />
              ) : (
                <Card style={{ overflow: "hidden" }}>
                  {upcomingBookings.map((b, i) => (
                    <div
                      key={b.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 16px",
                        borderBottom:
                          i < upcomingBookings.length - 1 ? `1px solid ${C.borderLight}` : "none",
                      }}
                    >
                      <div style={{ minWidth: 80 }}>
                        <div style={{ fontSize: 11, color: C.muted }}>{b.date}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{b.time}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: C.ink,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {b.name}
                        </div>
                        <div style={{ fontSize: 12, color: C.muted }}>{b.service}</div>
                      </div>
                      <StatusPill status={b.status} />
                      <Btn variant="ghost" size="sm" onClick={() => setCancelConfirm(b.id)}>
                        Cancel
                      </Btn>
                    </div>
                  ))}
                </Card>
              )}
            </>
          )}

          {/* ── SETTINGS TAB ── */}
          {tab === "settings" && (
            <>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 2 }}>
                  Settings
                </div>
                <div style={{ fontSize: 13, color: C.mid }}>
                  Manage your business profile and plan
                </div>
              </div>

              {/* Plan card */}
              <div
                style={{
                  background: C.primaryLight,
                  border: `1px solid ${C.primaryMid}`,
                  borderRadius: 12,
                  padding: "14px 16px",
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: C.primary,
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                        marginBottom: 3,
                      }}
                    >
                      Current plan
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>
                      {plan.name}
                      <span style={{ color: C.muted, fontWeight: 400, fontSize: 13 }}>
                        {" "}
                        · {plan.bookingsUsed}/{plan.bookingsLimit} bookings used
                      </span>
                    </div>
                  </div>
                  {/* [WIRE] → createStripeCheckoutSession({ plan: "pro" }) */}
                  <Btn variant="primary" size="sm">
                    Upgrade to Pro — $5/mo
                  </Btn>
                </div>
                {/* Plan usage bar */}
                <div
                  style={{
                    marginTop: 12,
                    height: 4,
                    background: "rgba(255,255,255,.4)",
                    borderRadius: 999,
                  }}
                >
                  <div
                    style={{
                      height: 4,
                      borderRadius: 999,
                      background: planPct >= 90 ? C.danger : C.primary,
                      width: `${planPct}%`,
                      transition: "width .5s",
                    }}
                  />
                </div>
              </div>

              {/* Business info */}
              <SectionLabel>Business info</SectionLabel>
              <Card style={{ overflow: "hidden", marginBottom: 16 }}>
                {[
                  { label: "Business name", val: bizName, key: "name" },
                  { label: "Category", val: "Beauty", key: "category" },
                  { label: "City", val: "Port Louis", key: "city" },
                  { label: "WhatsApp number", val: "+230 5700 1234", key: "phone" },
                  { label: "Booking link", val: `reservly.app/b/${slugify(bizName)}`, key: "slug" },
                  { label: "Language", val: "EN + FR", key: "lang" },
                ].map((r, i, arr) => (
                  <div
                    key={r.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      borderBottom: i < arr.length - 1 ? `1px solid ${C.borderLight}` : "none",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: 11,
                          color: C.muted,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: ".04em",
                          marginBottom: 2,
                        }}
                      >
                        {r.label}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: C.ink,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {r.val}
                      </div>
                    </div>
                    {/* [WIRE] Each "Edit" opens an inline edit field or a Sheet/Dialog with updateBusiness() on save */}
                    <Btn variant="ghost" size="sm" style={{ flexShrink: 0, marginLeft: 12 }}>
                      Edit
                    </Btn>
                  </div>
                ))}
              </Card>

              {/* Services */}
              <SectionLabel>Services</SectionLabel>
              <Card style={{ overflow: "hidden", marginBottom: 16 }}>
                {/* [WIRE] Load services from Supabase services table for this business */}
                {[
                  { name: "Haircut", duration: "45 min", price: "Rs 350" },
                  { name: "Colour", duration: "90 min", price: "Rs 800" },
                  { name: "Blowout", duration: "30 min", price: "Rs 250" },
                ].map((s, i, arr) => (
                  <div
                    key={s.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "11px 16px",
                      borderBottom: i < arr.length - 1 ? `1px solid ${C.borderLight}` : "none",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>
                        {s.duration} · {s.price}
                      </div>
                    </div>
                    {/* [WIRE] Opens edit sheet; on save calls upsertService(businessId, service) */}
                    <Btn variant="ghost" size="sm">
                      Edit
                    </Btn>
                  </div>
                ))}
                {/* [WIRE] Pro gate: disabled with tooltip if on Free and services.length >= 1 */}
                <div style={{ padding: "10px 16px" }}>
                  <Btn variant="outline" full size="sm">
                    + Add service
                  </Btn>
                </div>
              </Card>

              {/* Danger zone */}
              <div
                style={{
                  borderTop: `1px solid ${C.borderLight}`,
                  paddingTop: 16,
                  display: "flex",
                  gap: 8,
                }}
              >
                {/* [WIRE] → supabase.auth.signOut() then redirect to "/" */}
                <Btn variant="ghost">Sign out</Btn>
                {/* [WIRE] Confirmation dialog → deleteAccount(businessId) → cascade delete all data */}
                <Btn variant="danger">Delete account</Btn>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Cancel confirmation dialog */}
      {cancelConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setCancelConfirm(null)}
        >
          <Card
            style={{ padding: 24, maxWidth: 320, margin: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 8 }}>
              Cancel this booking?
            </div>
            <div style={{ fontSize: 13, color: C.mid, marginBottom: 20 }}>
              The customer will receive a WhatsApp cancellation message.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="ghost" full onClick={() => setCancelConfirm(null)}>
                Keep it
              </Btn>
              <Btn variant="danger" full onClick={() => handleCancel(cancelConfirm)}>
                Cancel booking
              </Btn>
            </div>
          </Card>
        </div>
      )}

      <Toast msg={toast.msg} visible={toast.visible} type={toast.type} />

      {/* Skeleton shimmer keyframes */}
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  );
};

// ─── APP SHELL ────────────────────────────────────────────────────────────────
/**
 * Demo wrapper — simulates TanStack Router navigation.
 * In the real app each screen is its own route file.
 *
 * Route map:
 *   /               → <Landing />         src/routes/index.tsx
 *   /onboarding     → <Onboarding />      src/routes/onboarding.tsx
 *   /b/$slug        → <BookingPage />     src/routes/b.$slug.tsx
 *   /b/$slug/confirmed → <Confirmation /> src/routes/b.$slug.confirmed.tsx
 *   /dashboard      → <Dashboard />       src/routes/dashboard.index.tsx
 *   /dashboard/bookings  → (tab)          src/routes/dashboard.bookings.tsx
 *   /dashboard/settings  → (tab)          src/routes/dashboard.settings.tsx
 */
export default function App() {
  const [screen, setScreen] = useState("landing");
  const [booking, setBooking] = useState(null);
  const [bizData, setBizData] = useState(null);

  const screens = [
    { id: "landing", label: "① Landing" },
    { id: "onboarding", label: "② Onboarding" },
    { id: "booking", label: "③ Booking page" },
    { id: "confirmation", label: "④ Confirmation" },
    { id: "dashboard", label: "⑤ Dashboard" },
  ];

  // Derived services for booking page from onboarding data
  const bookingServices = bizData?.services
    ?.filter((s) => s.name)
    .map((s, i) => ({
      id: i + 1,
      name: s.name,
      duration: parseInt(s.duration) || 45,
      price: s.price || "Rs 350",
      icon: ["✂️", "🎨", "💨", "💇", "🌿"][i] ?? "⭐",
    }));

  return (
    <div
      style={{
        fontFamily: "'Inter', -apple-system, sans-serif",
        background: C.surface,
        minHeight: "100vh",
        paddingBottom: 60,
      }}
    >
      {/* Screen picker nav (demo only — not part of the real app) */}
      <div
        style={{ background: C.ink, padding: "10px 16px", position: "sticky", top: 0, zIndex: 100 }}
      >
        <div
          style={{
            maxWidth: 760,
            margin: "0 auto",
            display: "flex",
            gap: 4,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {screens.map((s) => (
            <button
              key={s.id}
              onClick={() => setScreen(s.id)}
              style={{
                padding: "5px 12px",
                borderRadius: 999,
                border: "none",
                background: screen === s.id ? C.primary : "rgba(255,255,255,.08)",
                color: screen === s.id ? C.white : "rgba(255,255,255,.55)",
                fontSize: 12,
                fontWeight: screen === s.id ? 600 : 400,
                cursor: "pointer",
                transition: "all .15s",
              }}
            >
              {s.label}
            </button>
          ))}
          <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,.3)" }}>
            demo navigator
          </span>
        </div>
      </div>

      {/* Screens */}
      <div style={{ padding: "24px 16px" }}>
        {screen === "landing" && <Landing onGetStarted={() => setScreen("onboarding")} />}

        {screen === "onboarding" && (
          <Onboarding
            onDone={(data) => {
              setBizData(data);
              setScreen("booking");
            }}
          />
        )}

        {screen === "booking" && (
          <BookingPage
            bizName={bizData?.biz?.name || "Salon Rose"}
            category={bizData?.biz?.category || "Beauty"}
            city={bizData?.biz?.city || "Port Louis"}
            services={bookingServices?.length ? bookingServices : undefined}
            onConfirm={(b) => {
              setBooking(b);
              setScreen("confirmation");
            }}
          />
        )}

        {screen === "confirmation" && (
          <Confirmation
            booking={{ ...booking, biz: bizData?.biz?.name || "Salon Rose" }}
            onNewBooking={() => setScreen("booking")}
          />
        )}

        {screen === "dashboard" && (
          <Dashboard bizName={bizData?.biz?.name || "Salon Rose"} bizData={bizData} />
        )}
      </div>
    </div>
  );
}
